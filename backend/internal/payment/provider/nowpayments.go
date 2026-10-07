package provider

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/payment"
)

// NOWPayments creates hosted USDT invoices. Invoice IDs and payment IDs are
// different upstream resources: an invoice is settled by a signed IPN, while
// a known payment ID can also be reconciled through GET /payment/:id.
type NOWPayments struct {
	instanceID string
	config     map[string]string
	httpClient *http.Client
}

func NewNOWPayments(instanceID string, config map[string]string) (*NOWPayments, error) {
	for _, key := range []string{"apiKey", "ipnSecret", "notifyUrl"} {
		if strings.TrimSpace(config[key]) == "" {
			return nil, fmt.Errorf("NOWPayments config missing required key: %s", key)
		}
	}
	cfg := cloneStringMap(config)
	for _, key := range []string{"apiKey", "ipnSecret", "notifyUrl"} {
		cfg[key] = strings.TrimSpace(cfg[key])
	}
	cfg["payCurrency"] = strings.ToLower(strings.TrimSpace(cfg["payCurrency"]))
	if cfg["payCurrency"] == "" {
		cfg["payCurrency"] = "usdttrc20"
	}
	switch cfg["payCurrency"] {
	case "usdttrc20", "usdterc20", "usdtbsc", "usdtsol":
	default:
		return nil, fmt.Errorf("NOWPayments payCurrency must be a supported USDT network")
	}
	u, err := url.Parse(cfg["notifyUrl"])
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
		return nil, fmt.Errorf("NOWPayments notifyUrl must be a public HTTPS URL")
	}
	cfg["apiBase"] = "https://api.nowpayments.io/v1"
	return &NOWPayments{instanceID: instanceID, config: cfg, httpClient: &http.Client{
		Timeout:       15 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}}, nil
}

func (p *NOWPayments) ProviderKey() string { return payment.TypeNOWPayments }
func (p *NOWPayments) Name() string        { return "NOWPayments" }
func (p *NOWPayments) InstanceID() string  { return p.instanceID }
func (p *NOWPayments) SupportedTypes() []payment.PaymentType {
	return []payment.PaymentType{payment.TypeUSDT}
}

func (p *NOWPayments) CreatePayment(ctx context.Context, req payment.CreatePaymentRequest) (*payment.CreatePaymentResponse, error) {
	amount, err := strconv.ParseFloat(req.Amount, 64)
	if err != nil || amount <= 0 {
		return nil, fmt.Errorf("invalid invoice amount")
	}
	body := map[string]any{
		"price_amount": amount, "price_currency": "usd", "pay_currency": p.config["payCurrency"],
		"order_id": req.OrderID, "order_description": req.Subject,
		"ipn_callback_url": p.config["notifyUrl"], "success_url": req.ReturnURL,
		"cancel_url": req.ReturnURL, "is_fixed_rate": true,
	}
	var invoice struct {
		ID         json.Number `json:"id"`
		InvoiceURL string      `json:"invoice_url"`
	}
	if err := p.request(ctx, http.MethodPost, "/invoice", body, &invoice); err != nil {
		return nil, err
	}
	u, err := url.Parse(invoice.InvoiceURL)
	if err != nil || u.Scheme != "https" || u.Hostname() != "nowpayments.io" || u.User != nil || invoice.ID == "" {
		return nil, fmt.Errorf("NOWPayments returned an invalid hosted invoice")
	}
	return &payment.CreatePaymentResponse{
		TradeNo: "invoice:" + invoice.ID.String(), PayURL: invoice.InvoiceURL,
		Currency: "USD", ResultType: payment.CreatePaymentResultOrderCreated,
	}, nil
}

type nowPaymentsPayment struct {
	PaymentID     json.Number `json:"payment_id"`
	InvoiceID     json.Number `json:"invoice_id"`
	OrderID       string      `json:"order_id"`
	Status        string      `json:"payment_status"`
	PriceAmount   float64     `json:"price_amount"`
	PriceCurrency string      `json:"price_currency"`
	PayCurrency   string      `json:"pay_currency"`
	PayAmount     float64     `json:"pay_amount"`
	ActuallyPaid  float64     `json:"actually_paid"`
}

func (p *NOWPayments) QueryOrder(ctx context.Context, tradeNo string) (*payment.QueryOrderResponse, error) {
	// Hosted invoices have no API-key-only status lookup. Until the signed IPN
	// supplies a payment ID, local polling must keep the order pending.
	if strings.HasPrefix(tradeNo, "invoice:") {
		return &payment.QueryOrderResponse{TradeNo: tradeNo, Status: payment.ProviderStatusPending}, nil
	}
	if _, err := strconv.ParseUint(tradeNo, 10, 64); err != nil {
		return nil, fmt.Errorf("invalid NOWPayments payment ID")
	}
	var result nowPaymentsPayment
	if err := p.request(ctx, http.MethodGet, "/payment/"+tradeNo, nil, &result); err != nil {
		return nil, err
	}
	n, err := p.notification(result)
	if err != nil {
		return nil, err
	}
	if n == nil {
		return &payment.QueryOrderResponse{TradeNo: tradeNo, Status: payment.ProviderStatusPending}, nil
	}
	return &payment.QueryOrderResponse{TradeNo: n.TradeNo, Status: payment.ProviderStatusPaid, Amount: n.Amount, Metadata: n.Metadata}, nil
}

func (p *NOWPayments) VerifyNotification(ctx context.Context, rawBody string, headers map[string]string) (*payment.PaymentNotification, error) {
	signature, err := hex.DecodeString(headers["x-nowpayments-sig"])
	if err != nil || len(signature) != sha512.Size {
		return nil, fmt.Errorf("invalid NOWPayments signature")
	}
	var payload map[string]any
	decoder := json.NewDecoder(strings.NewReader(rawBody))
	if err := decoder.Decode(&payload); err != nil || payload == nil {
		return nil, fmt.Errorf("invalid NOWPayments payload")
	}
	// Go marshals map keys recursively in sorted order. Disable HTML escaping
	// to match JSON.stringify used by the upstream IPN signing contract.
	var canonical bytes.Buffer
	encoder := json.NewEncoder(&canonical)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(payload); err != nil {
		return nil, err
	}
	mac := hmac.New(sha512.New, []byte(p.config["ipnSecret"]))
	mac.Write(nowPaymentsJSONStringify(bytes.TrimSuffix(canonical.Bytes(), []byte("\n"))))
	if !hmac.Equal(signature, mac.Sum(nil)) {
		return nil, fmt.Errorf("NOWPayments signature mismatch")
	}
	var result nowPaymentsPayment
	if err := json.Unmarshal([]byte(rawBody), &result); err != nil {
		return nil, err
	}
	return p.notification(result)
}

// JSON.stringify leaves Unicode line separators literal, while Go escapes
// them. Preserve escaped backslashes so literal "\\u2028" text is unchanged.
func nowPaymentsJSONStringify(encoded []byte) []byte {
	var result []byte
	for i := 0; i < len(encoded); {
		if encoded[i] == '\\' && i+1 < len(encoded) {
			if bytes.HasPrefix(encoded[i:], []byte("\\u2028")) || bytes.HasPrefix(encoded[i:], []byte("\\u2029")) {
				separator := '\u2028'
				if encoded[i+5] == '9' {
					separator = '\u2029'
				}
				result = append(result, string(separator)...)
				i += 6
				continue
			}
			result = append(result, encoded[i], encoded[i+1])
			i += 2
			continue
		}
		result = append(result, encoded[i])
		i++
	}
	return result
}

func (p *NOWPayments) notification(result nowPaymentsPayment) (*payment.PaymentNotification, error) {
	if result.Status != "finished" {
		return nil, nil
	}
	if result.OrderID == "" || result.PaymentID == "" || result.PriceAmount <= 0 ||
		!strings.EqualFold(result.PriceCurrency, "usd") || result.PayCurrency != p.config["payCurrency"] {
		return nil, fmt.Errorf("NOWPayments payment identity or currency mismatch")
	}
	// price_amount alone describes the requested price, not what arrived.
	// Even a finished callback must prove the full crypto amount was paid.
	if result.PayAmount <= 0 || result.ActuallyPaid < result.PayAmount {
		return nil, fmt.Errorf("NOWPayments payment was not paid in full")
	}
	return &payment.PaymentNotification{
		TradeNo: result.PaymentID.String(), OrderID: result.OrderID,
		Amount: result.PriceAmount, Status: payment.NotificationStatusSuccess,
		Metadata: map[string]string{"currency": "USD", "invoice_id": result.InvoiceID.String()},
	}, nil
}

func (p *NOWPayments) Refund(context.Context, payment.RefundRequest) (*payment.RefundResponse, error) {
	return nil, fmt.Errorf("USDT refunds must be processed manually in NOWPayments")
}

func (p *NOWPayments) request(ctx context.Context, method, path string, body any, result any) error {
	var reader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, p.config["apiBase"]+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", p.config["apiKey"])
	req.Header.Set("Content-Type", "application/json")
	res, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("NOWPayments request failed: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("NOWPayments returned HTTP %d", res.StatusCode)
	}
	return json.NewDecoder(io.LimitReader(res.Body, 1<<20)).Decode(result)
}

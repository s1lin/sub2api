package provider

import (
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/stretchr/testify/require"
)

func newTestNOWPayments(t *testing.T) *NOWPayments {
	t.Helper()
	p, err := NewNOWPayments("test", map[string]string{
		"apiKey": "test-api-key", "ipnSecret": "test-ipn-secret", "notifyUrl": "https://example.com/api/v1/payment/webhook/nowpayments",
	})
	require.NoError(t, err)
	return p
}

func TestNOWPaymentsHostedInvoice(t *testing.T) {
	p := newTestNOWPayments(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/invoice", r.URL.Path)
		require.Equal(t, "test-api-key", r.Header.Get("x-api-key"))
		var body map[string]any
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		require.Equal(t, float64(20), body["price_amount"])
		require.Equal(t, "usd", body["price_currency"])
		require.Equal(t, "usdttrc20", body["pay_currency"])
		require.Equal(t, "sub2_test", body["order_id"])
		require.Equal(t, "https://example.com/payment/result?resume_token=test", body["success_url"])
		require.Equal(t, true, body["is_fixed_rate"])
		fmt.Fprint(w, `{"id":7,"invoice_url":"https://nowpayments.io/payment/?iid=7"}`)
	}))
	defer srv.Close()
	p.config["apiBase"] = srv.URL
	result, err := p.CreatePayment(context.Background(), payment.CreatePaymentRequest{
		OrderID: "sub2_test", Amount: "20.00", Subject: "API credits", ReturnURL: "https://example.com/payment/result?resume_token=test",
	})
	require.NoError(t, err)
	require.Equal(t, "invoice:7", result.TradeNo)
	require.Equal(t, "USD", result.Currency)
	require.Equal(t, "https://nowpayments.io/payment/?iid=7", result.PayURL)
	status, err := p.QueryOrder(context.Background(), result.TradeNo)
	require.NoError(t, err)
	require.Equal(t, payment.ProviderStatusPending, status.Status)
}

func TestNOWPaymentsRejectsForgedOrIncompletePayment(t *testing.T) {
	for _, tc := range []struct {
		name, status, currency, coin      string
		paid                              float64
		badSignature, wantError, wantPaid bool
	}{
		{"finished", "finished", "usd", "usdttrc20", 10, false, false, true},
		{"overpaid", "finished", "usd", "usdttrc20", 11, false, false, true},
		{"confirming", "confirming", "usd", "usdttrc20", 10, false, false, false},
		{"partially paid", "partially_paid", "usd", "usdttrc20", 5, false, false, false},
		{"finished but underpaid", "finished", "usd", "usdttrc20", 9.99, false, true, false},
		{"wrong currency", "finished", "eur", "usdttrc20", 10, false, true, false},
		{"wrong network", "finished", "usd", "usdterc20", 10, false, true, false},
		{"forged", "finished", "usd", "usdttrc20", 10, true, true, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := newTestNOWPayments(t)
			// Explicit alphabetical serialization is independent of the verifier.
			canonical := fmt.Sprintf(`{"actually_paid":%g,"invoice_id":7,"order_id":"sub2_test","pay_amount":10,"pay_currency":%q,"payment_id":42,"payment_status":%q,"price_amount":10,"price_currency":%q}`, tc.paid, tc.coin, tc.status, tc.currency)
			mac := hmac.New(sha512.New, []byte("test-ipn-secret"))
			mac.Write([]byte(canonical))
			signature := hex.EncodeToString(mac.Sum(nil))
			if tc.badSignature {
				signature = strings.Repeat("0", 128)
			}
			// Wire payload deliberately arrives in a different key order.
			body := fmt.Sprintf(`{"payment_status":%q,"payment_id":42,"invoice_id":7,"order_id":"sub2_test","price_amount":10,"price_currency":%q,"pay_currency":%q,"pay_amount":10,"actually_paid":%g}`, tc.status, tc.currency, tc.coin, tc.paid)
			n, err := p.VerifyNotification(context.Background(), body, map[string]string{"x-nowpayments-sig": signature})
			if tc.wantError {
				require.Error(t, err)
				require.Nil(t, n)
				return
			}
			require.NoError(t, err)
			if !tc.wantPaid {
				require.Nil(t, n)
				return
			}
			require.Equal(t, "sub2_test", n.OrderID)
			require.Equal(t, "42", n.TradeNo)
			require.Equal(t, float64(10), n.Amount)
			require.Equal(t, "7", n.Metadata["invoice_id"])
		})
	}
}

func TestNOWPaymentsConfigAndRefund(t *testing.T) {
	_, err := NewNOWPayments("test", map[string]string{"apiKey": "key"})
	require.Error(t, err)
	p := newTestNOWPayments(t)
	config := cloneStringMap(p.config)
	config["notifyUrl"] = "http://localhost:8080/callback"
	_, err = NewNOWPayments("test", config)
	require.Error(t, err)
	config["notifyUrl"] = "https://example.com/callback"
	config["payCurrency"] = "btc"
	_, err = NewNOWPayments("test", config)
	require.Error(t, err)
	_, err = p.Refund(context.Background(), payment.RefundRequest{})
	require.Error(t, err)
}

func TestNOWPaymentsNotificationCanonicalJSON(t *testing.T) {
	p := newTestNOWPayments(t)
	// The independent signing fixture matches JavaScript JSON.stringify:
	// recursively sorted keys, literal HTML/Unicode, and escaped backslashes.
	canonical := `{"actually_paid":10,"invoice_id":7,"metadata":{"a":"<>&` + "\u2028\u2029" + `","z":[{"a":1,"b":"\\u2028"}]},"order_id":"sub2_test","pay_amount":10,"pay_currency":"usdttrc20","payment_id":42,"payment_status":"finished","price_amount":10,"price_currency":"usd"}`
	body := `{"price_currency":"usd","price_amount":10,"payment_status":"finished","payment_id":42,"pay_currency":"usdttrc20","pay_amount":10,"order_id":"sub2_test","metadata":{"z":[{"b":"\\u2028","a":1}],"a":"<>&\u2028\u2029"},"invoice_id":7,"actually_paid":10}`
	mac := hmac.New(sha512.New, []byte("test-ipn-secret"))
	mac.Write([]byte(canonical))
	n, err := p.VerifyNotification(context.Background(), body, map[string]string{
		"x-nowpayments-sig": hex.EncodeToString(mac.Sum(nil)),
	})
	require.NoError(t, err)
	require.Equal(t, "sub2_test", n.OrderID)
}

func TestNOWPaymentsDoesNotForwardAPIKeyOnRedirect(t *testing.T) {
	p := newTestNOWPayments(t)
	var redirected bool
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		redirected = true
	}))
	defer destination.Close()
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, destination.URL, http.StatusTemporaryRedirect)
	}))
	defer upstream.Close()
	p.config["apiBase"] = upstream.URL
	_, err := p.CreatePayment(context.Background(), payment.CreatePaymentRequest{
		OrderID: "sub2_test", Amount: "20.00",
	})
	require.ErrorContains(t, err, "HTTP 307")
	require.False(t, redirected)
}

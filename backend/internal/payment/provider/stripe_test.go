//go:build unit

package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/stretchr/testify/require"
	stripe "github.com/stripe/stripe-go/v85"
	"github.com/stripe/stripe-go/v85/webhook"
)

func TestStripeVerifyNotification(t *testing.T) {
	const signingSecret = "unit-test-signing-secret"
	tests := []struct {
		name          string
		eventType     string
		apiVersion    string
		wrongSecret   bool
		missingHeader bool
		stale         bool
		tamper        bool
		wantStatus    string
		wantError     bool
		keyMode       string
		liveMode      bool
	}{
		{name: "successful payment", eventType: stripeEventPaymentSuccess, wantStatus: payment.ProviderStatusSuccess},
		{name: "failed payment", eventType: stripeEventPaymentFailed, wantStatus: payment.ProviderStatusFailed},
		{name: "unrelated event", eventType: "customer.created"},
		{name: "wrong signing secret", eventType: stripeEventPaymentSuccess, wrongSecret: true, wantError: true},
		{name: "missing signature", eventType: stripeEventPaymentSuccess, missingHeader: true, wantError: true},
		{name: "expired signature", eventType: stripeEventPaymentSuccess, stale: true, wantError: true},
		{name: "tampered amount", eventType: stripeEventPaymentSuccess, tamper: true, wantError: true},
		{name: "incompatible endpoint API version", eventType: stripeEventPaymentSuccess, apiVersion: "2020-08-27", wantError: true},
		{name: "live payment with live credentials", eventType: stripeEventPaymentSuccess, keyMode: "live", liveMode: true, wantStatus: payment.ProviderStatusSuccess},
		{name: "sandbox payment with sandbox credentials", eventType: stripeEventPaymentSuccess, keyMode: "test", wantStatus: payment.ProviderStatusSuccess},
		{name: "sandbox event cannot credit live account", eventType: stripeEventPaymentSuccess, keyMode: "live", wantError: true},
		{name: "live event cannot credit sandbox account", eventType: stripeEventPaymentSuccess, keyMode: "test", liveMode: true, wantError: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			apiVersion := tt.apiVersion
			if apiVersion == "" {
				apiVersion = stripe.APIVersion
			}
			payload, err := json.Marshal(map[string]any{
				"id": "evt_test", "object": "event", "api_version": apiVersion, "type": tt.eventType, "livemode": tt.liveMode,
				"data": map[string]any{"object": map[string]any{
					"id": "pi_test", "object": "payment_intent", "amount": 1234,
					"currency": "usd", "metadata": map[string]string{"orderId": "sub2_test_order"},
				}},
			})
			require.NoError(t, err)
			unsigned := &webhook.UnsignedPayload{Payload: payload, Secret: signingSecret}
			if tt.wrongSecret {
				unsigned.Secret = "another-unit-test-signing-secret"
			}
			if tt.stale {
				unsigned.Timestamp = time.Now().Add(-10 * time.Minute)
			}
			signed := webhook.GenerateTestSignedPayload(unsigned)
			headers := map[string]string{"stripe-signature": signed.Header}
			if tt.missingHeader {
				delete(headers, "stripe-signature")
			}
			if tt.tamper {
				payload = bytes.Replace(payload, []byte("1234"), []byte("9999"), 1)
			}
			provider := &Stripe{config: map[string]string{"webhookSecret": signingSecret}, initialized: true}
			if tt.keyMode != "" {
				provider.config["secretKey"] = strings.Join([]string{"rk", tt.keyMode, "unit_test_fixture"}, "_")
			}
			notification, err := provider.VerifyNotification(context.Background(), string(payload), headers)
			if tt.wantError {
				require.Error(t, err)
				require.Nil(t, notification)
				return
			}
			require.NoError(t, err)
			if tt.wantStatus == "" {
				require.Nil(t, notification)
				return
			}
			require.NotNil(t, notification)
			require.Equal(t, "pi_test", notification.TradeNo)
			require.Equal(t, "sub2_test_order", notification.OrderID)
			require.Equal(t, 12.34, notification.Amount)
			require.Equal(t, "USD", notification.Metadata["currency"])
			require.Equal(t, tt.wantStatus, notification.Status)
		})
	}
}

func TestNewStripeEnvironmentCredentials(t *testing.T) {
	serverKey := strings.Join([]string{"rk", "live", "unit_test_fixture"}, "_")
	t.Setenv("STRIPE_UNIT_SERVER_KEY", serverKey)
	t.Setenv("STRIPE_UNIT_WEBHOOK_SECRET", "unit-test-webhook-secret")
	config := map[string]string{
		"secretKey":      "env:STRIPE_UNIT_SERVER_KEY",
		"webhookSecret":  "env:STRIPE_UNIT_WEBHOOK_SECRET",
		"publishableKey": strings.Join([]string{"pk", "live", "unit_test_fixture"}, "_"),
		"currency":       "USD",
	}
	p, err := NewStripe("unit", config)
	require.NoError(t, err)
	require.Equal(t, serverKey, p.config["secretKey"])
	require.Equal(t, "unit-test-webhook-secret", p.config["webhookSecret"])
	require.Equal(t, "env:STRIPE_UNIT_SERVER_KEY", config["secretKey"], "stored settings must retain only the reference")
	require.Equal(t, "env:STRIPE_UNIT_WEBHOOK_SECRET", config["webhookSecret"])

	config["publishableKey"] = strings.Join([]string{"pk", "test", "unit_test_fixture"}, "_")
	_, err = NewStripe("unit", config)
	require.ErrorContains(t, err, "same mode")
	require.NotContains(t, err.Error(), serverKey)

	t.Setenv("STRIPE_UNIT_SERVER_KEY", "")
	_, err = NewStripe("unit", config)
	require.ErrorContains(t, err, "empty environment variable")
	require.NotContains(t, err.Error(), serverKey)
}

type stripeRefundBackend struct {
	params []*stripe.RefundCreateParams
}

type stripeQueryModeBackend struct {
	stripeRefundBackend
	live bool
}

func (b *stripeQueryModeBackend) Call(_ string, _ string, _ string, _ stripe.ParamsContainer, v stripe.LastResponseSetter) error {
	intent := v.(*stripe.PaymentIntent)
	intent.ID = "pi_unit"
	intent.Status = stripe.PaymentIntentStatusSucceeded
	intent.Currency = stripe.CurrencyUSD
	intent.Amount = 100
	intent.Livemode = b.live
	return nil
}

func TestStripeQueryOrderMode(t *testing.T) {
	for _, mode := range []string{"live", "test"} {
		for _, live := range []bool{true, false} {
			t.Run(mode+"_"+map[bool]string{true: "live_payment", false: "test_payment"}[live], func(t *testing.T) {
				backend := &stripeQueryModeBackend{live: live}
				key := strings.Join([]string{"rk", mode, "unit_test_fixture"}, "_")
				p := &Stripe{config: map[string]string{"secretKey": key, "currency": "USD"}, initialized: true, sc: stripe.NewClient(key, stripe.WithBackends(&stripe.Backends{API: backend}))}
				order, err := p.QueryOrder(context.Background(), "pi_unit")
				if live != (mode == "live") {
					require.Error(t, err)
					require.Nil(t, order)
					return
				}
				require.NoError(t, err)
				require.Equal(t, payment.ProviderStatusPaid, order.Status)
			})
		}
	}
}

func (b *stripeRefundBackend) Call(_ string, _ string, _ string, params stripe.ParamsContainer, v stripe.LastResponseSetter) error {
	b.params = append(b.params, params.(*stripe.RefundCreateParams))
	refund := v.(*stripe.Refund)
	refund.ID = "re_123"
	refund.Status = stripe.RefundStatusSucceeded
	return nil
}

func (*stripeRefundBackend) CallStreaming(string, string, string, stripe.ParamsContainer, stripe.StreamingLastResponseSetter) error {
	return nil
}

func (*stripeRefundBackend) CallRaw(string, string, string, []byte, *stripe.Params, stripe.LastResponseSetter) error {
	return nil
}

func (*stripeRefundBackend) CallMultipart(string, string, string, string, *bytes.Buffer, *stripe.Params, stripe.LastResponseSetter) error {
	return nil
}

func (*stripeRefundBackend) SetMaxNetworkRetries(int64) {}

func TestStripeRefundUsesStableAmountSpecificIdempotencyKey(t *testing.T) {
	backend := &stripeRefundBackend{}
	client := stripe.NewClient("sk_test", stripe.WithBackends(&stripe.Backends{API: backend}))
	provider := &Stripe{
		config:      map[string]string{"currency": "CNY"},
		initialized: true,
		sc:          client,
	}

	refund := func(amount string) {
		_, err := provider.Refund(context.Background(), payment.RefundRequest{
			TradeNo: "pi_123",
			OrderID: "sub2_order_456",
			Amount:  amount,
		})
		require.NoError(t, err)
	}

	refund("12.34")
	refund("12.34")
	refund("12.35")

	require.Len(t, backend.params, 3)
	require.Equal(t, int64(1234), *backend.params[0].Amount)
	require.Equal(t, "re-sub2_order_456-1234", *backend.params[0].IdempotencyKey)
	require.Equal(t, backend.params[0].IdempotencyKey, backend.params[1].IdempotencyKey)
	require.Equal(t, int64(1235), *backend.params[2].Amount)
	require.Equal(t, "re-sub2_order_456-1235", *backend.params[2].IdempotencyKey)
	require.NotEqual(t, *backend.params[0].IdempotencyKey, *backend.params[2].IdempotencyKey)
}

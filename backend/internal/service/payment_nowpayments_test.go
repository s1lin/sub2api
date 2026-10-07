//go:build unit

package service

import (
	"context"
	"testing"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/stretchr/testify/require"
)

func TestNOWPaymentsCreditsFulfillmentIsIdempotent(t *testing.T) {
	for _, initialStatus := range []string{OrderStatusPending, OrderStatusExpired} {
		t.Run(initialStatus, func(t *testing.T) {
			ctx := context.Background()
			client := newPaymentConfigServiceTestClient(t)
			ensurePaymentAuditOrderActionUniqueIndex(t, ctx, client)
			order := createPaymentFulfillmentSubscriptionOrder(t, ctx, client, initialStatus, time.Now().Add(-time.Hour))
			order, err := client.PaymentOrder.UpdateOneID(order.ID).
				SetOrderType(payment.OrderTypeBalance).
				ClearPlanID().ClearSubscriptionGroupID().ClearSubscriptionDays().
				SetAmount(20).SetPayAmount(21).
				SetPaymentType(payment.TypeUSDT).SetProviderKey(payment.TypeNOWPayments).
				SetPaymentTradeNo("invoice:7").
				SetProviderSnapshot(map[string]any{"schema_version": 2, "provider_key": payment.TypeNOWPayments, "currency": "USD"}).
				SetUpdatedAt(time.Now().Add(-time.Hour)).Save(ctx)
			require.NoError(t, err)

			credited := 0.0
			userRepo := &mockUserRepo{getByIDUser: &User{ID: order.UserID, Balance: 0}}
			userRepo.updateBalanceFn = func(_ context.Context, userID int64, amount float64) error {
				require.Equal(t, order.UserID, userID)
				credited += amount
				return nil
			}
			redeemRepo := &paymentFulfillmentRedeemRepo{}
			redeemService := NewRedeemService(redeemRepo, userRepo, nil, &paymentFulfillmentRedeemCacheStub{}, nil, client, nil, nil)
			svc := &PaymentService{entClient: client, redeemService: redeemService, userRepo: userRepo}
			n := &payment.PaymentNotification{
				OrderID: order.OutTradeNo, TradeNo: "42", Amount: 21, Status: payment.NotificationStatusSuccess,
				Metadata: map[string]string{"currency": "USD", "invoice_id": "7"},
			}
			require.NoError(t, svc.HandlePaymentNotification(ctx, n, payment.TypeNOWPayments))
			require.InDelta(t, 20, credited, 1e-8, "payment fees must not increase API credits")
			reloaded, err := client.PaymentOrder.Get(ctx, order.ID)
			require.NoError(t, err)
			require.Equal(t, OrderStatusCompleted, reloaded.Status)
			require.NoError(t, svc.HandlePaymentNotification(ctx, n, payment.TypeNOWPayments))
			require.InDelta(t, 20, credited, 1e-8, "duplicate callbacks must not credit twice")
			require.Equal(t, 1, redeemRepo.createCalls)
			require.Len(t, redeemRepo.useCalls, 1)
		})
	}
}

func TestNOWPaymentsSubscriptionFulfillmentAndDelayedCallback(t *testing.T) {
	for _, initialStatus := range []string{OrderStatusPending, OrderStatusExpired} {
		t.Run(initialStatus, func(t *testing.T) {
			ctx := context.Background()
			client := newPaymentConfigServiceTestClient(t)
			ensurePaymentAuditOrderActionUniqueIndex(t, ctx, client)
			order := createPaymentFulfillmentSubscriptionOrder(t, ctx, client, initialStatus, time.Now().Add(-time.Hour))
			order, err := client.PaymentOrder.UpdateOneID(order.ID).
				SetPaymentType(payment.TypeUSDT).SetProviderKey(payment.TypeNOWPayments).
				SetPaymentTradeNo("invoice:7").
				SetProviderSnapshot(map[string]any{"schema_version": 2, "provider_key": payment.TypeNOWPayments, "currency": "USD"}).
				SetUpdatedAt(time.Now().Add(-time.Hour)).Save(ctx)
			require.NoError(t, err)
			subRepo := newSubscriptionUserSubRepoStub()
			groupRepo := &subscriptionGroupRepoStub{group: &Group{ID: 7, Status: StatusActive, SubscriptionType: SubscriptionTypeSubscription}}
			svc := &PaymentService{entClient: client, groupRepo: groupRepo, subscriptionSvc: NewSubscriptionService(groupRepo, subRepo, nil, nil, nil)}
			n := &payment.PaymentNotification{
				OrderID: order.OutTradeNo, TradeNo: "42", Amount: order.PayAmount, Status: payment.NotificationStatusSuccess,
				Metadata: map[string]string{"currency": "USD", "invoice_id": "7"},
			}
			// Even a valid merchant callback must identify the original invoice.
			n.Metadata["invoice_id"] = "8"
			require.ErrorContains(t, svc.HandlePaymentNotification(ctx, n, payment.TypeNOWPayments), "invoice mismatch")
			n.Metadata["invoice_id"] = "7"
			require.NoError(t, svc.HandlePaymentNotification(ctx, n, payment.TypeNOWPayments))
			reloaded, err := client.PaymentOrder.Get(ctx, order.ID)
			require.NoError(t, err)
			require.Equal(t, OrderStatusCompleted, reloaded.Status)
			sub, err := subRepo.GetByUserIDAndGroupID(ctx, order.UserID, 7)
			require.NoError(t, err)
			require.Equal(t, SubscriptionStatusActive, sub.Status)
			firstExpiry := sub.ExpiresAt
			require.NoError(t, svc.HandlePaymentNotification(ctx, n, payment.TypeNOWPayments))
			assertPaymentSubscriptionExpiry(t, subRepo, order, firstExpiry)
		})
	}
}

func TestNOWPaymentsConfigMasksCredentialsAndUsesUSD(t *testing.T) {
	ctx := context.Background()
	client := newPaymentConfigServiceTestClient(t)
	svc := NewPaymentConfigService(client, nil, []byte("0123456789abcdef0123456789abcdef"))
	instance, err := svc.CreateProviderInstance(ctx, CreateProviderInstanceRequest{
		ProviderKey: payment.TypeNOWPayments, Name: "USDT", SupportedTypes: []string{payment.TypeUSDT}, Enabled: true,
		Config: map[string]string{"apiKey": "test-key", "ipnSecret": "test-secret", "notifyUrl": "https://tokensbeat.com/api/v1/payment/webhook/nowpayments"},
	})
	require.NoError(t, err)
	masked, err := svc.decryptAndMaskConfig(instance.ProviderKey, instance.Config)
	require.NoError(t, err)
	require.NotContains(t, masked, "apiKey")
	require.NotContains(t, masked, "ipnSecret")
	require.Equal(t, "USD", paymentProviderConfigCurrency(instance.ProviderKey, masked))
	require.NoError(t, validateProviderRequest(payment.TypeNOWPayments, "USDT", "usdt"))
	require.Error(t, validateProviderRequest(payment.TypeNOWPayments, "USDT", "btc"))
}

func TestNOWPaymentsSnapshotRequiresUSDCurrency(t *testing.T) {
	order := &dbent.PaymentOrder{PaymentTradeNo: "invoice:7", ProviderSnapshot: map[string]any{"schema_version": 2, "currency": "USD"}}
	require.Error(t, validateProviderNotificationMetadata(order, payment.TypeNOWPayments, map[string]string{"currency": "EUR", "invoice_id": "7"}))
	require.NoError(t, validateProviderNotificationMetadata(order, payment.TypeNOWPayments, map[string]string{"currency": "USD", "invoice_id": "7"}))
}

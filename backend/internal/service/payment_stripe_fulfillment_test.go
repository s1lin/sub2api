//go:build unit

package service

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/stretchr/testify/require"
)

func TestStripeCreditsFulfillmentAfterExpiryIsIdempotent(t *testing.T) {
	for _, status := range []string{OrderStatusPending, OrderStatusCancelled, OrderStatusExpired} {
		t.Run(status, func(t *testing.T) {
			ctx := context.Background()
			client := newPaymentConfigServiceTestClient(t)
			ensurePaymentAuditOrderActionUniqueIndex(t, ctx, client)
			old := time.Now().Add(-7 * 24 * time.Hour)
			order := createPaymentFulfillmentSubscriptionOrder(t, ctx, client, status, old)
			order, err := client.PaymentOrder.UpdateOneID(order.ID).
				SetOrderType(payment.OrderTypeBalance).
				ClearPlanID().ClearSubscriptionGroupID().ClearSubscriptionDays().
				SetAmount(20).SetPayAmount(21).
				SetPaymentType(payment.TypeStripe).SetProviderKey(payment.TypeStripe).
				SetPaymentTradeNo("pi_stripe_fulfillment_test").
				SetProviderSnapshot(map[string]any{"schema_version": 2, "provider_key": payment.TypeStripe, "currency": "USD"}).
				SetUpdatedAt(old).Save(ctx)
			require.NoError(t, err)

			credited := 0.0
			userRepo := &mockUserRepo{getByIDUser: &User{ID: order.UserID}}
			userRepo.updateBalanceFn = func(_ context.Context, userID int64, amount float64) error {
				require.Equal(t, order.UserID, userID)
				credited += amount
				return nil
			}
			redeemRepo := &paymentFulfillmentRedeemRepo{}
			svc := &PaymentService{entClient: client, userRepo: userRepo,
				redeemService: NewRedeemService(redeemRepo, userRepo, nil, &paymentFulfillmentRedeemCacheStub{}, nil, client, nil, nil)}
			n := &payment.PaymentNotification{OrderID: order.OutTradeNo, TradeNo: "pi_stripe_fulfillment_test",
				Amount: 21, Status: payment.NotificationStatusSuccess, Metadata: map[string]string{"currency": "USD"}}

			// A stale local deadline must not suppress a verified successful payment.
			require.NoError(t, svc.HandlePaymentNotification(ctx, n, payment.TypeStripe))
			require.InDelta(t, 20, credited, 1e-8, "fees are not spendable credits")
			reloaded, err := client.PaymentOrder.Get(ctx, order.ID)
			require.NoError(t, err)
			require.Equal(t, OrderStatusCompleted, reloaded.Status)
			require.NoError(t, svc.HandlePaymentNotification(ctx, n, payment.TypeStripe))
			require.InDelta(t, 20, credited, 1e-8, "a duplicate event must not credit twice")
			require.Equal(t, 1, redeemRepo.createCalls)
			require.Len(t, redeemRepo.useCalls, 1)
		})
	}
}

func TestStripeExpiredPaymentStillValidatesAmountAndCurrency(t *testing.T) {
	for _, tc := range []struct {
		name, currency string
		amount         float64
	}{
		{"wrong_amount", "USD", 1},
		{"wrong_currency", "EUR", 21},
		{"missing_currency", "", 21},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			client := newPaymentConfigServiceTestClient(t)
			old := time.Now().Add(-7 * 24 * time.Hour)
			order := createPaymentFulfillmentSubscriptionOrder(t, ctx, client, OrderStatusExpired, old)
			order, err := client.PaymentOrder.UpdateOneID(order.ID).
				SetOrderType(payment.OrderTypeBalance).SetAmount(20).SetPayAmount(21).
				SetPaymentType(payment.TypeStripe).SetProviderKey(payment.TypeStripe).
				SetProviderSnapshot(map[string]any{"schema_version": 2, "provider_key": payment.TypeStripe, "currency": "USD"}).
				SetUpdatedAt(old).Save(ctx)
			require.NoError(t, err)
			svc := &PaymentService{entClient: client}
			err = svc.HandlePaymentNotification(ctx, &payment.PaymentNotification{OrderID: order.OutTradeNo,
				TradeNo: "pi_invalid_notification", Amount: tc.amount, Status: payment.NotificationStatusSuccess,
				Metadata: map[string]string{"currency": tc.currency}}, payment.TypeStripe)
			require.Error(t, err)
			reloaded, err := client.PaymentOrder.Get(ctx, order.ID)
			require.NoError(t, err)
			require.Equal(t, OrderStatusExpired, reloaded.Status)
		})
	}
}

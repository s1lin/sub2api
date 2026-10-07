package routes

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/enttest"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/handler"
	"github.com/Wei-Shaw/sub2api/internal/handler/admin"
	servermiddleware "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	_ "modernc.org/sqlite"
)

type publicPlansSettingsRepo struct {
	service.SettingRepository
	values map[string]string
	err    error
}

func (r publicPlansSettingsRepo) GetMultiple(context.Context, []string) (map[string]string, error) {
	return r.values, r.err
}
func (r publicPlansSettingsRepo) GetValue(_ context.Context, key string) (string, error) {
	return r.values[key], r.err
}

func publicPlansRouter(t *testing.T, client *dbent.Client, repo publicPlansSettingsRepo) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	rdb := redis.NewClient(&redis.Options{Addr: miniredis.RunT(t).Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	// Protected routes require auth; the public catalog must still work.
	denyAuth := func(c *gin.Context) { c.AbortWithStatus(http.StatusUnauthorized) }
	RegisterPaymentRoutes(router.Group("/api/v1"),
		handler.NewPaymentHandler(nil, service.NewPaymentConfigService(client, repo, nil)),
		&handler.PaymentWebhookHandler{}, &admin.PaymentHandler{},
		servermiddleware.JWTAuthMiddleware(denyAuth), servermiddleware.AdminAuthMiddleware(denyAuth),
		servermiddleware.AuditLogMiddleware(func(c *gin.Context) { c.Next() }),
		service.NewSettingService(repo, &config.Config{}), nil, rdb,
	)
	return router
}

func TestPublicPlansCatalogHonorsFeatureSwitches(t *testing.T) {
	for _, tc := range []struct {
		name   string
		values map[string]string
		fail   bool
	}{
		{"payments disabled", map[string]string{"payment_enabled": "false"}, false},
		{"subscriptions disabled", map[string]string{"payment_enabled": "true", "subscription_enabled": "false"}, false},
		{"backend only", map[string]string{"payment_enabled": "true", "backend_mode_enabled": "true"}, false},
		{"settings failure", nil, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			repo := publicPlansSettingsRepo{values: tc.values}
			if tc.fail {
				repo.err = errors.New("settings unavailable")
			}
			router := publicPlansRouter(t, nil, repo)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/payment/public/plans", nil))
			if tc.fail {
				require.Equal(t, http.StatusInternalServerError, w.Code)
				return
			}
			require.Equal(t, http.StatusOK, w.Code)
			require.JSONEq(t, `{"code":0,"message":"success","data":[]}`, w.Body.String())
		})
	}
}

func TestPublicPlansCatalogOnlyExposesPurchasablePlans(t *testing.T) {
	ctx := context.Background()
	db, err := sql.Open("sqlite", "file:public_plans?mode=memory&cache=shared&_pragma=foreign_keys(1)")
	require.NoError(t, err)
	defer db.Close()
	client := enttest.NewClient(t, enttest.WithOptions(dbent.Driver(entsql.OpenDB(dialect.SQLite, db))))
	defer client.Close()
	activeGroup, err := client.Group.Create().SetName("OpenAI API").SetPlatform("openai").SetStatus("active").SetSubscriptionType("subscription").SetDailyLimitUsd(10).Save(ctx)
	require.NoError(t, err)
	inactiveGroup, err := client.Group.Create().SetName("Unavailable").SetStatus("inactive").SetSubscriptionType("subscription").Save(ctx)
	require.NoError(t, err)
	for _, plan := range []struct {
		name    string
		groupID int64
		sale    bool
	}{
		{"Developer", activeGroup.ID, true}, {"Draft", activeGroup.ID, false}, {"Inactive", inactiveGroup.ID, true},
	} {
		_, err := client.SubscriptionPlan.Create().SetName(plan.name).SetGroupID(plan.groupID).SetPrice(20).SetValidityDays(30).SetForSale(plan.sale).Save(ctx)
		require.NoError(t, err)
	}
	_, err = client.PaymentProviderInstance.Create().SetProviderKey("nowpayments").SetName("USDT").SetConfig(`{"apiKey":"must-stay-private","ipnSecret":"also-private"}`).SetSupportedTypes("usdt").Save(ctx)
	require.NoError(t, err)
	router := publicPlansRouter(t, client, publicPlansSettingsRepo{values: map[string]string{"payment_enabled": "true"}})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/payment/public/plans", nil))
	require.Equal(t, http.StatusOK, w.Code)
	var response struct {
		Data []struct {
			Name          string  `json:"name"`
			DailyLimitUSD float64 `json:"daily_limit_usd"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
	require.Len(t, response.Data, 1)
	require.Equal(t, "Developer", response.Data[0].Name)
	require.Equal(t, float64(10), response.Data[0].DailyLimitUSD)
	require.NotContains(t, w.Body.String(), "must-stay-private")
	require.NotContains(t, w.Body.String(), "ipnSecret")
	// Disabling a previously advertised group removes it from the next catalog.
	_, err = client.Group.UpdateOneID(activeGroup.ID).SetDeletedAt(time.Now()).Save(ctx)
	require.NoError(t, err)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/payment/public/plans", nil))
	require.JSONEq(t, `{"code":0,"message":"success","data":[]}`, w.Body.String())
}

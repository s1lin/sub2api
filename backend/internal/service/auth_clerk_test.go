//go:build unit

package service

import (
	"context"
	"encoding/json"
	"testing"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/authidentity"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/pkg/clerkauth"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

type clerkVerifierStub struct {
	claims       *clerkauth.Claims
	profile      *clerkauth.Profile
	profileCalls int
}

func (v *clerkVerifierStub) Verify(context.Context, string) (*clerkauth.Claims, error) {
	return v.claims, nil
}
func (v *clerkVerifierStub) User(context.Context, string) (*clerkauth.Profile, error) {
	v.profileCalls++
	return v.profile, nil
}

type clerkUserRepoStub struct {
	*mockUserRepo
	client *dbent.Client
	found  *User
}

func (r *clerkUserRepoStub) GetByEmail(context.Context, string) (*User, error) {
	if r.found == nil {
		return nil, ErrUserNotFound
	}
	return r.found, nil
}
func (r *clerkUserRepoStub) Create(ctx context.Context, u *User) error {
	client := r.client
	if tx := dbent.TxFromContext(ctx); tx != nil {
		client = tx.Client()
	}
	m, err := client.User.Create().SetEmail(u.Email).SetPasswordHash(u.PasswordHash).SetRole(u.Role).SetBalance(u.Balance).SetConcurrency(u.Concurrency).SetStatus(u.Status).SetSignupSource(u.SignupSource).Save(ctx)
	if err != nil {
		return err
	}
	u.ID = m.ID
	return nil
}

func clerkServiceFixture(t *testing.T, registration bool) (*AuthService, *clerkVerifierStub, *clerkUserRepoStub) {
	client := newPaymentConfigServiceTestClient(t)
	var profile clerkauth.Profile
	require.NoError(t, json.Unmarshal([]byte(`{"id":"user_clerk","primary_email_address_id":"email_1","first_name":"Customer","email_addresses":[{"id":"email_1","email_address":"customer@example.com","verification":{"status":"verified"}}]}`), &profile))
	v := &clerkVerifierStub{claims: &clerkauth.Claims{RegisteredClaims: jwt.RegisteredClaims{Issuer: "https://clerk.tokensbeat.com", Subject: "user_clerk"}, SessionID: "sess_clerk"}, profile: &profile}
	values := map[string]string{SettingKeyDefaultBalance: "3", SettingKeyDefaultConcurrency: "5"}
	if registration {
		values[SettingKeyRegistrationEnabled] = "true"
	}
	repo := &clerkUserRepoStub{mockUserRepo: &mockUserRepo{}, client: client}
	s := &AuthService{cfg: &config.Config{Clerk: config.ClerkConfig{PublishableKey: "configured"}}, entClient: client, userRepo: repo, clerkAuthVerifier: v, settingService: NewSettingService(&paymentConfigSettingRepoStub{values: values}, nil)}
	s.clerkAuthOnce.Do(func() {})
	return s, v, repo
}

func TestClerkPreservesExistingRoleBalanceAndBinding(t *testing.T) {
	s, v, repo := clerkServiceFixture(t, false)
	m, err := s.entClient.User.Create().SetEmail("customer@example.com").SetPasswordHash("existing-hash").SetRole(RoleAdmin).SetBalance(123.5).SetConcurrency(5).SetStatus(StatusActive).Save(context.Background())
	require.NoError(t, err)
	repo.found = &User{ID: m.ID, Email: m.Email, PasswordHash: m.PasswordHash, Role: RoleAdmin, Balance: 123.5, Concurrency: 5, Status: StatusActive}
	repo.getByIDUser = repo.found
	claims, err := s.ValidateSession(context.Background(), "verified-fixture")
	require.NoError(t, err)
	require.Equal(t, m.ID, claims.UserID)
	require.Equal(t, RoleAdmin, claims.Role)
	// Protected middleware loads a normalized UserService profile separately.
	// Its account version must agree with the Clerk authentication result.
	middlewareUser := *repo.found
	normalizeLoadedUserTokenVersion(&middlewareUser)
	require.Equal(t, middlewareUser.TokenVersion, claims.TokenVersion)
	stored, err := s.entClient.User.Get(context.Background(), m.ID)
	require.NoError(t, err)
	require.Equal(t, 123.5, stored.Balance)
	v.profile.EmailAddresses[0].Email = "changed@example.com"
	claims, err = s.ValidateSession(context.Background(), "verified-fixture")
	require.NoError(t, err)
	require.Equal(t, m.ID, claims.UserID)
	require.Equal(t, 1, v.profileCalls, "subject binding survives email changes and avoids per-request profile reads")
	v.claims.Subject = "user_another"
	v.profile.ID = "user_another"
	v.profile.EmailAddresses[0].Email = "customer@example.com"
	_, err = s.ValidateSession(context.Background(), "another-subject")
	require.ErrorContains(t, err, "already linked")
}

func TestClerkNewUserAndRegistrationPolicy(t *testing.T) {
	s, _, _ := clerkServiceFixture(t, false)
	_, err := s.ValidateSession(context.Background(), "verified-fixture")
	require.ErrorIs(t, err, ErrRegDisabled)
	count, err := s.entClient.User.Query().Count(context.Background())
	require.NoError(t, err)
	require.Zero(t, count)
	s, _, _ = clerkServiceFixture(t, true)
	claims, err := s.ValidateSession(context.Background(), "verified-fixture")
	require.NoError(t, err)
	created, err := s.entClient.User.Get(context.Background(), claims.UserID)
	require.NoError(t, err)
	require.Equal(t, RoleUser, created.Role)
	require.Equal(t, "clerk", created.SignupSource)
	require.Equal(t, 3.0, created.Balance)
	identity, err := s.entClient.AuthIdentity.Query().Where(authidentity.ProviderTypeEQ("clerk")).Only(context.Background())
	require.NoError(t, err)
	require.Equal(t, created.ID, identity.UserID)
}

func TestClerkRejectsUnverifiedEmailAndRequiresExistingMFA(t *testing.T) {
	s, v, _ := clerkServiceFixture(t, true)
	v.profile.EmailAddresses[0].Verification.Status = "unverified"
	_, err := s.ValidateSession(context.Background(), "verified-fixture")
	require.ErrorContains(t, err, "Verify your primary email")
	s, v, repo := clerkServiceFixture(t, false)
	m, err := s.entClient.User.Create().SetEmail("customer@example.com").SetPasswordHash("hash").SetStatus(StatusActive).SetTotpEnabled(true).Save(context.Background())
	require.NoError(t, err)
	repo.found = &User{ID: m.ID, Email: m.Email, Role: RoleUser, Status: StatusActive, TotpEnabled: true}
	_, err = s.ValidateSession(context.Background(), "verified-fixture")
	require.ErrorContains(t, err, "two-factor")
	v.claims.FactorAge = []int{0, 0}
	_, err = s.ValidateSession(context.Background(), "verified-fixture")
	require.NoError(t, err)
}

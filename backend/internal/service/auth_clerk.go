package service

import (
	"context"
	"errors"
	"strings"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/authidentity"
	"github.com/Wei-Shaw/sub2api/internal/pkg/clerkauth"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
)

type clerkIdentityVerifier interface {
	Verify(context.Context, string) (*clerkauth.Claims, error)
	User(context.Context, string) (*clerkauth.Profile, error)
}

func (s *AuthService) ClerkEnabled() bool {
	return s != nil && s.cfg != nil && strings.TrimSpace(s.cfg.Clerk.PublishableKey) != ""
}

// ValidateSession accepts only Clerk session tokens when Clerk is configured.
// Native JWTs remain supported by installations that do not enable Clerk.
func (s *AuthService) ValidateSession(ctx context.Context, raw string) (*JWTClaims, error) {
	if !s.ClerkEnabled() {
		return s.ValidateToken(raw)
	}
	s.clerkAuthOnce.Do(func() {
		s.clerkAuthVerifier, s.clerkAuthError = clerkauth.New(s.cfg.Clerk.PublishableKey, s.cfg.Clerk.SecretKey, s.cfg.Clerk.AllowedOrigins)
	})
	if s.clerkAuthError != nil || s.clerkAuthVerifier == nil {
		return nil, ErrServiceUnavailable
	}
	claims, err := s.clerkAuthVerifier.Verify(ctx, raw)
	if err != nil {
		if errors.Is(err, clerkauth.ErrUnavailable) {
			return nil, ErrServiceUnavailable
		}
		return nil, ErrInvalidToken
	}
	user, err := s.resolveClerkUser(ctx, claims)
	if err != nil {
		return nil, err
	}
	if !user.IsActive() {
		return nil, ErrUserNotActive
	}
	// Preserve the MFA requirement of accounts that already enabled local TOTP.
	if user.TotpEnabled && (len(claims.FactorAge) < 2 || claims.FactorAge[1] < 0) {
		return nil, infraerrors.Forbidden("CLERK_MFA_REQUIRED", "Enable and verify two-factor authentication in Clerk to access this account")
	}
	return &JWTClaims{UserID: user.ID, Email: user.Email, Role: user.Role, TokenVersion: resolvedTokenVersion(user), SessionID: claims.SessionID, RegisteredClaims: claims.RegisteredClaims}, nil
}

func (s *AuthService) resolveClerkUser(ctx context.Context, claims *clerkauth.Claims) (*User, error) {
	return s.resolveClerkUserAttempt(ctx, claims, 0)
}

func (s *AuthService) resolveClerkUserAttempt(ctx context.Context, claims *clerkauth.Claims, attempt int) (*User, error) {
	if attempt > 1 {
		return nil, ErrServiceUnavailable
	}
	if s.entClient == nil {
		return nil, ErrServiceUnavailable
	}
	findIdentity := func(client *dbent.Client, queryCtx context.Context) (*dbent.AuthIdentity, error) {
		return client.AuthIdentity.Query().Where(authidentity.ProviderTypeEQ("clerk"), authidentity.ProviderKeyEQ(claims.Issuer), authidentity.ProviderSubjectEQ(claims.Subject)).Only(queryCtx)
	}
	identity, err := findIdentity(s.entClient, ctx)
	if err == nil {
		return s.userRepo.GetByID(ctx, identity.UserID)
	}
	if !dbent.IsNotFound(err) {
		return nil, ErrServiceUnavailable
	}
	profile, err := s.clerkAuthVerifier.User(ctx, claims.Subject)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	email, err := profile.VerifiedEmail()
	if err != nil {
		return nil, infraerrors.Forbidden("CLERK_EMAIL_UNVERIFIED", "Verify your primary email address in Clerk before signing in")
	}
	if isReservedEmail(email) {
		return nil, ErrEmailReserved
	}
	// Identity and new account creation commit together. Unique constraints make
	// concurrent first requests converge without duplicate users or signup grants.
	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	defer tx.Rollback()
	txCtx := dbent.NewTxContext(ctx, tx)
	user, err := s.userRepo.GetByEmail(txCtx, email)
	created := false
	grantPlan := s.resolveSignupGrantPlan(ctx, "clerk")
	if errors.Is(err, ErrUserNotFound) {
		if s.settingService == nil || !s.settingService.IsRegistrationEnabled(ctx) {
			return nil, ErrRegDisabled
		}
		if s.settingService.IsInvitationCodeEnabled(ctx) {
			return nil, ErrInvitationCodeRequired
		}
		if err := s.validateRegistrationEmailPolicy(ctx, email); err != nil {
			return nil, err
		}
		password, passwordErr := randomHexString(32)
		if passwordErr != nil {
			return nil, ErrServiceUnavailable
		}
		hash, hashErr := s.HashPassword(password)
		if hashErr != nil {
			return nil, ErrServiceUnavailable
		}
		username := strings.TrimSpace(profile.FirstName + " " + profile.LastName)
		if len([]rune(username)) > 100 {
			username = string([]rune(username)[:100])
		}
		user = &User{Email: email, Username: username, PasswordHash: hash, Role: RoleUser, Balance: grantPlan.Balance, Concurrency: grantPlan.Concurrency, RPMLimit: s.settingService.GetDefaultUserRPMLimit(ctx), Status: StatusActive, SignupSource: "clerk"}
		if err := s.userRepo.Create(txCtx, user); err != nil {
			// A concurrently committed registration wins; retry outside this tx.
			if errors.Is(err, ErrEmailExists) {
				_ = tx.Rollback()
				return s.resolveClerkUserAttempt(ctx, claims, attempt+1)
			}
			return nil, ErrServiceUnavailable
		}
		created = true
	} else if err != nil {
		return nil, ErrServiceUnavailable
	}
	if !user.IsActive() {
		return nil, ErrUserNotActive
	}
	if user.TotpEnabled && (len(claims.FactorAge) < 2 || claims.FactorAge[1] < 0) {
		return nil, infraerrors.Forbidden("CLERK_MFA_REQUIRED", "Enable and verify two-factor authentication in Clerk to access this account")
	}
	// One Clerk identity per issuer may own an account. Recycled emails must
	// never attach a second Clerk subject to another user's balance or role.
	bound, err := tx.Client().AuthIdentity.Query().Where(authidentity.UserIDEQ(user.ID), authidentity.ProviderTypeEQ("clerk"), authidentity.ProviderKeyEQ(claims.Issuer)).Exist(txCtx)
	if err != nil {
		return nil, ErrServiceUnavailable
	}
	if bound {
		return nil, infraerrors.Conflict("CLERK_IDENTITY_CONFLICT", "This account is already linked to another Clerk identity")
	}
	_, err = tx.Client().AuthIdentity.Create().SetUserID(user.ID).SetProviderType("clerk").SetProviderKey(claims.Issuer).SetProviderSubject(claims.Subject).SetIssuer(claims.Issuer).SetVerifiedAt(time.Now()).SetMetadata(map[string]any{"source": "clerk_verified_email"}).Save(txCtx)
	if err != nil {
		if dbent.IsConstraintError(err) {
			_ = tx.Rollback()
			identity, err := findIdentity(s.entClient, ctx)
			if err == nil {
				return s.userRepo.GetByID(ctx, identity.UserID)
			}
		}
		return nil, ErrServiceUnavailable
	}
	if err := tx.Commit(); err != nil {
		return nil, ErrServiceUnavailable
	}
	if created {
		s.postAuthUserBootstrap(ctx, user, "clerk", true)
		s.assignSubscriptions(ctx, user.ID, grantPlan.Subscriptions, "auto assigned by signup defaults")
		_ = s.snapshotPlatformQuotaDefaults(ctx, user.ID, &grantPlan)
	}
	return user, nil
}

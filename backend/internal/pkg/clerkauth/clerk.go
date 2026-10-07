// Package clerkauth verifies short-lived Clerk session tokens against a pinned
// instance and retrieves verified identity information on the server.
package clerkauth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"math/big"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidSession  = errors.New("invalid Clerk session")
	ErrUnavailable     = errors.New("Clerk identity service unavailable")
	ErrUnverifiedEmail = errors.New("Clerk requires a verified primary email address")
)

type Claims struct {
	jwt.RegisteredClaims
	SessionID       string `json:"sid"`
	AuthorizedParty string `json:"azp"`
	Status          string `json:"sts"`
	FactorAge       []int  `json:"fva"`
}

type Profile struct {
	ID             string `json:"id"`
	PrimaryEmailID string `json:"primary_email_address_id"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Banned         bool   `json:"banned"`
	Locked         bool   `json:"locked"`
	EmailAddresses []struct {
		ID           string `json:"id"`
		Email        string `json:"email_address"`
		Verification struct {
			Status string `json:"status"`
		} `json:"verification"`
	} `json:"email_addresses"`
}

func (p *Profile) VerifiedEmail() (string, error) {
	if p.Banned || p.Locked {
		return "", ErrInvalidSession
	}
	for _, email := range p.EmailAddresses {
		if email.ID == p.PrimaryEmailID && email.Verification.Status == "verified" {
			value := strings.ToLower(strings.TrimSpace(email.Email))
			parsed, err := mail.ParseAddress(value)
			if err == nil && parsed.Address == value && len(value) <= 255 {
				return value, nil
			}
		}
	}
	return "", ErrUnverifiedEmail
}

type Verifier struct {
	Issuer           string
	secretKey        string
	origins          map[string]bool
	client           *http.Client
	mu               sync.Mutex
	keys             map[string]*rsa.PublicKey
	fetchedAt        time.Time
	lastFetchAttempt time.Time
}

func IssuerFromPublishableKey(publishableKey string) (string, error) {
	key := strings.TrimSpace(publishableKey)
	var encoded string
	if strings.HasPrefix(key, "pk_live_") {
		encoded = strings.TrimPrefix(key, "pk_live_")
	} else if strings.HasPrefix(key, "pk_test_") {
		encoded = strings.TrimPrefix(key, "pk_test_")
	} else {
		return "", ErrUnavailable
	}
	decoded, err := base64.RawStdEncoding.DecodeString(strings.TrimRight(encoded, "="))
	if err != nil || !strings.HasSuffix(string(decoded), "$") {
		return "", ErrUnavailable
	}
	host := strings.TrimSuffix(string(decoded), "$")
	parsed, err := url.Parse("https://" + host)
	if err != nil || parsed.Hostname() != host || parsed.Port() != "" || parsed.User != nil || parsed.Path != "" || parsed.RawQuery != "" || parsed.Fragment != "" || !strings.Contains(host, ".") {
		return "", ErrUnavailable
	}
	return "https://" + host, nil
}

func New(publishableKey, secretKey string, origins []string) (*Verifier, error) {
	issuer, err := IssuerFromPublishableKey(publishableKey)
	if err != nil {
		return nil, err
	}
	v := &Verifier{Issuer: issuer, secretKey: strings.TrimSpace(secretKey), origins: map[string]bool{}, keys: map[string]*rsa.PublicKey{}, client: &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
	for _, origin := range origins {
		v.origins[strings.TrimSpace(origin)] = true
	}
	if len(v.origins) == 0 {
		return nil, ErrUnavailable
	}
	return v, nil
}

func (v *Verifier) Verify(ctx context.Context, raw string) (*Claims, error) {
	if len(raw) == 0 || len(raw) > 8192 {
		return nil, ErrInvalidSession
	}
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok || kid == "" || len(kid) > 256 {
			return nil, ErrInvalidSession
		}
		return v.signingKey(ctx, kid)
	}, jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(v.Issuer), jwt.WithExpirationRequired(), jwt.WithIssuedAt(), jwt.WithLeeway(5*time.Second))
	if err != nil {
		if errors.Is(err, ErrUnavailable) {
			return nil, ErrUnavailable
		}
		return nil, ErrInvalidSession
	}
	if !strings.HasPrefix(claims.Subject, "user_") || len(claims.Subject) > 256 || !strings.HasPrefix(claims.SessionID, "sess_") || len(claims.SessionID) > 256 || claims.NotBefore == nil || claims.IssuedAt == nil || claims.Status == "pending" || claims.AuthorizedParty == "" || !v.origins[claims.AuthorizedParty] {
		return nil, ErrInvalidSession
	}
	return claims, nil
}

func (v *Verifier) signingKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	if time.Since(v.fetchedAt) < 5*time.Minute {
		if key := v.keys[kid]; key != nil {
			return key, nil
		}
		// Permit rotation refresh, but cap requests induced by unknown key IDs.
		if time.Since(v.fetchedAt) < 30*time.Second {
			return nil, ErrInvalidSession
		}
	}
	var jwks struct {
		Keys []struct{ Kid, Kty, Alg, Use, N, E string } `json:"keys"`
	}
	if time.Since(v.lastFetchAttempt) < 5*time.Second {
		return nil, ErrUnavailable
	}
	v.lastFetchAttempt = time.Now()
	if err := v.getJSON(ctx, v.Issuer+"/.well-known/jwks.json", false, &jwks); err != nil {
		return nil, err
	}
	keys := map[string]*rsa.PublicKey{}
	for _, item := range jwks.Keys {
		if item.Kty != "RSA" || (item.Alg != "" && item.Alg != "RS256") || (item.Use != "" && item.Use != "sig") || len(item.Kid) > 256 {
			continue
		}
		n, errN := base64.RawURLEncoding.DecodeString(item.N)
		e, errE := base64.RawURLEncoding.DecodeString(item.E)
		if errN != nil || errE != nil || len(n) < 256 || len(n) > 1024 || len(e) == 0 || len(e) > 4 {
			continue
		}
		exponent := new(big.Int).SetBytes(e).Int64()
		if exponent < 3 || exponent%2 == 0 {
			continue
		}
		keys[item.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(exponent)}
	}
	v.keys, v.fetchedAt = keys, time.Now()
	if key := keys[kid]; key != nil {
		return key, nil
	}
	return nil, ErrInvalidSession
}

func (v *Verifier) User(ctx context.Context, subject string) (*Profile, error) {
	if v.secretKey == "" {
		return nil, ErrUnavailable
	}
	var profile Profile
	if err := v.getJSON(ctx, "https://api.clerk.com/v1/users/"+url.PathEscape(subject), true, &profile); err != nil {
		return nil, err
	}
	if profile.ID != subject {
		return nil, ErrInvalidSession
	}
	return &profile, nil
}

func (v *Verifier) getJSON(ctx context.Context, endpoint string, authenticated bool, out any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return ErrUnavailable
	}
	if authenticated {
		request.Header.Set("Authorization", "Bearer "+v.secretKey)
	}
	request.Header.Set("Accept", "application/json")
	res, err := v.client.Do(request)
	if err != nil {
		return ErrUnavailable
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return ErrUnavailable
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, 1024*1024+1))
	if err != nil || len(body) > 1024*1024 || json.Unmarshal(body, out) != nil {
		return ErrUnavailable
	}
	return nil
}

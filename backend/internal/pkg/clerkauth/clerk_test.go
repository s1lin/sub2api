package clerkauth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

func TestVerifyClerkSession(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	requests := 0
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		require.Empty(t, r.Header.Get("Authorization"), "public signing key requests must not carry the secret")
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{"kid": "key-1", "kty": "RSA", "alg": "RS256", "use": "sig", "n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()), "e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes())}}})
	}))
	defer server.Close()
	v := &Verifier{Issuer: server.URL, origins: map[string]bool{"https://tokensbeat.com": true}, keys: map[string]*rsa.PublicKey{}, client: server.Client()}
	valid := func() Claims {
		return Claims{RegisteredClaims: jwt.RegisteredClaims{Issuer: server.URL, Subject: "user_123", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)), NotBefore: jwt.NewNumericDate(time.Now().Add(-time.Minute)), IssuedAt: jwt.NewNumericDate(time.Now().Add(-time.Minute))}, SessionID: "sess_123", AuthorizedParty: "https://tokensbeat.com"}
	}
	sign := func(claims Claims) string {
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
		token.Header["kid"] = "key-1"
		raw, err := token.SignedString(key)
		require.NoError(t, err)
		return raw
	}
	claims, err := v.Verify(context.Background(), sign(valid()))
	require.NoError(t, err)
	require.Equal(t, "user_123", claims.Subject)
	_, err = v.Verify(context.Background(), sign(valid()))
	require.NoError(t, err)
	require.Equal(t, 1, requests, "cached JWKS should avoid per-request network calls")
	for name, alter := range map[string]func(*Claims){
		"wrong issuer":  func(c *Claims) { c.Issuer = "https://attacker.example" },
		"expired":       func(c *Claims) { c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(-time.Minute)) },
		"no expiry":     func(c *Claims) { c.ExpiresAt = nil },
		"future":        func(c *Claims) { c.NotBefore = jwt.NewNumericDate(time.Now().Add(time.Minute)) },
		"wrong origin":  func(c *Claims) { c.AuthorizedParty = "https://attacker.example" },
		"no origin":     func(c *Claims) { c.AuthorizedParty = "" },
		"no session":    func(c *Claims) { c.SessionID = "" },
		"wrong subject": func(c *Claims) { c.Subject = "admin" },
		"pending":       func(c *Claims) { c.Status = "pending" },
	} {
		t.Run(name, func(t *testing.T) {
			c := valid()
			alter(&c)
			_, err := v.Verify(context.Background(), sign(c))
			require.ErrorIs(t, err, ErrInvalidSession)
		})
	}
	for _, method := range []jwt.SigningMethod{jwt.SigningMethodNone, jwt.SigningMethodHS256} {
		token := jwt.NewWithClaims(method, valid())
		token.Header["kid"] = "key-1"
		var signingKey any = []byte("fake")
		if method == jwt.SigningMethodNone {
			signingKey = jwt.UnsafeAllowNoneSignatureType
		}
		raw, err := token.SignedString(signingKey)
		require.NoError(t, err)
		_, err = v.Verify(context.Background(), raw)
		require.ErrorIs(t, err, ErrInvalidSession)
	}
	for i := 0; i < 10; i++ {
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, valid())
		token.Header["kid"] = "unknown"
		raw, _ := token.SignedString(key)
		_, err := v.Verify(context.Background(), raw)
		require.Error(t, err)
	}
	require.Equal(t, 1, requests, "unknown key IDs must not trigger unbounded JWKS requests")
}

func TestClerkProfileRequiresVerifiedPrimaryEmail(t *testing.T) {
	var p Profile
	require.NoError(t, json.Unmarshal([]byte(`{"id":"user_1","primary_email_address_id":"email_1","email_addresses":[{"id":"email_1","email_address":"Admin@Example.com","verification":{"status":"verified"}}]}`), &p))
	email, err := p.VerifiedEmail()
	require.NoError(t, err)
	require.Equal(t, "admin@example.com", email)
	p.EmailAddresses[0].Verification.Status = "unverified"
	_, err = p.VerifiedEmail()
	require.ErrorIs(t, err, ErrUnverifiedEmail)
	p.EmailAddresses[0].Verification.Status = "verified"
	p.PrimaryEmailID = "other"
	_, err = p.VerifiedEmail()
	require.ErrorIs(t, err, ErrUnverifiedEmail)
	p.PrimaryEmailID = "email_1"
	p.Banned = true
	_, err = p.VerifiedEmail()
	require.ErrorIs(t, err, ErrInvalidSession)
}

func TestClerkRejectsMalformedPublishableKeys(t *testing.T) {
	issuer, err := IssuerFromPublishableKey("pk_live_Y2xlcmsudG9rZW5zYmVhdC5jb20k")
	require.NoError(t, err)
	require.Equal(t, "https://clerk.tokensbeat.com", issuer)
	for _, input := range []string{"", "sk_live_secret", "pk_live_invalid", "pk_live_" + base64.RawStdEncoding.EncodeToString([]byte("attacker.example/path$")), "pk_live_" + base64.RawStdEncoding.EncodeToString([]byte("user@attacker.example$"))} {
		_, err := IssuerFromPublishableKey(input)
		require.Error(t, err)
	}
}

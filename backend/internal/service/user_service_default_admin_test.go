//go:build unit

package service

import (
	"context"
	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
	"testing"
)

type defaultAdminRepoStub struct {
	*mockUserRepo
	configured *User
	fallback   *User
	lookupErr  error
	email      string
}

func (r *defaultAdminRepoStub) GetByEmail(_ context.Context, email string) (*User, error) {
	r.email = email
	return r.configured, r.lookupErr
}
func (r *defaultAdminRepoStub) GetFirstAdmin(context.Context) (*User, error) { return r.fallback, nil }

func TestConfiguredDefaultAdmin(t *testing.T) {
	ctx := context.Background()
	cfg := &config.Config{Default: config.DefaultConfig{AdminEmail: " LIN.SHILEI@OUTLOOK.COM "}}
	repo := &defaultAdminRepoStub{mockUserRepo: &mockUserRepo{}, configured: &User{ID: 3, Email: "lin.shilei@outlook.com", Role: RoleAdmin, Status: StatusActive}, fallback: &User{ID: 1, Role: RoleAdmin, Status: StatusActive}}
	s := NewUserServiceWithConfig(repo, nil, nil, nil, cfg)
	actual, err := s.GetFirstAdmin(ctx)
	require.NoError(t, err)
	require.Equal(t, int64(3), actual.ID)
	require.Equal(t, "lin.shilei@outlook.com", repo.email)
	repo.configured.Role = RoleUser
	_, err = s.GetFirstAdmin(ctx)
	require.Error(t, err, "must not authorize a customer as the administrative API key owner")
	repo.configured.Role = RoleAdmin
	repo.configured.Status = "disabled"
	_, err = s.GetFirstAdmin(ctx)
	require.Error(t, err, "must not fall back to another admin when the configured owner is disabled")
	repo.lookupErr = ErrUserNotFound
	_, err = s.GetFirstAdmin(ctx)
	require.ErrorIs(t, err, ErrUserNotFound)
	actual, err = NewUserServiceWithConfig(repo, nil, nil, nil, &config.Config{}).GetFirstAdmin(ctx)
	require.NoError(t, err)
	require.Equal(t, int64(1), actual.ID)
}

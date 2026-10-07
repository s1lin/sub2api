package handler

func (h *AuthHandler) ClerkEnabled() bool { return h.authService.ClerkEnabled() }

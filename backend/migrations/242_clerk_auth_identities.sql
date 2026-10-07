ALTER TABLE users DROP CONSTRAINT IF EXISTS users_signup_source_check;
ALTER TABLE users ADD CONSTRAINT users_signup_source_check
    CHECK (signup_source IN ('email', 'linuxdo', 'wechat', 'oidc', 'github', 'google', 'dingtalk', 'clerk'));

ALTER TABLE auth_identities DROP CONSTRAINT IF EXISTS auth_identities_provider_type_check;
ALTER TABLE auth_identities ADD CONSTRAINT auth_identities_provider_type_check
    CHECK (provider_type IN ('email', 'linuxdo', 'wechat', 'oidc', 'github', 'google', 'dingtalk', 'clerk'));

CREATE UNIQUE INDEX auth_identities_clerk_user_issuer_key
    ON auth_identities (user_id, provider_key) WHERE provider_type = 'clerk';

# tokensbeat: development, WSL, and customer checkout

## How this project works

`frontend/` is a Vue 3 / TypeScript application built with Vite and pnpm.
`backend/` is a Go / Gin API using Ent for PostgreSQL and Redis for caching,
rate limits, and scheduling. Go's required version is in `backend/go.mod`.
The frontend build writes to `backend/internal/web/dist`; the production Go
binary embeds those files when built with `-tags embed`.

The customer journey is `/home` → `/pricing` → sign in / register → `/purchase`.
The current storefront sells **API credits only**: customers choose a top-up
amount and their balance is credited after confirmed payment. Checkout uses
authenticated backend orders and validates amounts on the server. `/orders`
shows payment history. Checkout redirects survive authentication, including
email verification.

Subscriptions and the subscription purchase entry are disabled in the current
database, while balance top-ups are enabled. Subscription support remains
available in the code if plans are offered later. Such purchases buy a fixed
period of access, without Stripe recurring billing or automatic card charges.

## The environment inspected on this machine

This is currently a **hybrid Windows / WSL 1** setup:

| Component | Observed location | Port |
| --- | --- | --- |
| Repository | `C:\Users\linsh\IdeaProjects\sub2api` | — |
| Vue / Vite | Windows Node 20.19.5, pnpm 9.15.5 | 3000 |
| Go API and built UI | Windows, `backend/bin/server-storefront.exe` | 8080 |
| PostgreSQL | Windows service; backend config uses `127.0.0.1` | 5432 |
| Redis | Ubuntu-22.04 under WSL 1; `redis-cli ping` returned `PONG` | 6379 |
| Additional PostgreSQL | Ubuntu PostgreSQL 14 cluster is also running | 5432 |

Ubuntu does not currently expose a Linux Go, Node, or pnpm on its PATH.
The Windows Go installation is `C:\Users\linsh\go-dist\go\bin`. Its path was
added to the persistent user PATH, but older shells may need reopening.
The existing `backend/.air.toml` launches a Windows `.exe`; use
`backend/.air.wsl.toml` for native Linux development.
The embedded server is now running in place of Air for Cloudflare Tunnel.
Stop that server before starting Air on the same port. Vite remains available
on port 3000 for local development.

Because both Windows and Ubuntu have PostgreSQL processes, verify which
database a tool reaches before running migrations. The Go process running on
Windows uses the Windows endpoint. Keep local `backend/config.yaml` and
`.installed` private; they are local setup artifacts.

## Keep using the working hybrid setup

Start Redis in Ubuntu when it is stopped (PowerShell):

```powershell
wsl -d Ubuntu-22.04 -- sudo service redis-server start
wsl -d Ubuntu-22.04 -- redis-cli ping
```

Start the Windows PostgreSQL service through Services if necessary. Open two
PowerShell terminals from the repository:

```powershell
# Terminal 1
$env:Path += ';C:\Users\linsh\go-dist\go\bin;C:\Users\linsh\go\bin'
cd backend
$env:DATA_DIR = '.'
$env:PAYMENT_RESUME_SIGNING_KEY = [Environment]::GetEnvironmentVariable('PAYMENT_RESUME_SIGNING_KEY', 'User')
$env:CLERK_PUBLISHABLE_KEY = [Environment]::GetEnvironmentVariable('CLERK_PUBLISHABLE_KEY', 'User')
$env:TOKENSBEAT_STRIPE_SECRET_KEY = [Environment]::GetEnvironmentVariable('TOKENSBEAT_STRIPE_SECRET_KEY', 'User')
$env:TOKENSBEAT_STRIPE_WEBHOOK_SECRET = [Environment]::GetEnvironmentVariable('TOKENSBEAT_STRIPE_WEBHOOK_SECRET', 'User')
air -c .air.toml
```

```powershell
# Terminal 2
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Visit `http://localhost:3000/pricing`. Vite proxies `/api`, `/v1`, and `/setup`
to `http://localhost:8080`. Set `VITE_DEV_PROXY_TARGET` and `VITE_DEV_PORT` in
`frontend/.env.local` when using other ports. If the services are already
running, use them instead of starting duplicates.

## Run everything natively inside WSL

Use a separate checkout in the Linux filesystem, such as
`~/projects/sub2api`. Install dependencies there with Linux pnpm; do not reuse
Windows `node_modules`, binaries, or build caches. Keep the current Windows
checkout and its data intact.

1. Install Linux Go matching `backend/go.mod`, Node 20.19+ and pnpm 9.
   Follow the [Go installation guide](https://go.dev/doc/install) and
   [Node downloads](https://nodejs.org/en/download).
2. Install PostgreSQL 15+ and Redis 7+ in Linux, or use the repository's Docker
   Compose stack with Docker Desktop's WSL 2 integration. Ubuntu 22.04's
   existing PostgreSQL 14 cluster is below the project's documented version;
   provision a separate supported database for a new native setup.
3. Copy only source changes into the Linux checkout. Set up a separate
   development database and configure it using `/setup`; for an existing
   configured database, provide the matching private `backend/config.yaml`
   and installation marker. Do not accidentally point a new setup at another
   environment's data.
4. In Linux, run:

```bash
cd ~/projects/sub2api
cd frontend
pnpm install --frozen-lockfile
cd ..
bash tools/dev-wsl.sh check
```

Start the processes in separate Linux terminals:

```bash
bash tools/dev-wsl.sh backend
```

```bash
bash tools/dev-wsl.sh frontend
```

For backend hot reload, install Air and run from `backend/`:

```bash
air -c .air.wsl.toml
```

`bash tools/dev-wsl.sh build` builds the frontend and an embedded Linux server
at `backend/tmp/server-wsl`. Stop the Windows development processes or select
different ports before starting the Linux replacements.

WSL 1 shares the host network. With WSL 2's default NAT networking, Windows can
access Linux services on `localhost`, but Linux connections to Windows
services use the Windows host address. Mirrored networking can use localhost
both ways on supported Windows versions. See
[Microsoft's networking guide](https://learn.microsoft.com/en-us/windows/wsl/networking).
Check the installed distribution with `wsl --list --verbose` before choosing
addresses. A WSL version conversion changes the environment; it is not needed
to use the current hybrid setup. Microsoft documents conversions in its
[command reference](https://learn.microsoft.com/en-us/windows/wsl/basic-commands).

## Enable Stripe and USDT on tokensbeat.com

Use the admin interface to configure credentials; do not put them in source.
Registration is enabled; payments remain disabled pending configuration and
verification. The public storefront shows an unavailable payment message. Stripe
and USDT are selected as the visible payment methods. The Stripe provider is
configured with verified live credentials and enabled for callbacks; the global
payment switch remains off. The NOWPayments draft remains disabled and still
requires credentials and a confirmed USDT network.

Private payment setup credentials can be entered in
`backend/tmp/payment-setup.private.json`. This Git-ignored file is restricted
to the current Windows user, SYSTEM, and Administrators. It is a temporary
credential handoff for setup; the application does not read it automatically.
Stripe's official Codex plugin is installed and its MCP OAuth connection is
authenticated to **Tokensbeat sandbox**. The implementation planner was called
successfully; it returned a checkout decision tree and documentation links,
not a detailed code review. The raw response is saved locally in
`backend/tmp/stripe-planner-result.json`.
NOWPayments' MCP endpoint at `https://mcp.nowpayments.io/mcp` was verified
reachable; its tools require an API key. NOWPayments credentials and its IPN
secret are still needed. Stripe runtime credentials are configured as described
in the live setup record below.

The readiness audit now finds active upstream accounts in the OpenAI standard
credit groups **Right Code** and **Qwen 3.8**, in addition to the original empty
Anthropic `default` group. Public API requests and credit deductions have been
verified for both. Stripe sandbox checkout verification is complete as recorded
below; NOWPayments setup and verification remain outstanding.
Use the admin interface for future upstream credential updates.

1. In **Admin → Settings**, enable registration if new customers should be
   able to sign up. Keep subscriptions disabled and balance top-ups enabled.
   Keep backend-only mode off for customer self-service.
2. In **Settings → Payment**, review the existing Stripe instance
   with currency **USD**, publishable key, restricted server key (the field is
   named **Secret Key**), and webhook signing secret. Start with sandbox keys
   in an isolated test environment and balance ledger. Keep public payments
   disabled until testing and upstream readiness are complete; test payments
   must not grant spendable production credits.
3. Create a **NOWPayments · USDT** instance with supported type **USDT**.
   Enter its API key and IPN Secret. Choose the network actually enabled in
   your NOWPayments account. Set the callback and return base URLs to
   `https://tokensbeat.com`. USDT invoices are priced in USD; the provider
   displays the crypto amount, address, and network at hosted checkout.
4. Verify that regular API groups and upstream accounts are available to
   customers. No subscription groups or sale plans are needed for credit
   top-ups. Review the recharge multiplier, minimum/maximum amount, and fees
   before enabling payments.
5. Publish the application through the Cloudflare Tunnel described below,
   or deploy it behind an HTTPS reverse proxy. For a direct Caddy deployment,
   `deploy/Caddyfile` is configured for `tokensbeat.com`; point its reverse
   proxy to the Go server, set DNS to that server, and allow ports 80/443.
   Keep PostgreSQL and Redis private. See
   [the deployment guide](../deploy/README.md) and
   [edge configuration](../deploy/EDGE_SECURITY.md).
   With Cloudflare proxying, configure trusted client IPs as described in the
   edge guide and allow the payment webhook paths to reach the API without
   an interactive browser challenge.

Callback URLs:

| Provider | URL |
| --- | --- |
| Stripe | `https://tokensbeat.com/api/v1/payment/webhook/stripe` |
| NOWPayments | `https://tokensbeat.com/api/v1/payment/webhook/nowpayments` |
| Browser return | `https://tokensbeat.com/payment/result` |

The NOWPayments adapter creates hosted invoices, verifies sorted-JSON
HMAC-SHA512 signatures in constant time, requires a `finished` status with full
payment, checks the configured USDT network and USD currency, and binds the
invoice to the original order before using the existing idempotent fulfillment
flow. Confirming, failed, expired, and partially paid transfers never activate
an order. Refunds require manual processing in NOWPayments.

Hosted invoice IDs cannot be queried as payment IDs. Before a signed callback
supplies a payment ID, status polling reads the local pending order. If a
callback is missed, resend its IPN from the NOWPayments dashboard. A browser
return alone never marks an order paid. See the official
[Invoice API](https://nowpayments.zendesk.com/hc/en-us/articles/21345824322717-API-and-endpoint-description)
and [IPN contract](https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup).

Before accepting real payments, verify a Stripe test purchase and a NOWPayments
test/small purchase on the public domain, including duplicate callback
delivery, exact balance changes, and a rejected underpayment.
No live funds are moved by the automated fixture tests.

### Right Code upstream setup (verified, 2026-10-07)

The selected upstream is Right Code. Gemini and direct Codex subscription setup
were superseded before either account was imported. Account **Right Code - Codex**
(ID 1) is active and schedulable in the **Right Code** group (ID 2). This is a
public, standard credit group on the OpenAI platform, with no subscription plan.

The protected, Git-ignored handoff file `backend/tmp/rightapi-setup.private.json`
contains the supplied `apiKey`, working `baseUrl`, and smoke-test `model`.
The application uses the imported account credentials in the database; it does
not automatically reload this handoff file. The supplied hostname `rightapi.codes`
timed out. The provider's current
[documentation](https://docs.rightapi.ai/docs/rc_cli_config/codex) shows a unified
`https://rightapi.ai/v1` endpoint, but this key returns HTTP 400 there with a
legacy-key instruction. The documented channel endpoint
**`https://www.rightapi.ai/codex/v1`** returned HTTP 200 and is the configured base.

The account uses API-key authentication and native Responses requests
(`openai_responses_mode=force_responses`), with WebSockets disabled and concurrency
3. Group and account rate multipliers are 1.0, using the application's model
pricing table; these are not a reconciliation of the provider's actual invoice.
The account mapping and group allowlist expose the five GPT models returned by
the provider: `gpt-5.5`, `gpt-5.6-sol`, `gpt-6-sol`, `gpt-6.1-sol`, and `gpt-6-astra`.
The provider's separate `codex-auto-review` entry is not exposed for general use.

Customer API keys should select the **Right Code** group and use the base URL
**`https://api.tokensbeat.com/v1`**. Validation completed on 2026-10-07:

- The normal admin account-connection test succeeded with `gpt-5.6-sol`.
- Public `GET /v1/models` returned the five configured GPT models.
- A public streaming `POST /v1/responses` returned `OK` and `response.completed`.
- Exactly one usage row recorded 21 input and 5 output tokens; the temporary
  user's balance decreased by $0.000255, matching the recorded charge.
- The temporary verification user (ID 8) and API key were removed through the
  normal service methods, with authentication-cache invalidation. Existing
  customer balances were unchanged. The other four models were listed, not
  inference-tested.

Local setup helpers are `backend/tmp/rightapi-setup` and
`backend/tmp/rightapi-gateway-check`. They read credentials internally and print
only verification results. Running their request tests consumes upstream usage.
Public payments remain disabled pending the payment checks described below.

### Qwen3.8-Flash upstream setup (verified, 2026-10-08)

Account **Qwen 3.8 - AABB vLLM** (ID 2) is active and schedulable in the public
standard credit group **Qwen 3.8** (ID 3). Channel **Qwen 3.8** (ID 1) restricts
the group to model **`qwen-3.8`** and supplies explicit token prices. The operator
identified this gateway alias as **Qwen3.8-Flash**; the vLLM model metadata only
exposes `/model` as its weights path, so the variant was not independently
verified from the weights. Existing Right Code routing is preserved.

The upstream is `https://aabb.tokensbeat.com/v1`, served by the gateway at
`/data_minio/data3/shilei/2.5d-object-detection/.tokensbeat/gateway` on
`124.174.9.42` (SSH port 60027). The imported credential belongs to the existing
`external` tenant, restricted to `qwen-3.8`. Secrets are stored in the account
database and the protected, Git-ignored `backend/tmp/qwen-setup` directory.
No remote gateway configuration or unrelated service was changed or restarted.
The gateway verifies its upstream TLS certificate using its existing CA.

Customer keys should select **Qwen 3.8**, use base URL
**`https://api.tokensbeat.com/v1`**, and send model **`qwen-3.8`**. Chat Completions
is the native upstream protocol; Responses requests use the existing
`force_chat_completions` compatibility adapter. WebSockets are disabled.
Account concurrency is 3, group RPM is 30, and both rate multipliers are 1.0.
The actual server advertises a **262,144-token context limit**.

Customer prices match the published Alibaba Cloud Singapore/International
[Qwen3.8-Flash list prices](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash)
checked on 2026-10-08:

| Billing item | USD per million tokens |
| --- | ---: |
| Input | 0.15 |
| Output, including reported reasoning tokens | 0.47 |
| Reported cached input | 0.016 |

These are retail reference rates, not measured self-hosted infrastructure costs.
The gateway currently does not expose per-request cache-hit counts in the
tested responses, so cached-input discounts were configured but not exercised
by a real cache hit. No explicit cache-creation API or fee was enabled.

Verification used temporary regular customer accounts and keys, including a
final run with no explicit group grants after public activation:

- Model listing exposed only `qwen-3.8`; native JSON and streaming Chat
  Completions and streaming Responses all returned completed content.
- Each successful request produced exactly one usage row with the correct
  group, account, channel, token counts, and charge. A 17-input / 2-output request
  cost **$0.00000349**. The final run's four requests cost **$0.00002897** in total;
  the credit balance and API-key quota usage reconciled to that amount.
- A forbidden model returned HTTP 404; an invalid key returned 401; a zero
  balance returned 403; an exhausted key quota returned 429. Rejected requests
  did not add a charge to the checked ledger. Quotas are checked before each
  request; a completed request can cross a positive quota before the next
  request is blocked.
- All temporary users and keys were removed through normal service methods.
  Verification usage remains as audit history; real customer balances were
  not used. Five remote gateway model tests also passed.

The sanitized report is `backend/tmp/qwen-setup/gateway-report.json`; setup
metadata and source rates are alongside it. Helpers use the normal admin and
API-key services with cache invalidation. This activation changes API access
and usage billing only; the global public payment switch remains off.

### Stripe setup and integration review (2026-10-07)

The connected sandbox is `acct_1UNuvkDkc7HAoT5z`. Setup through the official
Stripe MCP created and re-read these resources:

- Snapshot webhook `we_1UNvOWDkc7HAoT5zkxNO5abm`, enabled at the Stripe callback
  URL above. It sends `payment_intent.succeeded` and
  `payment_intent.payment_failed` using API version `2026-03-25.dahlia`, matching
  the deployed stripe-go/v85 integration.
- Enabled payment method domain `tokensbeat.com`
  (`pmd_1UNvOdDkc7HAoT5zJPZir3oz`).

The exposed MCP API search found no runtime-key creation/retrieval operation.
The user subsequently supplied a live restricted key and publishable key in the
protected credential file. The existing adapter needs Payment Intents and
Refunds write permissions. Webhook secrets are separate from API keys. See
[Stripe key management](https://docs.stripe.com/keys).

Live setup is now connected to **Tokensbeat** (`acct_1UNuvYDecob6tOYI`, Canada).
Stripe reported charges and payouts enabled, with no currently due requirements.
Using the supplied live key, setup created and verified webhook
`we_1UNvxrDecob6tOYIJROXs48a` with the URL, API version and two events above, plus
payment method domain `pmd_1UNvxsDecob6tOYISd1IgFcl`. Its new signing secret was
saved directly to the protected credential file.

The live publishable/server key pair was verified by creating an unconfirmed
USD PaymentIntent, retrieving it using the publishable key and client secret,
then cancelling it. The final status was `canceled` and amount received was zero.
This verifies checkout creation and key pairing, not a completed card purchase.
Public webhook probes using non-payment events returned HTTP 200 for a valid
live signature and HTTP 400 for invalid signatures or sandbox-mode events.

Provider instance 1 is enabled with USD currency. Its secret fields store only
`env:TOKENSBEAT_STRIPE_SECRET_KEY` and
`env:TOKENSBEAT_STRIPE_WEBHOOK_SECRET`; the actual values are in the Windows
user environment and backend process environment. Load those variables before
starting the backend from an older terminal. The provider resolves references
at startup, rejects mixed-mode key pairs, and checks event/payment mode before
fulfillment. Restart the backend after rotating these environment credentials.

The implementation plan for this existing integration is:

1. Verify the current Payment Element/PaymentIntent flow for one-time,
   customer-selected USD credit top-ups. Local orders remain the source for
   amounts and user ownership; verified server payment state controls credit
   fulfillment. No recurring Billing products or sale plans are needed.
2. Preserve retries on temporary failures. The webhook handler now returns
   HTTP 503 if it cannot resolve a Stripe provider, and payment confirmation
   propagates database errors instead of acknowledging them as success.
   Truly unknown orders and irrelevant verified events still receive HTTP 200.
3. Sandbox checkout verification completed on October 7–8, 2026 against an
   isolated PostgreSQL instance and Redis database, using the actual storefront,
   Stripe Payment Element, backend, and signed Stripe webhook deliveries.
   Successful card and 3D Secure payments each credited $20. A declined card
   displayed the error and issued no credits. Local regression tests also cover
   signatures (including tampering, expired signatures, and incompatible API
   versions), retry responses, duplicate fulfillment, and amount/currency checks.
4. Fixed and deployed recovery of verified Stripe payments after the local
   expiry grace period. The regression test first reproduced the missing-credit
   bug, then passed with the fix. A real sandbox $7 payment completed an order
   deliberately expired seven days earlier. Its signed callback returned 200;
   two duplicate replays left the balance unchanged, and an invalid signature
   returned 400. Provider, currency, and amount validation still precede recovery.
   Admin refunds of all three successful payments ($47 total) succeeded in Stripe
   and removed the matching credits, returning the isolated balance to zero.
   Remaining pending test intents were cancelled. Right Code API usage was
   independently verified above. Mode validation and environment-backed Stripe
   secret storage are implemented.
5. For a subsequent checkout upgrade, prefer Checkout Sessions with Payment
   Element or hosted Checkout, and Dashboard-managed dynamic payment methods.
   Migrate order references, return flows, expiry, reconciliation and webhook
   fulfillment together. Coordinate SDK, API and webhook-version upgrades and
   rerun the sandbox matrix before cutover. These are recommendations, not
   changes already made to the existing checkout.

Stripe recommends [Checkout Sessions for most integrations](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison)
and explains [dynamic payment methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods)
and [webhook retry behavior](https://docs.stripe.com/webhooks).

Verification used Stripe's [official sandbox test cards](https://docs.stripe.com/testing).
The checkout/result UI suite passed all 38 tests; the focused backend Stripe,
payment, refund, fulfillment, and confirmation tests passed. No real funds moved
and no production customer balance was changed. Live checkout remains disabled
by the global `payment_enabled` setting. The temporary sandbox webhook endpoint
was disabled after verification; the production endpoint remains configured.
Protected, Git-ignored test receipts and browser screenshots are under
`backend/tmp/stripe-e2e/`; sandbox keys are in `backend/tmp/stripe-sandbox.private.json`.

A generated `PAYMENT_RESUME_SIGNING_KEY` is persisted in the Windows user
environment for this installation. Keep it private and stable across restarts
so hosted checkout return links can be verified. Older terminals and launchers
must load it explicitly from the user environment before starting the server.

## Cloudflare Tunnel on this Windows computer

### Clerk authentication

Customer login and registration now use the official `@clerk/vue` SDK when
`frontend/.env.local` contains `VITE_CLERK_PUBLISHABLE_KEY`. This installation
uses the provided production key for `clerk.tokensbeat.com`. Use a Clerk test
instance key for localhost development; production sign-in should be tested
on `https://tokensbeat.com`.

The backend reads the public key from `CLERK_PUBLISHABLE_KEY` (persisted in the
Windows user environment) and the secret from the private `backend/config.yaml`:

```yaml
clerk:
  secret: YOUR_CLERK_SECRET_KEY
```

`CLERK_SECRET_KEY` can override that secret. Do not commit the private config.
The default allowed session origins are `https://tokensbeat.com` and
`https://api.tokensbeat.com`; configure `clerk.allowed_origins` for other
deployments. Both frontend and backend must use the same Clerk instance.

The API verifies the RS256 signature, pinned issuer, time claims, session ID,
and authorized origin, using cached public JWKS. On first sign-in it fetches
the verified primary email from Clerk's Backend API and binds the immutable
Clerk subject to the existing local user. Existing roles, balances, and API
keys remain attached to that user. A new local user always receives the user
role and follows the site's registration and invitation policies. Changing a
Clerk email cannot switch the identity to another local account. Existing
local MFA requirements also require a verified Clerk second factor.

Creating a Clerk identity is separate from creating a local customer account.
The public homepage at `/` is named Home (主页) and shows the API credits storefront; `/home` and
`/pricing` redirect there. The default local administrator is
`lin.shilei@outlook.com`, selected by `default.admin_email` in the private
configuration. Sign up in Clerk with this email and verify it to link to the
prepared admin account. Public customer registration is enabled in this installation.
After email verification, a new Clerk user is provisioned as a regular customer
and enters `/dashboard` by default. An explicit local checkout destination is
preserved through authentication.
The deployment and operation acknowledgment gate has been removed from the
admin console, payment administration, and page management. Legacy compliance
status requests return `required: false`; stored acknowledgments are historical
records and no acknowledgment is written on sign-in.
Use your existing admin email for the first Clerk sign-up so the verified
email can link to the existing admin account. No administrator is created or
promoted from browser metadata.

The frontend gets short-lived Clerk tokens for API requests, refreshes a
rejected token once, and signs out through Clerk. Local password login,
native token refresh, and legacy OAuth login endpoints are disabled when
Clerk is configured. Password and MFA management are available through the
Clerk account screen in Profile.

Public documentation is available at `/docs`, linked from the homepage header,
getting-started section, and footer. Eleven English/Chinese guides cover API
keys, groups, credit billing, Codex, Windows/WSL, Chat Completions, Responses,
Python/JavaScript, compatible clients, and troubleshooting. Documentation uses
the customer endpoint `https://api.tokensbeat.com/v1`, with Qwen and GPT keys
assigned to their respective groups. Source content is maintained in
`frontend/src/content/docs.ts`; the public route requires no login. The docs
include searchable navigation, section links, code copying, and a mobile menu.
Pricing examples are dated and should be updated when configured rates change.

`cloudflared` 2026.10.0 was installed through WinGet at
`C:\Program Files (x86)\cloudflared\cloudflared.exe`. The Cloudflare browser
login completed, and the locally managed tunnel is named `tokensbeat-sub2api`.
Its ID is `30430462-aaef-405a-aeeb-57f1d546cccd`.

The active configuration is outside the repository at
`C:\Users\linsh\.cloudflared\tokensbeat-sub2api.yml`. The account certificate
and tunnel credentials are also in that private directory. Keep these files
out of Git. A template is in
[`deploy/cloudflared.tokensbeat.example.yml`](../deploy/cloudflared.tokensbeat.example.yml).

Both hostnames route to the embedded server:

| Public hostname | Local service |
| --- | --- |
| `tokensbeat.com` | `http://127.0.0.1:8080` (storefront and same-origin API) |
| `api.tokensbeat.com` | `http://127.0.0.1:8080` (API) |

Both DNS routes are active. The public API and same-origin `/health` endpoints
returned `ok`, and `https://tokensbeat.com/pricing` returned the built frontend.
The tunnel configuration passed ingress validation. With user approval, the
two previous apex A records were replaced by the tunnel CNAME; existing TXT
records were preserved. The original records are backed up outside Git at
`C:\Users\linsh\.cloudflared\tokensbeat-dns-backup-20261006T152119Z.json`.

To start the built server after stopping any other process on port 8080:

```powershell
cd C:\Users\linsh\IdeaProjects\sub2api\backend
$env:DATA_DIR = '.'
$env:PAYMENT_RESUME_SIGNING_KEY = [Environment]::GetEnvironmentVariable('PAYMENT_RESUME_SIGNING_KEY', 'User')
$env:CLERK_PUBLISHABLE_KEY = [Environment]::GetEnvironmentVariable('CLERK_PUBLISHABLE_KEY', 'User')
$env:TOKENSBEAT_STRIPE_SECRET_KEY = [Environment]::GetEnvironmentVariable('TOKENSBEAT_STRIPE_SECRET_KEY', 'User')
$env:TOKENSBEAT_STRIPE_WEBHOOK_SECRET = [Environment]::GetEnvironmentVariable('TOKENSBEAT_STRIPE_WEBHOOK_SECRET', 'User')
.\bin\server-storefront.exe
```

Start the tunnel in another PowerShell terminal:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --config "$env:USERPROFILE\.cloudflared\tokensbeat-sub2api.yml" run tokensbeat-sub2api
```

To rebuild the embedded server, stop it first, run `pnpm build` from
`frontend/`, then run this from `backend/` with Go available on PATH:

```powershell
go build -tags embed -o bin/server-storefront.exe ./cmd/server
```

The server and tunnel currently run as background user processes. Automatic
startup as Windows services is not configured. This computer, PostgreSQL,
WSL Redis, the server, and the tunnel must remain running for the public site
to work. Tunnel HTTPS does not require Caddy or inbound ports 80/443 on this
computer. See Cloudflare's
[local tunnel guide](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/create-local-tunnel/)
and [configuration guide](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/configuration-file/).

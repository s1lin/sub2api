// Deliberately outside the interior redesign. Keep exceptions narrow: new
// interior components are checked automatically, including their script/CSS.
export const uiAllowlist = [
  { pattern: /^views\/(public|auth|setup)\//, reason: 'Public marketing, authentication and setup flows' },
  { pattern: /^views\/(HomeView|KeyUsageView)\.vue$/, reason: 'Standalone public pages' },
  { pattern: /^components\/(brand|docs|auth)\//, reason: 'Public branding, documentation and authentication' },
  { pattern: /^components\/layout\/(AuthLayout|PublicHeader)\.vue$/, reason: 'Public layouts' },
  { pattern: /^components\/payment\/(StripePaymentInline|PaymentQRDialog)\.vue$/, reason: 'Provider-branded Stripe and QR payment blocks' },
  { pattern: /^views\/user\/(StripePopupView|StripePaymentView|PaymentQRCodeView)\.vue$/, reason: 'Provider-branded payment pages' },
]

export const isUiExempt = path => uiAllowlist.some(entry => entry.pattern.test(path.replaceAll('\\', '/')))

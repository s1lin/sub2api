import { chromium } from 'playwright'
import { checkDensity } from './platform-density.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Browser-only fixtures. No account or billing configuration is changed.
const outputRoot = process.env.PLATFORM_OUTPUT_DIR
  ? resolve(process.env.PLATFORM_OUTPUT_DIR) + '/'
  : fileURLToPath(new URL('../../output/kumo/', import.meta.url))
await mkdir(outputRoot, { recursive: true })
const outputPath = name => outputRoot + name
const baseURL = process.env.KUMO_PREVIEW_URL || 'http://127.0.0.1:3002'
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}), headless: true })
const settings = { site_name: 'tokensbeat', site_subtitle: 'Subscription to API Conversion Platform', site_logo: '', doc_url: '', ops_monitoring_enabled: true, payment_enabled: true, subscription_enabled: true, payment_balance_disabled: false, registration_enabled: true, email_verify_enabled: false, password_reset_enabled: true, default_concurrency: 5 }
const user = { created_at: '2026-09-01T00:00:00Z', id: 9001, username: 'Preview account', email: 'preview@example.test', role: 'user', status: 'active', balance: 24.75, concurrency: 5, run_mode: 'normal' }
const group = { id: 3, name: 'Gemini workspace', description: 'Production model access', platform: 'gemini', status: 'active', subscription_type: 'standard', rate_multiplier: 1, account_count: 1, is_exclusive: false, allow_batch_image_generation: true, created_at: user.created_at, updated_at: user.created_at }
const account = { id: 31, name: 'Production gateway', notes: 'Primary model provider', platform: 'gemini', type: 'apikey', credentials: {}, extra: {}, proxy_id: null, concurrency: 5, priority: 1, rate_multiplier: 1, status: 'active', schedulable: true, auto_pause_on_expired: true, created_at: user.created_at, updated_at: user.created_at, group_ids: [3], groups: [group] }
const list = items => ({ items, total: items.length, page: 1, page_size: 20, pages: items.length ? 1 : 0 })
const plans = [
  { id: 7, group_id: 3, name: 'Builder', description: 'Example plan for layout verification.', price: 24, original_price: 0, validity_days: 30, validity_unit: 'day', rate_multiplier: 1, daily_limit_usd: 5, weekly_limit_usd: null, monthly_limit_usd: null, features: ['API access', 'Usage tracking'], group_platform: 'openai', sort_order: 1, for_sale: true, group_name: 'OpenAI' },
  { id: 8, group_id: 4, name: 'Professional development workspace', description: 'A longer plan name to check responsive wrapping.', price: 69, original_price: 79, validity_days: 30, validity_unit: 'day', rate_multiplier: 1, daily_limit_usd: 15, weekly_limit_usd: null, monthly_limit_usd: null, features: ['API access', 'Usage tracking'], group_platform: 'anthropic', sort_order: 2, for_sale: true, group_name: 'Claude' },
]
const stats = Object.fromEntries(['total_api_keys', 'active_api_keys', 'total_requests', 'total_input_tokens', 'total_output_tokens', 'total_cache_creation_tokens', 'total_cache_read_tokens', 'total_tokens', 'total_cost', 'total_actual_cost', 'today_requests', 'today_input_tokens', 'today_output_tokens', 'today_cache_creation_tokens', 'today_cache_read_tokens', 'today_tokens', 'today_cost', 'today_actual_cost', 'average_duration_ms', 'rpm', 'tpm'].map(k => [k, 0]))
const chartTrend = Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-0${index + 1}`, requests: 20 + index * 5, input_tokens: 12000 + index * 3000, output_tokens: 6000 + index * 1500, cache_creation_tokens: 1000, cache_read_tokens: 2000 + index * 1000, total_tokens: 21000 + index * 5500, cost: 3 + index, actual_cost: 2 + index }))
const chartModels = [{ model: 'gemini-2.5-pro', requests: 150, total_tokens: 120000, input_tokens: 70000, output_tokens: 50000, cost: 12, actual_cost: 9 }, { model: 'gpt-4.1', requests: 75, total_tokens: 90000, input_tokens: 60000, output_tokens: 30000, cost: 8, actual_cost: 6 }]
const chartUsers = chartTrend.map(point => ({ ...point, user_id: user.id, username: user.username, email: user.email, tokens: point.total_tokens }))
const results = []
const opsOverview = {
  start_time: '2026-10-08T00:00:00Z', end_time: '2026-10-09T00:00:00Z', platform: '', health_score: 98,
  success_count: 12800, error_count_total: 47, business_limited_count: 20, error_count_sla: 27,
  request_count_total: 12847, request_count_sla: 12827, token_consumed: 1842056, sla: 0.9979,
  error_rate: 0.0021, upstream_error_rate: 0.0012, upstream_error_count_excl_429_529: 15, upstream_429_count: 9, upstream_529_count: 2,
  qps: { current: 12, peak: 38, avg: 8 }, tps: { current: 1430, peak: 3800, avg: 980 },
  duration: { p50_ms: 850, p90_ms: 1800, p95_ms: 2300, p99_ms: 3400, avg_ms: 1100, max_ms: 4500 },
  ttft: { p50_ms: 160, p90_ms: 240, p95_ms: 280, p99_ms: 420, avg_ms: 180, max_ms: 620 },
  system_metrics: { id: 1, created_at: '2026-10-09T00:00:00Z', window_minutes: 1, cpu_usage_percent: 24,
    memory_used_mb: 1240, memory_total_mb: 8192, memory_usage_percent: 15, db_ok: true, redis_ok: true,
    db_max_open_conns: 100, redis_pool_size: 50, redis_conn_total: 16, redis_conn_idle: 12,
    db_conn_active: 8, db_conn_idle: 16, db_conn_waiting: 0, goroutine_count: 128 }, job_heartbeats: [],
}

async function checkInterior(page, errors) {
  const metrics = await page.evaluate(() => {
    const visible = el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0
    const styles = selector => [...document.querySelectorAll(selector)].filter(visible).map(el => {
      const style = getComputedStyle(el)
      return { radius: parseFloat(style.borderTopLeftRadius), shadow: style.boxShadow, border: style.borderTopWidth,
        background: style.backgroundImage, transform: style.textTransform }
    })
    const header = document.querySelector('.platform-header')
    const active = document.querySelector('.sidebar-link-active')
    return {
      panels: styles('main .panel, main .metric-strip'), tables: styles('main .platform-table th'),
      buttons: styles('main :is([data-kumo-component="Button"], .platform-dropdown-trigger, .date-picker-trigger, button[data-kumo-component="Popover"]):not([data-ui-branded] *)'),
      inputs: styles('main :is([data-platform-control="input"], [data-platform-control="textarea"]):not([data-ui-branded] *)'),
      headings: [...document.querySelectorAll('main h1')].filter(visible).length,
      headerBlur: header ? getComputedStyle(header).backdropFilter : null,
      accentWidth: active ? getComputedStyle(active, '::before').width : null,
      metricStrips: [...document.querySelectorAll('main .metric-strip')].map(strip => ({ cells: strip.children.length, width: strip.getBoundingClientRect().width })),
    }
  })
  const elevated = shadow => (shadow.match(/-?[\d.]+px/g) || []).some(value => parseFloat(value) !== 0)
  if (metrics.panels.some(panel => panel.radius > 8 || elevated(panel.shadow))) errors.push('Interior panel radius or shadow violates UI rules')
  if (metrics.buttons.some(button => button.radius > 6 || elevated(button.shadow) || button.background !== 'none')) errors.push('Interior button radius, shadow or gradient violates UI rules')
  if (metrics.inputs.some(input => input.radius > 6 || input.border !== '1px' || elevated(input.shadow))) errors.push('Interior input is missing its flat 1px outline')
  if (metrics.tables.some(cell => cell.transform !== 'uppercase')) errors.push('Table headings are not uppercase')
  if (metrics.headings !== 1) errors.push(`Expected one page title, found ${metrics.headings}`)
  if (metrics.headerBlur !== 'none') errors.push('App header has a blur effect')
  if (metrics.accentWidth && metrics.accentWidth !== '2px') errors.push('Sidebar active accent is not 2px')
  return metrics
}

async function checkSidebarAlignment(page, errors, state) {
  const geometry = await page.locator('.sidebar-link:has(.sidebar-label)').evaluateAll(rows => rows.map(row => {
    const rect = row.getBoundingClientRect(), icon = row.querySelector('svg').getBoundingClientRect()
    const label = row.querySelector('.sidebar-label').getBoundingClientRect()
    return { iconX: icon.x - rect.x, iconY: icon.y - rect.y, labelX: label.x - rect.x, height: rect.height, collapsed: row.classList.contains('sidebar-link-collapsed') }
  }))
  if (!geometry.length) errors.push(`Sidebar is missing (${state})`)
  if (geometry.some(row => Math.abs(row.iconX - (row.collapsed ? 15 : 13)) > .1 || Math.abs(row.iconY - 7) > .1 || row.height !== 32 || (!row.collapsed && Math.abs(row.labelX - 41) > .1))) errors.push(`Sidebar icons or labels are misaligned (${state})`)
  // Measure against the nav because Veaury wraps group buttons in display:contents.
  const childrenAligned = await page.locator('.sidebar-submenu .sidebar-link').evaluateAll(rows => rows.every(row => Math.abs(row.querySelector('svg').getBoundingClientRect().x - row.closest('.sidebar-nav').getBoundingClientRect().x - 46) < .1))
  if (!childrenAligned) errors.push(`Sidebar child indentation differs (${state})`)
}

async function checkDashboard(page, entry, errors) {
  const expectedCharts = entry.admin ? 3 : 2
  await page.waitForFunction(count => document.querySelectorAll('canvas').length === count, expectedCharts)
  const readCharts = async () => {
    await page.waitForFunction(() => [...document.querySelectorAll('canvas')].every(canvas => canvas.getBoundingClientRect().width >= 150 && canvas.width > 0 && canvas.height > 0), undefined, { timeout: 10000 })
    return page.evaluate(async () => {
    const moduleURL = performance.getEntriesByType('resource').find(resource => resource.name.includes('/chart__js.js'))?.name
    const { Chart } = await import(moduleURL)
    return [...document.querySelectorAll('canvas')].map(canvas => {
      const chart = Chart.getChart(canvas), rect = canvas.getBoundingClientRect()
      const pixels = canvas.width && canvas.height ? canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data : []
      let drawn = 0
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) drawn++
      return { width: rect.width, height: rect.height, drawn, type: chart?.config.type, labelColor: chart?.options.scales?.x?.ticks.color, points: chart?.data.datasets[0].data.length }
    })
    })
  }
  const checkCharts = (charts, theme) => {
    if (charts.length !== expectedCharts || charts.some(chart => chart.width < 150 || chart.height < 150 || chart.drawn < 100 || !chart.points)) errors.push(`Dashboard charts are missing or empty (${theme})`)
    if (charts.filter(chart => chart.type === 'line').some(chart => chart.labelColor !== (theme === 'dark' ? '#b0b9af' : '#59615b'))) errors.push(`Chart labels have stale ${theme} theme colors`)
  }
  await page.waitForTimeout(500)
  const initialCharts = await readCharts()
  checkCharts(initialCharts, entry.theme)
  await page.screenshot({ path: resolve(outputPath(entry.name + '-charts.png')), fullPage: true })
  // Exercise the actual theme control, including the mobile navigation drawer.
  const toggle = async dark => {
    if (entry.width < 1024) await page.getByRole('button', { name: entry.locale === 'zh' ? '切换菜单' : 'Toggle menu', exact: true }).click()
    await page.locator('.sidebar').getByRole('button', { name: entry.locale === 'zh' ? (dark ? '浅色模式' : '深色模式') : (dark ? 'Light Mode' : 'Dark Mode'), exact: true }).click()
    if (entry.width < 1024) { await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' }) }
    await page.waitForTimeout(500)
  }
  await toggle(entry.theme === 'dark')
  const alternateTheme = entry.theme === 'dark' ? 'light' : 'dark'
  const alternateCharts = await readCharts()
  checkCharts(alternateCharts, alternateTheme)
  const themeState = await page.evaluate(() => ({ mode: document.documentElement.dataset.mode, persisted: localStorage.getItem('theme'), card: getComputedStyle(document.querySelector('main .card')).backgroundColor }))
  if (themeState.mode !== alternateTheme || themeState.persisted !== alternateTheme || themeState.card !== (alternateTheme === 'dark' ? 'rgb(28, 34, 30)' : 'rgb(255, 255, 255)')) errors.push('Dashboard theme and surface colors disagree')
  await toggle(alternateTheme === 'dark')

  await page.locator('.date-picker-trigger').first().click()
  const calendar = page.locator('.platform-date-picker')
  await calendar.waitFor()
  await page.waitForTimeout(350)
  const metrics = await calendar.evaluate(el => {
    const rect = el.getBoundingClientRect(), days = [...el.querySelectorAll('.rdp-day_button')].map(day => day.getBoundingClientRect())
    const center = document.elementFromPoint(rect.x + rect.width / 2, Math.max(rect.y + 30, 30))
    return { viewportFits: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight, unoccluded: el.contains(center), width: rect.width, height: rect.height, smallestDay: Math.min(...days.map(day => Math.min(day.width, day.height))), background: getComputedStyle(el).backgroundColor, overflow: el.scrollWidth > el.clientWidth }
  })
  if (!metrics.viewportFits || !metrics.unoccluded || metrics.smallestDay < 32 || metrics.overflow) errors.push('Calendar is clipped, obscured, or has undersized date cells')
  if (metrics.background !== (entry.theme === 'dark' ? 'rgb(28, 34, 30)' : 'rgb(255, 255, 255)')) errors.push('Calendar uses the wrong theme surface')
  await page.screenshot({ path: resolve(outputPath(entry.name + '-calendar.png')) })

  await calendar.getByRole('button', { name: entry.locale === 'zh' ? '上月' : 'Last Month', exact: true }).click()
  await page.waitForTimeout(100)
  const start = await calendar.locator('input[type="date"]').first().inputValue()
  if (!await calendar.locator(`[data-day="${start}"][aria-selected="true"]`).count()) errors.push('Calendar did not follow the selected month preset')
  const previousMonth = start.slice(0, 7)
  await calendar.locator('.rdp-button_previous').click()
  await page.waitForTimeout(100)
  if (await calendar.locator(`[data-day="${start}"]:not([data-outside])`).count()) errors.push('Previous month navigation did not change the grid')
  await calendar.locator('.rdp-button_next').click()
  const customStart = `${previousMonth}-03`, customEnd = `${previousMonth}-06`
  await calendar.locator(`[data-day="${customStart}"] button`).click()
  await calendar.locator(`[data-day="${customEnd}"] button`).click()
  const dates = await calendar.locator('input[type="date"]').evaluateAll(nodes => nodes.map(node => node.value))
  if (dates[0] !== customStart || dates[1] !== customEnd) errors.push('Clicking calendar dates did not update the range')
  const focusedDay = calendar.locator(`[data-day="${customEnd}"] button`)
  await focusedDay.focus()
  await page.keyboard.press('ArrowRight')
  if (await page.evaluate(() => document.activeElement?.closest('[data-day]')?.getAttribute('data-day')) !== `${previousMonth}-07`) errors.push('Calendar keyboard navigation failed')
  await calendar.locator('.date-picker-apply').click()
  await calendar.waitFor({ state: 'hidden' })
  await page.locator('.date-picker-trigger').first().click()
  await calendar.waitFor()
  const applied = await calendar.locator('input[type="date"]').evaluateAll(nodes => nodes.map(node => node.value))
  if (applied[0] !== customStart || applied[1] !== customEnd) errors.push('Applied date range was not retained')
  await page.keyboard.press('Escape')
  await calendar.waitFor({ state: 'hidden' })
  console.log(JSON.stringify({ name: entry.name, initialCharts, alternateCharts, themeState, calendar: metrics, applied }))
}

try {
  const routes = [
    ['storefront', '/', '.storefront'],
    ['dashboard', '/dashboard', '.workspace-intro'],
    ['keys', '/keys', 'main .table-page-layout'],
    ['usage', '/usage', 'main .card'],
    ['profile', '/profile', '[data-testid="profile-overview-hero"]'],
    ['redeem', '/redeem', 'main input'],
    ['subscriptions', '/subscriptions', 'main'],
    ['orders', '/orders', 'main'],
    ['checkout', '/purchase?tab=recharge', 'main input'],
    ['batch-image', '/batch-image', 'main .table-page-layout'],
    ['admin-dashboard', '/admin/dashboard', 'main .card'],
    ['admin-users', '/admin/users', 'main .table-page-layout'],
    ['admin-groups', '/admin/groups', 'main .table-page-layout'],
    ['admin-accounts', '/admin/accounts', 'main .table-page-layout'],
    ['admin-subscriptions', '/admin/subscriptions', 'main .table-page-layout'],
    ['admin-settings', '/admin/settings', 'main form'],
    ['admin-ops', '/admin/ops', 'main input'],
    ['not-found', '/nonexistent-design-check', '.not-found']
  ];
  const entries = routes.flatMap(([name, route, ready]) => [
    { name: name + '-desktop-light', route, ready, width: 1440, height: 900, theme: 'light', locale: 'en', auth: !['storefront', 'not-found'].includes(name), admin: name.startsWith('admin-') },
    { name: name + '-mobile-dark', route, ready, width: 390, height: 844, theme: 'dark', locale: 'zh', auth: !['storefront', 'not-found'].includes(name), admin: name.startsWith('admin-') }
  ]);
  if (process.env.PLATFORM_UI_AUDIT) {
    for (const [name, route, ready] of routes) {
      entries.push({ name: name + '-desktop-dark', route, ready, width: 1440, height: 900, theme: 'dark', locale: 'en', auth: !['storefront', 'not-found'].includes(name), admin: name.startsWith('admin-') })
    }
  }
  if (process.env.PLATFORM_CHARTS) {
    for (const [name, route, ready] of routes.filter(([name]) => name === 'dashboard' || name === 'admin-dashboard')) {
      entries.push({ name: name + '-narrow-light', route, ready, width: 320, height: 700, theme: 'light', locale: 'en', auth: true, admin: name.startsWith('admin-') })
    }
  }
  if (process.env.PLATFORM_DENSITY) {
    for (const [name, route, ready] of routes.filter(([name]) => ['keys', 'admin-accounts', 'admin-ops', 'admin-dashboard'].includes(name))) {
      entries.push({ name: name + '-laptop-dark', route, ready, width: 1024, height: 768, theme: 'dark', locale: 'en', auth: true, admin: name.startsWith('admin-') })
    }
  }
  const selected = process.env.PLATFORM_CASES ? entries.filter(entry => process.env.PLATFORM_CASES.split(',').some(name => entry.name.startsWith(name))) : entries
  for (const entry of selected) {
    const context = await browser.newContext({ viewport: { width: entry.width, height: entry.height }, colorScheme: entry.theme, reducedMotion: 'reduce' })
    await context.addInitScript(({ entry, user }) => {
      // The Vite preview loads more modules than the default 250-entry buffer.
      performance.setResourceTimingBufferSize(5000)
      localStorage.setItem('theme', entry.theme)
      localStorage.setItem('sub2api_locale', entry.locale)
      if (entry.auth) {
        localStorage.setItem('auth_token', 'visual-fixture-only')
        localStorage.setItem('auth_user', JSON.stringify({ ...user, role: entry.admin ? 'admin' : 'user' }))
      }
    }, { entry, user })
    const page = await context.newPage()
    const errors = [], unknown = [], writes = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (/\[Kumo (Input|Checkbox|Textarea)\].*accessible name/.test(message.text())) {
        const warning = message.text().split('\n')[0]
        if (!errors.includes(warning)) errors.push(warning)
      }
    })
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url())
      // Fixtures use the existing local-token session path. Disable Clerk only
      // in this browser response, independent of the developer's .env.local.
      if (url.origin === baseURL && url.pathname === '/src/auth/clerk.ts') {
        const response = await route.fetch()
        const body = (await response.text()).replace(/export const clerkEnabled = [^;]+;/, 'export const clerkEnabled = false;')
        return route.fulfill({ response, body })
      }
      if (request.isNavigationRequest() && request.resourceType() === 'document' && url.origin === baseURL) {
        const response = await route.fetch()
        const body = (await response.text()).replace(/window\.__APP_CONFIG__=.*?;<\/script>/, `window.__APP_CONFIG__=${JSON.stringify(settings)};</script>`)
        return route.fulfill({ response, body })
      }
      if (url.pathname.startsWith('/api/') || url.pathname === '/setup/status') {
        // This read-only batch endpoint uses POST for its ID list. Keep it in the browser fixture.
        if (url.pathname === '/api/v1/usage/dashboard/api-keys-usage') return route.fulfill({ json: { code: 0, data: { stats: {} } } })
        if (['/api/v1/admin/accounts/usage/batch', '/api/v1/admin/accounts/today-stats/batch', '/api/v1/admin/users/usage-stats'].includes(url.pathname)) return route.fulfill({ json: { code: 0, data: { stats: {}, accounts: {} } } })
        if (request.method() !== 'GET') { writes.push(request.method() + ' ' + url.pathname); return route.fulfill({ status: 405, json: { code: 405, message: 'Visual preview is read only' } }) }
        let data
        const path = url.pathname.replace('/api/v1', '')
        if (path === '/settings/public') data = settings
        else if (path === '/setup/status') data = { needs_setup: false }
        else if (path === '/auth/me' || path === '/user/profile') data = { ...user, role: entry.admin ? 'admin' : 'user' }
        else if (path === '/payment/public/plans' || path === '/payment/plans') data = plans
        else if (path === '/payment/checkout-info') data = { methods: { stripe: { currency: 'USD', display_name: 'Card', daily_limit: 0, daily_used: 0, daily_remaining: 0, single_min: 1, single_max: 5000, fee_rate: 0, available: true } }, plans, global_min: 1, global_max: 5000, balance_disabled: false, balance_recharge_multiplier: 1, subscription_usd_to_cny_rate: 0, recharge_fee_rate: 0, help_text: '', help_image_url: '', stripe_publishable_key: '' }
        else if (path === '/admin/dashboard/stats') data = { ...stats, total_accounts: 0, normal_accounts: 0, error_accounts: 0, today_new_users: 0, total_users: 0, total_groups: 0 }
        else if (path === '/admin/dashboard/snapshot-v2') data = { stats: { ...stats, total_accounts: 0, normal_accounts: 0, error_accounts: 0, today_new_users: 0, total_users: 0, total_groups: 0, uptime: 86400 }, trend: chartTrend, models: chartModels, groups: [], users_trend: chartUsers }
        else if (path === '/admin/dashboard/users-ranking') data = { items: [], total_actual_cost: 0, total_requests: 0, total_tokens: 0 }
        else if (path === '/usage/dashboard/stats') data = stats
        else if (path === '/usage/dashboard/trend') data = { trend: chartTrend }
        else if (path === '/usage/dashboard/models') data = { models: chartModels }
        else if (path === '/keys') data = { items: [{ id: 1001, name: 'Development workspace', key: 'sk-visual-fixture', status: 'active', group_id: 3, group: { id: 3, name: 'Gemini', platform: 'gemini', allow_batch_image_generation: true }, quota: 50, quota_used: 4.5, created_at: '2026-10-01T08:00:00Z', last_used_at: null }], total: 1, page: 1, page_size: 20, pages: 1 }
        else if (['/groups/available', '/admin/groups/all'].includes(path)) data = [{ id: 3, name: 'Gemini', platform: 'gemini', allow_batch_image_generation: true, status: 'active' }]
        else if (path === '/groups/rates') data = {}
        else if (path === '/usage/stats') data = { ...stats, total_requests: 0, total_tokens: 0, total_actual_cost: 0, total_cost: 0 }
        else if (path === '/usage/dashboard/snapshot-v2') data = { stats, trend: chartTrend, models: chartModels, groups: [] }
        else if (['/redeem/history', '/payment/orders/my'].includes(path)) data = { items: [], total: 0, page: 1, page_size: 20, pages: 0 }
        else if (path === '/usage') data = { items: [], total: 0, page: 1, page_size: 20, pages: 0 }
        else if (path === '/subscriptions/summary') data = { active_count: 0, subscriptions: [] }
        else if (path.includes('platform-quotas')) data = { platform_quotas: [] }
        else if (path.startsWith('/subscriptions') || path.startsWith('/announcements')) data = []
        else if (path === '/user/profile/identities') data = { identities: [], primary_identity: null }
        else if (path.includes('/dashboard/trend')) data = { trend: chartTrend }
        else if (path.includes('/dashboard/models')) data = { models: chartModels }
        else if (path.includes('/dashboard/users-trend')) data = { trend: chartUsers, users: [user] }
        else if (path.includes('/dashboard/users-spending-ranking')) data = { items: [], total_actual_cost: 0, total_requests: 0, total_tokens: 0 }
        else if (path === '/admin/settings') data = settings
        else if (path === '/admin/settings/email-templates') data = { events: [], locales: ['en', 'zh'], placeholders: [] }
        else if (path === '/admin/backups/image-storage') data = { config: { enabled: false, reuse_backup_s3: true, prefix: 'images/', region: 'auto' }, secret_configured: false }
        else if (path === '/admin/backups/s3-config') data = { enabled: false, prefix: 'backups/', region: 'auto' }
        else if (path === '/admin/backups/schedule') data = { enabled: false, cron_expr: '0 2 * * *', retain_days: 7, retain_count: 10 }
        else if (path === '/admin/backups') data = { items: [] }
        else if (path === '/admin/users') data = list([{ ...user, notes: 'Video production team', allowed_groups: [3], group_rates: {}, rpm_limit: 60 }])
        else if (path === '/admin/groups') data = list([group])
        else if (path === '/admin/accounts') data = list([account])
        else if (path === '/admin/ops/advanced-settings') data = { data_retention: { cleanup_enabled: true, cleanup_schedule: '0 2 * * *', error_log_retention_days: 30, minute_metrics_retention_days: 7, hourly_metrics_retention_days: 90 }, aggregation: { aggregation_enabled: true }, openai_account_quota_auto_pause: { default_threshold_5h: 0, default_threshold_7d: 0 }, display_alert_events: true, display_openai_token_stats: !!process.env.PLATFORM_DENSITY, auto_refresh_enabled: false, auto_refresh_interval_seconds: 30 }
        else if (path === '/admin/ops/runtime/alert') data = { evaluation_interval_seconds: 60, distributed_lock: { enabled: true, key: 'ops:preview', ttl_seconds: 30 }, silencing: { enabled: false, global_until_rfc3339: '', global_reason: '', entries: [] }, thresholds: { sla_percent_min: 99.5, ttft_p99_ms_max: 500, request_error_rate_percent_max: 5, upstream_error_rate_percent_max: 5 } }
        else if (path === '/admin/ops/email-notification/config') data = { alert: { enabled: false, recipients: [], min_severity: 'P1', rate_limit_per_hour: 10, batching_window_seconds: 60 }, report: { enabled: false, recipients: [], daily_summary_enabled: true, daily_summary_schedule: '0 9 * * *', weekly_summary_enabled: true, weekly_summary_schedule: '0 9 * * 1' } }
        else if (path === '/admin/ops/runtime/logging') data = { level: 'info', persist_access_logs: false, enable_sampling: false, sampling_initial: 100, sampling_thereafter: 100, caller: true, stacktrace_level: 'error', retention_days: 30, request_retention_days: 90 }
        else if (path === '/admin/ops/dashboard/openai-token-stats') data = { time_range: '30d', start_time: '2026-09-08T00:00:00Z', end_time: '2026-10-08T00:00:00Z', total: 1, items: [{ model: 'gpt-4.1-production', request_count: 12847, avg_tokens_per_sec: 83.42, avg_first_token_ms: 247.18, total_output_tokens: 1842056, avg_duration_ms: 1534, requests_with_first_token: 12790 }] }
        else if (path === '/admin/ops/dashboard/snapshot-v2') data = { overview: process.env.PLATFORM_OPS_DATA ? opsOverview : null, throughput_trend: { points: [], by_platform: [], top_groups: [] }, error_trend: { points: [] } }
        else if (path.startsWith('/admin/ops/')) data = path.includes('alert-events') || path.includes('alert-rules') ? [] : { points: [], buckets: [], items: [], accounts: [], groups: [], platforms: [], users: [], total: 0, page: 1, page_size: 20 }
        else if (path === '/admin/system/version') data = { version: 'design-preview', build_type: 'source' }
        else if (path === '/user/batch-image/access') data = { allowed: true }
        else if (/^\/(admin\/)?(users|groups|accounts|subscriptions|payment\/orders|redeem|batch-image\/jobs)$/.test(path)) data = { items: [], total: 0, page: 1, page_size: 20, pages: 0 }
        else { unknown.push(path); data = [] }
        return route.fulfill({ json: { code: 0, data } })
      }
      return route.continue()
    })
    await page.goto(baseURL + entry.route, { waitUntil: 'domcontentloaded' })
    let ready = true
    await page.locator(entry.ready).first().waitFor({ timeout: 15000 }).catch(() => { ready = false })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(1000)
    if (process.env.PLATFORM_CHARTS && entry.name.includes('dashboard-')) {
      await checkDashboard(page, entry, errors)
    }
    if (entry.auth) {
      if (process.env.PLATFORM_UI_AUDIT) console.log(JSON.stringify({ name: entry.name, interior: await checkInterior(page, errors) }))
      if (process.env.PLATFORM_DENSITY) await checkDensity(page, errors, entry.name)
      const layout = await page.evaluate(() => {
        const boxes = element => {
          if (getComputedStyle(element).display === 'none') return []
          if (getComputedStyle(element).display === 'contents') return [...element.children].flatMap(boxes)
          const rect = element.getBoundingClientRect()
          return rect.height && rect.width ? [rect] : []
        }
        const stack = document.querySelector('main .space-y-6')
        const rows = stack ? [...stack.children].flatMap(boxes) : []
        return {
          sidebarBrand: document.querySelector('.sidebar-brand')?.textContent.trim(),
          borders: [...document.querySelectorAll('main .card')].map(card => ({ width: getComputedStyle(card).borderTopWidth, shadow: getComputedStyle(card).boxShadow })),
          gaps: rows.slice(1).map((row, i) => Math.round(row.top - rows[i].bottom)),
          nav: [...document.querySelectorAll('.sidebar-link, .platform-nav-control')].filter(el => el.getBoundingClientRect().width).map(el => {
            const style = getComputedStyle(el)
            return { text: el.textContent.trim(), sidebar: !!el.closest('.sidebar'), font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight, icons: [...el.querySelectorAll('svg')].filter(icon => icon.getBoundingClientRect().width).map(icon => ({ size: icon.getBoundingClientRect().width, chevron: !!icon.closest('.sidebar-label') || icon.classList.contains('platform-nav-chevron') })) }
          }),
          sidebarRows: [...document.querySelectorAll('.sidebar-link:has(.sidebar-label)')].map(el => {
            const rect = el.getBoundingClientRect(), icon = el.querySelector('svg')?.getBoundingClientRect(), label = el.querySelector('.sidebar-label')?.getBoundingClientRect()
            return { text: el.textContent.trim(), tag: el.tagName, x: rect.x, height: rect.height, iconX: icon?.x, labelX: label?.x, padding: getComputedStyle(el).padding, border: getComputedStyle(el).borderWidth }
          }),
          tables: [...document.querySelectorAll('main table')].map(table => ({
            compact: table.classList.contains('platform-chart-table'),
            selection: table.querySelector('.sticky-col-left-first') ? { width: table.querySelector('.sticky-col-left-first').getBoundingClientRect().width, offset: getComputedStyle(table.querySelector('.sticky-col-left-second')).left } : null,
            headings: [...table.querySelectorAll('thead th')].map(el => ({ text: el.textContent.trim(), size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight, line: getComputedStyle(el).lineHeight })),
            cells: [...table.querySelectorAll('tbody td')].slice(0, 24).map(el => ({ text: el.textContent.trim().slice(0, 100), actions: el.classList.contains('platform-table-actions'), size: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight })),
          })),
          mobileHeadings: [...document.querySelectorAll('.platform-table-heading')].map(el => ({ size: getComputedStyle(el).fontSize, weight: getComputedStyle(el).fontWeight, line: getComputedStyle(el).lineHeight })),
          mobileCells: [...document.querySelectorAll('.platform-table-cell')].map(el => ({ size: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight })),
          actions: [...document.querySelectorAll('.platform-table-actions button:not([role])')].map(button => {
            const rect = button.getBoundingClientRect(), style = getComputedStyle(button)
            return { text: button.textContent.trim(), size: style.fontSize, line: style.lineHeight, direction: style.flexDirection, height: rect.height, overflow: button.scrollWidth > button.clientWidth || button.scrollHeight > button.clientHeight, icons: [...button.querySelectorAll('svg')].map(icon => ({ size: icon.getBoundingClientRect().width, height: icon.getBoundingClientRect().height })) }
          }),
        }
      })
      if (layout.sidebarBrand != null && layout.sidebarBrand !== settings.site_name) errors.push('Sidebar includes content beyond the brand name')
      if (layout.borders.some(border => parseFloat(border.width) > 1 || (border.shadow.match(/-?[\d.]+px/g) || []).some(value => parseFloat(value) !== 0))) errors.push('Card has a doubled outline')
      if (['dashboard', 'admin-dashboard'].some(name => entry.name.startsWith(name + '-')) && layout.gaps.some(gap => Math.abs(gap - 16) > 1)) errors.push('Dashboard section gaps differ: ' + layout.gaps.join(', '))
      if (layout.nav.some(item => item.size !== '13px' || item.weight !== '500' || item.lineHeight !== '20px') || new Set(layout.nav.map(item => item.font)).size > 1) errors.push('Navigation typography is inconsistent')
      if (layout.nav.some(item => item.icons.some(icon => Math.abs(icon.size - (icon.chevron ? 14 : (item.sidebar ? 18 : 16))) > 0.1))) errors.push('Navigation icon sizes are inconsistent')
      if ([...layout.tables.flatMap(table => table.headings), ...layout.mobileHeadings].some(heading => heading.size !== '12px' || heading.weight !== '500' || heading.line !== '16px')) errors.push('Table heading typography is inconsistent')
      if ([...layout.tables.filter(table => !table.compact).flatMap(table => table.cells).filter(cell => !cell.actions), ...layout.mobileCells].some(cell => cell.size !== '13px' || cell.line !== '20px')) errors.push('Table body typography is inconsistent')
      if (layout.actions.some(action => action.size !== '12px' || action.line !== '16px' || action.direction !== 'row' || action.height < 32 || action.overflow || action.icons.some(icon => icon.size !== 16 || icon.height !== 16))) errors.push('Table action icons, text, or alignment are inconsistent')
      if (layout.tables.some(table => table.selection && Math.abs(table.selection.width - parseFloat(table.selection.offset)) > .1)) errors.push('Table selection column and sticky offset differ')
      if (entry.name.startsWith('admin-accounts-') && await page.locator('main').innerText().then(text => text.includes('class="relative'))) errors.push('Account group cell contains stray markup')
      if (entry.width >= 1024) await checkSidebarAlignment(page, errors, 'expanded')
      console.log(JSON.stringify({ name: entry.name, layout }))
    }
    if (entry.name.startsWith('admin-users-')) {
      const mobile = entry.width < 1024
      if (mobile) await page.getByRole('button', { name: '切换菜单', exact: true }).click()
      await page.locator('.sidebar').waitFor()
      const groupTrigger = page.locator('.sidebar-link[aria-expanded]').first()
      await groupTrigger.click()
      await page.locator('.sidebar-submenu').first().waitFor()
      await checkSidebarAlignment(page, errors, 'submenu open')
      await page.screenshot({ path: resolve(outputPath(`sidebar-submenus-${entry.theme}.png`)) })
      await groupTrigger.click()
      await page.locator('.sidebar-submenu').first().waitFor({ state: 'hidden' })
      await checkSidebarAlignment(page, errors, 'submenu closed')
      if (mobile) {
        await page.keyboard.press('Escape')
        await page.getByRole('dialog').waitFor({ state: 'hidden' })
      } else {
        await page.locator('.sidebar').getByRole('button', { name: 'Collapse', exact: true }).click()
        await page.waitForTimeout(300)
        await checkSidebarAlignment(page, errors, 'sidebar collapsed')
        await page.screenshot({ path: resolve(outputPath('sidebar-collapsed.png')) })
        await page.locator('.sidebar').getByRole('button', { name: 'Expand', exact: true }).click()
        await page.waitForTimeout(300)
      }
    }
    if (entry.name === 'admin-subscriptions-desktop-light') {
      await page.getByRole('button', { name: 'Assign Subscription', exact: true }).first().click()
      await page.getByRole('dialog').waitFor()
      await page.locator('[data-assign-user-search] input[role="combobox"]').fill('preview')
      await page.keyboard.press('Escape')
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
    }
    if (entry.name.startsWith('admin-ops-')) {
      const zh = entry.locale === 'zh'
      await page.getByRole('button', { name: zh ? '运维监控设置' : 'Ops Monitoring Settings', exact: true }).click()
      const settingsDialog = page.getByRole('dialog')
      await settingsDialog.locator('input[aria-label]').first().waitFor()
      if (await settingsDialog.locator('input[data-platform-control="input"]:not([aria-label])').count()) errors.push('Ops settings contain unnamed inputs')
      await page.screenshot({ path: resolve(outputPath(`ops-settings-${entry.theme}.png`)), fullPage: true })
      await page.keyboard.press('Escape')
      await settingsDialog.waitFor({ state: 'hidden' })
      await page.getByRole('button', { name: zh ? '告警规则' : 'Alert Rules', exact: true }).click()
      await page.getByRole('button', { name: zh ? '新建规则' : 'Create Rule', exact: true }).click()
      const ruleDialog = page.getByRole('dialog', { name: zh ? '新建告警规则' : 'Create Alert Rule', exact: true })
      await ruleDialog.locator('input[aria-label]').first().waitFor()
      const checkboxes = ruleDialog.getByRole('checkbox')
      if (await checkboxes.count() !== 2) errors.push('Alert rule controls did not render')
      for (const checkbox of await checkboxes.all()) {
        if (!(await checkbox.getAttribute('aria-label'))?.trim()) errors.push('Alert rule checkbox has no accessible name')
      }
      await page.keyboard.press('Escape')
      await ruleDialog.waitFor({ state: 'hidden' })
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
    }
    if (entry.name === 'dashboard-mobile-dark') {
      const trigger = page.getByRole('button', { name: '切换菜单', exact: true });
      await trigger.click();const drawer = page.getByRole('dialog');await drawer.waitFor();
      const rect = await drawer.boundingBox();if(rect.x < 0 || rect.x+rect.width > entry.width || rect.y < 0) errors.push('Drawer exceeds viewport');
      await page.screenshot({path:resolve(outputPath('mobile-navigation.png'))});
      await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
      if(!await trigger.evaluate(el=>el===document.activeElement)) errors.push('Drawer did not restore focus');
      await trigger.click();await drawer.waitFor();await page.setViewportSize({width:1280,height:900});await drawer.waitFor({state:'hidden'});
      if(!await page.locator('.sidebar').isVisible()) errors.push('Desktop navigation missing after resize');
      await page.setViewportSize({width:entry.width,height:entry.height});
    }
    if (entry.name.startsWith('storefront-')) {
      const trigger = page.locator('.faq-list button').first();
      await trigger.click();
      if (await trigger.getAttribute('aria-expanded') !== 'true') errors.push('FAQ did not open');
      await trigger.click();
      if (await trigger.getAttribute('aria-expanded') !== 'false') errors.push('FAQ did not close');
    }
    if (entry.name === 'keys-desktop-light') {
      await page.locator('.skip-link').focus()
      await page.keyboard.press('Enter')
      if (await page.evaluate(() => document.activeElement?.id) !== 'main-content') errors.push('Skip link did not focus content')
      await page.getByRole('button', { name: 'Create API Key', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor()
      await page.screenshot({ path: resolve(outputPath('key-dialog-light.png')), fullPage: true })
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden' })
    }
    await page.waitForTimeout(250)
    const unnamed = await page.locator('[data-platform-control="input"], [data-platform-control="textarea"], [data-platform-control="checkbox"]').evaluateAll(nodes => nodes.filter(node => {
      const labelledBy = (node.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim()
      return !node.getAttribute('aria-label')?.trim() && !labelledBy && !Array.from(node.labels || []).some(label => label.textContent.trim())
    }).map(node => ({ tag: node.tagName, type: node.getAttribute('type'), placeholder: node.getAttribute('placeholder'), html: node.outerHTML.slice(0, 700) })))
    if (unnamed.length) errors.push(`${unnamed.length} controls have no accessible name`)
    await page.screenshot({ path: resolve(outputRoot + entry.name + '.png'), fullPage: true })
    if (entry.width >= 1024 && await page.locator('.platform-table-actions').count()) {
      await page.locator('.table-wrapper').evaluateAll(wrappers => wrappers.forEach(wrapper => { wrapper.scrollLeft = wrapper.scrollWidth }))
      await page.waitForTimeout(100)
      const aligned = await page.locator('.table-wrapper').evaluateAll(wrappers => wrappers.every(wrapper => {
        const row = wrapper.querySelector('tbody tr[data-index]')
        if (!row) return true
        const headings = [...wrapper.querySelectorAll('thead th')], cells = [...row.querySelectorAll('td')]
        return headings.every((heading, index) => Math.abs(heading.getBoundingClientRect().x - cells[index].getBoundingClientRect().x) < 1)
          && [...row.querySelectorAll('.sticky-col')].every(cell => getComputedStyle(cell).position === 'sticky')
      }))
      if (!aligned) errors.push('Table headers and pinned cells lose alignment when scrolling')
      await page.screenshot({ path: resolve(outputPath(entry.name + '-actions.png')), fullPage: true })
    }
    const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light', heading: document.querySelector('h1')?.textContent, primary: getComputedStyle(document.querySelector('.btn-primary, .brand-button') || document.body).backgroundColor }))
    results.push({ ...entry, ready, ...metrics, errors, unknown, writes, unnamed, actualRoute: new URL(page.url()).pathname })
    if (metrics.overflow) console.log(JSON.stringify({ name: entry.name, overflowingElements: await page.locator('main *, .platform-header *').evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 16).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.slice(0, 60), width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right, whiteSpace: getComputedStyle(el).whiteSpace }))) }))
    console.log(JSON.stringify(results.at(-1)))
    await context.close()
  }
} finally { await browser.close() }
await writeFile(outputPath('') + (process.env.PLATFORM_CASES ? 'focused-checks.json' : 'fixture-checks.json'), JSON.stringify(results, null, 2))
if (results.some(r => !r.ready || r.overflow || r.errors.length || r.writes.length)) process.exitCode = 1

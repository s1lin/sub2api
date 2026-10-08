import { chromium } from 'playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Browser-only fixtures. No account or billing configuration is changed.
const outputRoot = fileURLToPath(new URL('../../output/kumo/', import.meta.url))
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
const results = []

async function checkSidebarAlignment(page, errors, state) {
  const geometry = await page.locator('.sidebar-link:has(.sidebar-label)').evaluateAll(rows => rows.map(row => {
    const rect = row.getBoundingClientRect(), icon = row.querySelector('svg').getBoundingClientRect()
    const label = row.querySelector('.sidebar-label').getBoundingClientRect()
    return { iconX: icon.x - rect.x, iconY: icon.y - rect.y, labelX: label.x - rect.x, height: rect.height, collapsed: row.classList.contains('sidebar-link-collapsed') }
  }))
  if (!geometry.length) errors.push(`Sidebar is missing (${state})`)
  if (geometry.some(row => Math.abs(row.iconX - (row.collapsed ? 14 : 17)) > .1 || Math.abs(row.iconY - 10) > .1 || row.height !== 40 || (!row.collapsed && Math.abs(row.labelX - 49) > .1))) errors.push(`Sidebar icons or labels are misaligned (${state})`)
  // Measure against the nav because Veaury wraps group buttons in display:contents.
  const childrenAligned = await page.locator('.sidebar-submenu .sidebar-link').evaluateAll(rows => rows.every(row => Math.abs(row.querySelector('svg').getBoundingClientRect().x - row.closest('.sidebar-nav').getBoundingClientRect().x - 54) < .1))
  if (!childrenAligned) errors.push(`Sidebar child indentation differs (${state})`)
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
  const selected = process.env.PLATFORM_CASES ? entries.filter(entry => process.env.PLATFORM_CASES.split(',').some(name => entry.name.startsWith(name))) : entries
  for (const entry of selected) {
    const context = await browser.newContext({ viewport: { width: entry.width, height: entry.height }, colorScheme: entry.theme, reducedMotion: 'reduce' })
    await context.addInitScript(({ entry, user }) => {
      localStorage.setItem('theme', entry.theme)
      localStorage.setItem('sub2api_locale', entry.locale)
      if (entry.auth) {
        localStorage.setItem('auth_token', 'visual-fixture-only')
        localStorage.setItem('auth_user', JSON.stringify({ ...user, role: entry.admin ? 'admin' : 'user' }))
        localStorage.setItem('admin_guide_9001_admin_v4_interactive', 'true')
        localStorage.setItem('user_guide_9001_user_v4_interactive', 'true')
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
        else if (path === '/admin/dashboard/snapshot-v2') data = { stats: { ...stats, total_accounts: 0, normal_accounts: 0, error_accounts: 0, today_new_users: 0, total_users: 0, total_groups: 0, uptime: 86400 }, trend: [], models: [], groups: [], users_trend: [] }
        else if (path === '/admin/dashboard/users-ranking') data = { items: [], total_actual_cost: 0, total_requests: 0, total_tokens: 0 }
        else if (path === '/usage/dashboard/stats') data = stats
        else if (path === '/usage/dashboard/trend') data = { trend: [] }
        else if (path === '/usage/dashboard/models') data = { models: [] }
        else if (path === '/keys') data = { items: [{ id: 1001, name: 'Development workspace', key: 'sk-visual-fixture', status: 'active', group_id: 3, group: { id: 3, name: 'Gemini', platform: 'gemini', allow_batch_image_generation: true }, quota: 50, quota_used: 4.5, created_at: '2026-10-01T08:00:00Z', last_used_at: null }], total: 1, page: 1, page_size: 20, pages: 1 }
        else if (['/groups/available', '/admin/groups/all'].includes(path)) data = [{ id: 3, name: 'Gemini', platform: 'gemini', allow_batch_image_generation: true, status: 'active' }]
        else if (path === '/groups/rates') data = {}
        else if (path === '/usage/stats') data = { ...stats, total_requests: 0, total_tokens: 0, total_actual_cost: 0, total_cost: 0 }
        else if (path === '/usage/dashboard/snapshot-v2') data = { stats, trend: [], models: [], groups: [] }
        else if (['/redeem/history', '/payment/orders/my'].includes(path)) data = { items: [], total: 0, page: 1, page_size: 20, pages: 0 }
        else if (path === '/usage') data = { items: [], total: 0, page: 1, page_size: 20, pages: 0 }
        else if (path === '/subscriptions/summary') data = { active_count: 0, subscriptions: [] }
        else if (path.includes('platform-quotas')) data = { platform_quotas: [] }
        else if (path.startsWith('/subscriptions') || path.startsWith('/announcements')) data = []
        else if (path === '/user/profile/identities') data = { identities: [], primary_identity: null }
        else if (path.includes('/dashboard/trend')) data = { trend: [] }
        else if (path.includes('/dashboard/models')) data = { models: [] }
        else if (path.includes('/dashboard/users-trend')) data = { trend: [], users: [] }
        else if (path.includes('/dashboard/users-spending-ranking')) data = { items: [], total_actual_cost: 0, total_requests: 0, total_tokens: 0 }
        else if (path === '/admin/settings') data = settings
        else if (path === '/admin/users') data = list([{ ...user, notes: 'Video production team', allowed_groups: [3], group_rates: {}, rpm_limit: 60 }])
        else if (path === '/admin/groups') data = list([group])
        else if (path === '/admin/accounts') data = list([account])
        else if (path === '/admin/ops/advanced-settings') data = { data_retention: { cleanup_enabled: true, cleanup_schedule: '0 2 * * *', error_log_retention_days: 30, minute_metrics_retention_days: 7, hourly_metrics_retention_days: 90 }, aggregation: { aggregation_enabled: true }, openai_account_quota_auto_pause: { default_threshold_5h: 0, default_threshold_7d: 0 }, display_alert_events: true, display_openai_token_stats: false, auto_refresh_enabled: false, auto_refresh_interval_seconds: 30 }
        else if (path === '/admin/ops/runtime/alert') data = { evaluation_interval_seconds: 60, distributed_lock: { enabled: true, key: 'ops:preview', ttl_seconds: 30 }, silencing: { enabled: false, global_until_rfc3339: '', global_reason: '', entries: [] }, thresholds: { sla_percent_min: 99.5, ttft_p99_ms_max: 500, request_error_rate_percent_max: 5, upstream_error_rate_percent_max: 5 } }
        else if (path === '/admin/ops/email-notification/config') data = { alert: { enabled: false, recipients: [], min_severity: 'P1', rate_limit_per_hour: 10, batching_window_seconds: 60 }, report: { enabled: false, recipients: [], daily_summary_enabled: true, daily_summary_schedule: '0 9 * * *', weekly_summary_enabled: true, weekly_summary_schedule: '0 9 * * 1' } }
        else if (path === '/admin/ops/runtime/logging') data = { level: 'info', persist_access_logs: false, enable_sampling: false, sampling_initial: 100, sampling_thereafter: 100, caller: true, stacktrace_level: 'error', retention_days: 30, request_retention_days: 90 }
        else if (path === '/admin/ops/dashboard/snapshot-v2') data = { overview: null, throughput_trend: { points: [], by_platform: [], top_groups: [] }, error_trend: { points: [] } }
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
    await page.waitForTimeout(350)
    if (entry.auth) {
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
            return { text: el.textContent.trim(), font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight, icons: [...el.querySelectorAll('svg')].filter(icon => icon.getBoundingClientRect().width).map(icon => ({ size: icon.getBoundingClientRect().width, chevron: !!icon.closest('.sidebar-label') || icon.classList.contains('platform-nav-chevron') })) }
          }),
          sidebarRows: [...document.querySelectorAll('.sidebar-link:has(.sidebar-label)')].map(el => {
            const rect = el.getBoundingClientRect(), icon = el.querySelector('svg')?.getBoundingClientRect(), label = el.querySelector('.sidebar-label')?.getBoundingClientRect()
            return { text: el.textContent.trim(), tag: el.tagName, x: rect.x, height: rect.height, iconX: icon?.x, labelX: label?.x, padding: getComputedStyle(el).padding, border: getComputedStyle(el).borderWidth }
          }),
          tables: [...document.querySelectorAll('main table')].map(table => ({
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
      if (layout.nav.some(item => item.size !== '14px' || item.weight !== '500' || item.lineHeight !== '20px') || new Set(layout.nav.map(item => item.font)).size > 1) errors.push('Navigation typography is inconsistent')
      if (layout.nav.some(item => item.icons.some(icon => Math.abs(icon.size - (icon.chevron ? 16 : 20)) > 0.1))) errors.push('Navigation icon sizes are inconsistent')
      if ([...layout.tables.flatMap(table => table.headings), ...layout.mobileHeadings].some(heading => heading.size !== '12px' || heading.weight !== '500' || heading.line !== '16px')) errors.push('Table heading typography is inconsistent')
      if ([...layout.tables.flatMap(table => table.cells).filter(cell => !cell.actions), ...layout.mobileCells].some(cell => cell.size !== '14px' || cell.line !== '20px')) errors.push('Table body typography is inconsistent')
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
    console.log(JSON.stringify(results.at(-1)))
    await context.close()
  }
} finally { await browser.close() }
await writeFile(outputPath('') + (process.env.PLATFORM_CASES ? 'focused-checks.json' : 'fixture-checks.json'), JSON.stringify(results, null, 2))
if (results.some(r => !r.ready || r.overflow || r.errors.length || r.writes.length)) process.exitCode = 1

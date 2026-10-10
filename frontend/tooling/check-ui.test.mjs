import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findUiViolations } from './check-ui.mjs'
import { isUiExempt } from './ui-allowlist.mjs'

test('rejects utility variants and CSS gradients in templates, scripts and styles', () => {
  const source = `<template><div class="dark:hover:shadow-lg sm:rounded-2xl backdrop-blur-sm" /></template>
<script>const active = 'bg-gradient-to-r rounded-3xl shadow-sm'</script>
<style>.header { background: linear-gradient(red, blue); }</style>`
  assert.equal(findUiViolations(source).length, 7)
  assert.equal(findUiViolations(source).at(-1).line, 3)
})

test('permits flat controls, panels and shared elevation tokens', () => {
  assert.deepEqual(findUiViolations('rounded-md rounded-lg shadow-none box-shadow: var(--brand-overlay-shadow);'), [])
})

test('exempts public and branded payment files without exempting ordinary checkout or admin pages', () => {
  assert.equal(isUiExempt('views/public/PricingView.vue'), true)
  assert.equal(isUiExempt('components/payment/StripePaymentInline.vue'), true)
  assert.equal(isUiExempt('components/payment/AmountInput.vue'), false)
  assert.equal(isUiExempt('components/payment/PaymentProviderDialog.vue'), false)
  assert.equal(isUiExempt('views/admin/SettingsView.vue'), false)
})

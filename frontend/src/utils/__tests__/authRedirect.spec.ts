import { describe, expect, it } from 'vitest'
import { authRedirect } from '../authRedirect'

describe('checkout authentication destination', () => {
  it('retains plan and top-up selections', () => {
    expect(authRedirect('/purchase?tab=subscription&plan=42')).toBe('/purchase?tab=subscription&plan=42')
    expect(authRedirect('/purchase?tab=recharge')).toBe('/purchase?tab=recharge')
  })
  it.each([undefined, null, ['//evil.example'], '//evil.example', 'https://evil.example', '/\\evil.example', '/ login'])('rejects unsafe or malformed redirects: %s', value => {
    expect(authRedirect(value)).toBe('/dashboard')
  })
})

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, portal, flushPromises } from '@/__tests__/render'
import TotpSetupModal from '@/components/user/profile/TotpSetupModal.vue'
import TotpDisableDialog from '@/components/user/profile/TotpDisableDialog.vue'

const mocks = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  getVerificationMethod: vi.fn(),
  sendVerifyCode: vi.fn(),
  initiateSetup: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    showSuccess: mocks.showSuccess,
    showError: mocks.showError
  })
}))

vi.mock('@/api', () => ({
  totpAPI: {
    getVerificationMethod: mocks.getVerificationMethod,
    sendVerifyCode: mocks.sendVerifyCode,
    initiateSetup: mocks.initiateSetup,
    enable: mocks.enable,
    disable: mocks.disable
  }
}))

describe('TOTP 弹窗定时器清理', () => {
  let intervalSeed = 1000
  let setIntervalSpy: ReturnType<typeof vi.spyOn>
  let clearIntervalSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    intervalSeed = 1000
    mocks.showSuccess.mockReset()
    mocks.showError.mockReset()
    mocks.getVerificationMethod.mockReset()
    mocks.sendVerifyCode.mockReset()
    mocks.initiateSetup.mockReset()
    mocks.enable.mockReset()
    mocks.disable.mockReset()

    mocks.getVerificationMethod.mockResolvedValue({ method: 'email' })
    mocks.sendVerifyCode.mockResolvedValue({ success: true })
    mocks.initiateSetup.mockResolvedValue({
      qr_code_url: 'otpauth://totp/Sub2API:test?secret=ABC123',
      secret: 'ABC123',
      setup_token: 'setup-token'
    })
    mocks.enable.mockResolvedValue({ success: true })
    mocks.disable.mockResolvedValue({ success: true })

    setIntervalSpy = vi.spyOn(window, 'setInterval').mockImplementation(((handler: TimerHandler) => {
      void handler
      intervalSeed += 1
      return intervalSeed as unknown as number
    }) as typeof window.setInterval)
    clearIntervalSpy = vi.spyOn(window, 'clearInterval')
  })

  afterEach(() => {
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
  })

  it.each([TotpSetupModal, TotpDisableDialog])('does not start a cooldown after unmounting during send', async (component) => {
    let resolve!: (value: unknown) => void
    mocks.sendVerifyCode.mockReturnValueOnce(new Promise(res => { resolve = res }))
    const wrapper = mount(component)
    await flushPromises()
    await portal().findAll('button').find(b => b.text().includes('profile.totp.sendCode'))!.trigger('click')
    wrapper.unmount()
    resolve({ success: true }); await flushPromises()
    expect(setIntervalSpy.mock.calls.filter(([, delay]) => delay === 1000)).toHaveLength(0)
    expect(mocks.showSuccess).not.toHaveBeenCalled()
  })

  it('TotpSetupModal 卸载时清理倒计时定时器', async () => {
    const wrapper = mount(TotpSetupModal)
    await flushPromises()

    const sendButton = portal()
      .findAll('button')
      .find((button) => button.text().includes('profile.totp.sendCode'))

    expect(sendButton).toBeTruthy()
    await sendButton!.trigger('click')
    await flushPromises()

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    const timerId = setIntervalSpy.mock.results[0]?.value

    wrapper.unmount()

    expect(clearIntervalSpy).toHaveBeenCalledWith(timerId)
  })

  it('TotpDisableDialog 卸载时清理倒计时定时器', async () => {
    const wrapper = mount(TotpDisableDialog)
    await flushPromises()

    const sendButton = portal()
      .findAll('button')
      .find((button) => button.text().includes('profile.totp.sendCode'))

    expect(sendButton).toBeTruthy()
    await sendButton!.trigger('click')
    await flushPromises()

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    const timerId = setIntervalSpy.mock.results[0]?.value

    wrapper.unmount()

    expect(clearIntervalSpy).toHaveBeenCalledWith(timerId)
  })

  it('TotpSetupModal 失败时改用 toast 并不渲染内联错误', async () => {
    mocks.getVerificationMethod.mockResolvedValue({ method: 'password' })
    mocks.initiateSetup.mockRejectedValue({
      response: { data: { message: 'setup failed' } }
    })

    const wrapper = mount(TotpSetupModal)
    await flushPromises()

    await portal().get('input[type="password"]').setValue('correct horse battery staple')
    await portal().get('button[type="button"].btn-primary').trigger('click')
    await flushPromises()

    expect(mocks.showError).toHaveBeenCalledWith('setup failed')
    expect(portal().text()).not.toContain('setup failed')
    expect(portal().find('.bg-red-50').exists()).toBe(false)
    wrapper.unmount()
  })

  it('TotpDisableDialog 失败时改用 toast 并不渲染内联错误', async () => {
    mocks.getVerificationMethod.mockResolvedValue({ method: 'password' })
    mocks.disable.mockRejectedValue({
      response: { data: { message: 'disable failed' } }
    })

    const wrapper = mount(TotpDisableDialog)
    await flushPromises()

    await portal().get('input[type="password"]').setValue('correct horse battery staple')
    await portal().get('form').trigger('submit.prevent')
    await flushPromises()

    expect(mocks.showError).toHaveBeenCalledWith('disable failed')
    expect(portal().text()).not.toContain('disable failed')
    expect(portal().find('.bg-red-50').exists()).toBe(false)
    wrapper.unmount()
  })
})

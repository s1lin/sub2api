import { afterEach, describe, expect, it, vi } from 'vitest'
import { getClerkToken, setClerkClient, clerkSessionId, signOutClerk } from '../clerk'

afterEach(() => { setClerkClient(undefined); localStorage.clear() })

describe('Clerk session credentials', () => {
  it('does not use a saved native token without a Clerk session', async () => {
    localStorage.setItem('auth_token', 'old-native-token')
    expect(await getClerkToken()).toBeNull()
    expect(clerkSessionId()).toBeNull()
  })

  it('gets and refreshes tokens from the active Clerk session', async () => {
    const getToken = vi.fn().mockResolvedValueOnce('current').mockResolvedValueOnce('renewed')
    setClerkClient({ session: { id: 'sess_one', getToken } } as unknown as Parameters<typeof setClerkClient>[0])
    expect(clerkSessionId()).toBe('sess_one')
    expect(await getClerkToken()).toBe('current')
    expect(await getClerkToken(true)).toBe('renewed')
    expect(getToken).toHaveBeenNthCalledWith(2, { skipCache: true })
    expect(localStorage.getItem('auth_token')).toBe('renewed')
  })

  it('revokes the Clerk session when signing out', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    setClerkClient({ signOut } as unknown as Parameters<typeof setClerkClient>[0])
    await signOutClerk()
    expect(signOut).toHaveBeenCalledOnce()
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: '/login' })
  })

  it('drops an in-flight token if the session changes', async () => {
    let complete!: (value: string) => void
    const pending = new Promise<string>(resolve => { complete = resolve })
    setClerkClient({ session: { id: 'sess_old', getToken: () => pending } } as unknown as Parameters<typeof setClerkClient>[0])
    const token = getClerkToken()
    setClerkClient(undefined)
    complete('old-session-token')
    expect(await token).toBeNull()
    expect(localStorage.getItem('auth_token')).toBeNull()
  })
})

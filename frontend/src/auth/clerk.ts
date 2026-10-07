import type { useClerk } from '@clerk/vue'
type Clerk = NonNullable<ReturnType<typeof useClerk>['value']>

export const clerkPublishableKey = (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim()
export const clerkEnabled = clerkPublishableKey !== ''
let clerkClient: Clerk | undefined

export function setClerkClient(client: Clerk | undefined) {
  clerkClient = client
}

export function clerkSessionId(): string | null {
  return clerkClient?.session?.id || null
}

export async function getClerkToken(forceRefresh = false): Promise<string | null> {
  const session = clerkClient?.session
  const token = await session?.getToken({ skipCache: forceRefresh }) || null
  if (session?.id !== clerkClient?.session?.id) return null
  if (token) localStorage.setItem('auth_token', token)
  return token
}

export async function signOutClerk(): Promise<void> {
  await clerkClient?.signOut({ redirectUrl: '/login' })
}

export async function getRequestAuthToken(): Promise<string | null> {
  return clerkEnabled ? getClerkToken() : localStorage.getItem('auth_token')
}

export function openClerkProfile() {
  clerkClient?.openUserProfile()
}

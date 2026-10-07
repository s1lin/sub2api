/** Keep a checkout destination through authentication, accepting only local routes. */
export function authRedirect(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) {
    return fallback
  }
  return value
}

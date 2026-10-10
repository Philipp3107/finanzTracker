import type { User, UserManager } from 'oidc-client-ts'

export function useAuth() {
  const config = useRuntimeConfig().public
  const user = shallowRef<User | null>(null)
  const status = ref<'loading' | 'ready' | 'unconfigured' | 'error'>('loading')
  const busy = ref(false)
  const error = ref('')
  let manager: UserManager | undefined

  onMounted(async () => {
    const callbackUrl = new URL(window.location.href)
    if (callbackUrl.searchParams.get('action') === 'booking') {
      const draft = new URLSearchParams({ action: 'booking' })
      for (const key of ['amount', 'description', 'timestamp', 'type']) {
        const value = callbackUrl.searchParams.get(key)
        if (value) draft.set(key, value.slice(0, key === 'description' ? 100 : 50))
      }
      try { window.sessionStorage.setItem('finance-shortcut-draft', JSON.stringify({ query: draft.toString(), createdAt: Date.now() })) } catch {}
      window.history.replaceState({}, '', '/')
    }
    const isCallback = callbackUrl.searchParams.has('state')
      && (callbackUrl.searchParams.has('code') || callbackUrl.searchParams.has('error'))

    if (!config.cognitoAuthority || !config.cognitoClientId || !config.cognitoDomain) {
      if (isCallback) window.history.replaceState({}, '', '/')
      status.value = 'unconfigured'
      return
    }

    try {
      const { UserManager, WebStorageStateStore, InMemoryWebStorage } = await import('oidc-client-ts')
      manager = new UserManager({
        authority: config.cognitoAuthority,
        client_id: config.cognitoClientId,
        redirect_uri: `${window.location.origin}/`,
        response_type: 'code',
        scope: 'openid email profile finanztracker/account.initialize finanztracker/finance',
        automaticSilentRenew: false,
        loadUserInfo: false,
        stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
        userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
      })
      manager.events.addAccessTokenExpired(() => {
        user.value = null
        error.value = 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.'
        void manager?.removeUser()
      })

      if (isCallback) {
        user.value = await manager.signinRedirectCallback(callbackUrl.href)
      }
      await manager.clearStaleState()
      status.value = 'ready'
    } catch {
      status.value = manager ? 'ready' : 'error'
      error.value = 'Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.'
    } finally {
      if (isCallback) window.history.replaceState({}, '', '/')
    }
  })

  async function signIn() {
    if (!manager || busy.value) return
    busy.value = true
    error.value = ''
    try {
      await manager.signinRedirect({ nonce: window.crypto.randomUUID() })
    } catch {
      error.value = 'Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es erneut.'
      busy.value = false
    }
  }

  async function signOut() {
    if (!manager || busy.value) return
    busy.value = true
    error.value = ''
    try {
      await manager.revokeTokens(['refresh_token'])
    } catch {
      error.value = 'Die Sitzung konnte nicht auf dem Server widerrufen werden.'
    } finally {
      user.value = null
      await manager.removeUser()
      const logoutUrl = new URL('/logout', config.cognitoDomain)
      logoutUrl.searchParams.set('client_id', config.cognitoClientId)
      logoutUrl.searchParams.set('logout_uri', `${window.location.origin}/`)
      window.location.assign(logoutUrl.href)
    }
  }

  return { user, status, busy, error, signIn, signOut }
}

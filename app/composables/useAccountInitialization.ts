import type { User } from 'oidc-client-ts'
import type { Ref } from 'vue'

export function useAccountInitialization(user: Ref<User | null>) {
  const config = useRuntimeConfig().public
  const accountStatus = ref<'idle' | 'initializing' | 'ready' | 'error'>('idle')
  const accountError = ref('')
  let activeController: AbortController | undefined

  async function initializeAccount() {
    activeController?.abort()
    const token = user.value?.access_token
    if (!import.meta.client || !token) {
      accountStatus.value = 'idle'
      accountError.value = ''
      return
    }
    if (!config.accountApiUrl) {
      accountStatus.value = 'error'
      accountError.value = 'Die Kontoeinrichtung ist noch nicht konfiguriert.'
      return
    }

    const controller = new AbortController()
    activeController = controller
    accountStatus.value = 'initializing'
    accountError.value = ''
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 90_000)

    try {
      while (!controller.signal.aborted) {
        const result = await fetch(`${config.accountApiUrl.replace(/\/$/, '')}/account/initialize`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          credentials: 'omit',
          redirect: 'error',
          signal: controller.signal,
        })
        if (result.status === 401 || result.status === 403) {
          throw new Error('Bitte melde dich erneut an, um dein Konto einzurichten.')
        }
        if (result.status !== 200 && result.status !== 202 && result.status !== 429) {
          throw new Error('Dein Konto konnte nicht eingerichtet werden. Bitte versuche es erneut.')
        }
        if (result.status !== 429) {
          const data: unknown = await result.json()
          if (!data || typeof data !== 'object' || !('status' in data)) {
            throw new Error('Die Kontoeinrichtung hat eine ungueltige Antwort geliefert.')
          }
          if (result.status === 200 && data.status === 'ready') {
            if (activeController === controller && !controller.signal.aborted) accountStatus.value = 'ready'
            return
          }
          if (result.status !== 202 || data.status !== 'initializing') {
            throw new Error('Die Kontoeinrichtung hat eine ungueltige Antwort geliefert.')
          }
        }
        await new Promise<void>((resolve, reject) => {
          const onAbort = () => {
            clearTimeout(timer)
            reject(new Error('cancelled'))
          }
          const timer = setTimeout(() => {
            controller.signal.removeEventListener('abort', onAbort)
            resolve()
          }, 3000)
          controller.signal.addEventListener('abort', onAbort, { once: true })
          if (controller.signal.aborted) onAbort()
        })
      }
    } catch (error) {
      if (activeController !== controller || (controller.signal.aborted && !timedOut)) return
      accountStatus.value = 'error'
      accountError.value = timedOut
        ? 'Die Einrichtung dauert laenger als erwartet. Bitte versuche es erneut.'
        : error instanceof Error && error.message.startsWith('Bitte melde')
          ? error.message
          : 'Dein Konto konnte nicht eingerichtet werden. Bitte versuche es erneut.'
    } finally {
      clearTimeout(timeout)
    }
  }

  watch(user, () => { void initializeAccount() }, { immediate: true })
  onBeforeUnmount(() => activeController?.abort())

  return { accountStatus, accountError, initializeAccount }
}

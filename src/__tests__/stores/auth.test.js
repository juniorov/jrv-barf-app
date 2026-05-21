import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../../stores/auth.js'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('initializes with no user', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
  })

  it('sets session correctly', () => {
    const store = useAuthStore()
    const mockUser = { email: 'test@example.com', _id: '123' }
    store.setSession('mock-token', mockUser)

    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('mock-token')
    expect(store.user.email).toBe('test@example.com')
    expect(localStorage.getItem('barf_token')).toBe('mock-token')
  })

  it('clears session correctly', () => {
    const store = useAuthStore()
    store.setSession('mock-token', { email: 'test@example.com' })
    store.clearSession()

    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(localStorage.getItem('barf_token')).toBeNull()
  })

  it('logout clears session', () => {
    const store = useAuthStore()
    store.setSession('mock-token', { email: 'test@example.com' })
    store.logout()

    expect(store.isAuthenticated).toBe(false)
  })
})

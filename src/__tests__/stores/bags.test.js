import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBagStore } from '../../stores/bags.js'

describe('Bag Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with default state', () => {
    const store = useBagStore()
    expect(store.needsRefresh).toBe(false)
    expect(store.lastUpdate).toBeNull()
  })

  it('marks as updated', () => {
    const store = useBagStore()
    store.markUpdated()

    expect(store.needsRefresh).toBe(true)
    expect(store.lastUpdate).not.toBeNull()
    expect(store.lastUpdate instanceof Date).toBe(true)
  })

  it('marks as refreshed', () => {
    const store = useBagStore()
    store.markUpdated()
    expect(store.needsRefresh).toBe(true)

    store.markRefreshed()
    expect(store.needsRefresh).toBe(false)
  })

  it('tracks multiple updates', () => {
    const store = useBagStore()

    store.markUpdated()
    const firstUpdate = store.lastUpdate

    // Wait a tick and update again
    store.markUpdated()
    const secondUpdate = store.lastUpdate

    expect(secondUpdate.getTime()).toBeGreaterThanOrEqual(firstUpdate.getTime())
  })
})

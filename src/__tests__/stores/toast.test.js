import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToastStore } from '../../stores/toast.js'

describe('Toast Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('initializes with empty toasts', () => {
    const store = useToastStore()
    expect(store.toasts).toHaveLength(0)
  })

  it('adds a toast with addToast', () => {
    const store = useToastStore()
    store.addToast('Test message', 'info', 0)

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].message).toBe('Test message')
    expect(store.toasts[0].type).toBe('info')
  })

  it('adds a toast with success helper', () => {
    const store = useToastStore()
    store.success('Success!')

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].type).toBe('success')
    expect(store.toasts[0].message).toBe('Success!')
  })

  it('adds a toast with error helper', () => {
    const store = useToastStore()
    store.error('Error!')

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].type).toBe('error')
  })

  it('adds a toast with warning helper', () => {
    const store = useToastStore()
    store.warning('Warning!')

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].type).toBe('warning')
  })

  it('adds a toast with info helper', () => {
    const store = useToastStore()
    store.info('Info!')

    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].type).toBe('info')
  })

  it('removes a toast by id', () => {
    const store = useToastStore()
    const id = store.addToast('To remove', 'info', 0)

    expect(store.toasts).toHaveLength(1)

    store.removeToast(id)
    expect(store.toasts).toHaveLength(0)
  })

  it('auto-removes toast after duration', () => {
    const store = useToastStore()
    store.addToast('Temporary', 'info', 4000)

    expect(store.toasts).toHaveLength(1)

    vi.advanceTimersByTime(4000)
    expect(store.toasts).toHaveLength(0)
  })

  it('does not auto-remove when duration is 0', () => {
    const store = useToastStore()
    store.addToast('Permanent', 'info', 0)

    expect(store.toasts).toHaveLength(1)

    vi.advanceTimersByTime(10000)
    expect(store.toasts).toHaveLength(1)
  })

  it('handles multiple toasts', () => {
    const store = useToastStore()
    store.success('First')
    store.error('Second')
    store.warning('Third')

    expect(store.toasts).toHaveLength(3)
    expect(store.toasts.map(t => t.type)).toEqual(['success', 'error', 'warning'])
  })

  it('generates unique ids', () => {
    const store = useToastStore()
    const id1 = store.addToast('First', 'info', 0)
    const id2 = store.addToast('Second', 'info', 0)

    expect(id1).not.toBe(id2)
  })
})

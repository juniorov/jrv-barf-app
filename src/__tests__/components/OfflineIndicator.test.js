import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OfflineIndicator from '../../components/OfflineIndicator.vue'

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      onLine: true,
    })
  })

  it('does not render when online', () => {
    const wrapper = mount(OfflineIndicator)
    expect(wrapper.find('.offline-banner').exists()).toBe(false)
  })

  it('renders when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

    const wrapper = mount(OfflineIndicator)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.offline-banner').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sin conexión')
  })

  it('responds to online/offline events', async () => {
    const wrapper = mount(OfflineIndicator)

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.offline-banner').exists()).toBe(true)

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
    window.dispatchEvent(new Event('online'))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.offline-banner').exists()).toBe(false)
  })
})

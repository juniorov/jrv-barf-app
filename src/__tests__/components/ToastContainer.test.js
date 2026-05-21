import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useToastStore } from '../../stores/toast.js'
import ToastContainer from '../../components/ToastContainer.vue'

describe('ToastContainer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders nothing when no toasts', () => {
    const wrapper = mount(ToastContainer, {
      global: {
        plugins: [createPinia()],
      },
    })
    expect(wrapper.findAll('.toast-item')).toHaveLength(0)
  })

  it('renders a toast when added to store', async () => {
    const wrapper = mount(ToastContainer, {
      global: {
        plugins: [createPinia()],
      },
    })

    const toastStore = useToastStore()
    toastStore.success('Test message')

    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.toast-item')).toHaveLength(1)
    expect(wrapper.text()).toContain('Test message')
  })

  it('shows correct icon for each type', async () => {
    const wrapper = mount(ToastContainer, {
      global: {
        plugins: [createPinia()],
      },
    })

    const toastStore = useToastStore()
    toastStore.success('Success')
    toastStore.error('Error')
    toastStore.warning('Warning')
    toastStore.info('Info')

    await wrapper.vm.$nextTick()

    const toasts = wrapper.findAll('.toast-item')
    expect(toasts).toHaveLength(4)
    expect(wrapper.html()).toContain('bi-check-circle-fill')
    expect(wrapper.html()).toContain('bi-exclamation-circle-fill')
    expect(wrapper.html()).toContain('bi-exclamation-triangle-fill')
    expect(wrapper.html()).toContain('bi-info-circle-fill')
  })

  it('removes toast when close button clicked', async () => {
    const wrapper = mount(ToastContainer, {
      global: {
        plugins: [createPinia()],
      },
    })

    const toastStore = useToastStore()
    toastStore.info('Dismissible')

    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.toast-item')).toHaveLength(1)

    const closeBtn = wrapper.find('.toast-close')
    await closeBtn.trigger('click')
    await new Promise((r) => setTimeout(r, 50))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.toast-item')).toHaveLength(0)
  })
})

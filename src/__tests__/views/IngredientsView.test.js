import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import IngredientsView from '../../views/IngredientsView.vue'
import api from '../../api/client.js'

vi.mock('../../api/client.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('IngredientsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockIngredients = [
    { _id: 'i1', name: 'Pollo', code: 'POLLO' },
    { _id: 'i2', name: 'Arroz', code: 'ARROZ' },
    { _id: 'i3', name: 'Zanahoria', code: 'ZANAHORIA' },
  ]

  it('loads ingredients on mount', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/ingredients')
  })

  it('displays empty state when no ingredients', async () => {
    api.get.mockResolvedValue([])

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('No hay ingredientes aún')
  })

  it('shows search input and clear button', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const searchInput = wrapper.find('input[placeholder="Buscar ingrediente..."]')
    expect(searchInput.exists()).toBe(true)

    // Clear button should not be visible when search is empty
    const clearBtn = wrapper.find('button[aria-label="Limpiar búsqueda"]')
    expect(clearBtn.exists()).toBe(false)
  })

  it('shows clear button when search has value', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const searchInput = wrapper.find('input[placeholder="Buscar ingrediente..."]')
    await searchInput.setValue('Pollo')
    await wrapper.vm.$nextTick()

    const clearBtn = wrapper.find('button[aria-label="Limpiar búsqueda"]')
    expect(clearBtn.exists()).toBe(true)
  })

  it('clears search when X button clicked', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const searchInput = wrapper.find('input[placeholder="Buscar ingrediente..."]')
    await searchInput.setValue('Pollo')
    await wrapper.vm.$nextTick()

    const clearBtn = wrapper.find('button[aria-label="Limpiar búsqueda"]')
    await clearBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(searchInput.element.value).toBe('')
  })

  it('has form inputs with required attribute', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const inputs = wrapper.findAll('input')
    const nameInput = inputs.find(i => i.attributes('placeholder') === 'Ej: Pollo')
    const codeInput = inputs.find(i => i.attributes('placeholder') === 'Ej: POLLO')

    expect(nameInput?.attributes('required')).toBeDefined()
    expect(codeInput?.attributes('required')).toBeDefined()
  })

  it('shows add button when not editing', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Añadir')
  })

  it('shows save button when editing', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Simulate editing
    wrapper.vm.form.id = 'i1'
    wrapper.vm.form.name = 'Pollo'
    wrapper.vm.form.code = 'POLLO'
    await wrapper.vm.$nextTick()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Guardar')
  })

  it('shows cancel button when editing', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Initially submit button says "Añadir"
    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Añadir')

    // Simulate editing
    wrapper.vm.form.id = 'i1'
    await wrapper.vm.$nextTick()

    // Now submit button says "Guardar" and cancel button appears
    expect(submitBtn.text()).toContain('Guardar')
    expect(wrapper.text()).toContain('Cancelar')
  })

  it('displays ingredients list with name and code', async () => {
    api.get.mockResolvedValue(mockIngredients)

    const wrapper = mount(IngredientsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Pollo')
    expect(wrapper.text()).toContain('POLLO')
    expect(wrapper.text()).toContain('Arroz')
    expect(wrapper.text()).toContain('ARROZ')
  })
})

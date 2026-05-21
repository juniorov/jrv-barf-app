import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BagsView from '../../views/BagsView.vue'
import api from '../../api/client.js'

vi.mock('../../api/client.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('BagsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockPets = [
    { _id: 'p1', name: 'Firulais', maxIngredientsPerBag: 5, ingredients: [
      { ingredient: { _id: 'i1', name: 'Pollo' }, gramsPerPortion: 100 },
      { ingredient: { _id: 'i2', name: 'Arroz' }, gramsPerPortion: 50 },
    ]},
  ]

  const mockBags = [
    { _id: 'b1', name: 'Bolsa Pollo', quantity: 3, pet: { _id: 'p1', name: 'Firulais' }, isCompleted: false, ingredients: [
      { ingredient: { _id: 'i1', name: 'Pollo' }, gramsPerBag: 100 },
    ]},
    { _id: 'b2', name: 'Bolsa Res', quantity: 2, pet: { _id: 'p1', name: 'Firulais' }, isCompleted: true, completedAt: '2024-01-15', ingredients: [
      { ingredient: { _id: 'i2', name: 'Arroz' }, gramsPerBag: 50 },
    ]},
  ]

  it('loads bags and pets on mount', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/bags') return Promise.resolve(mockBags)
      if (path === '/pets') return Promise.resolve(mockPets)
      return Promise.resolve([])
    })

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/bags')
    expect(api.get).toHaveBeenCalledWith('/pets')
  })

  it('displays empty state when no bags', async () => {
    api.get.mockResolvedValue([])

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('No hay bolsas incompletas')
  })

  it('shows search input', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/bags') return Promise.resolve(mockBags)
      if (path === '/pets') return Promise.resolve(mockPets)
      return Promise.resolve([])
    })

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const searchInput = wrapper.find('input[placeholder="Buscar bolsa o mascota..."]')
    expect(searchInput.exists()).toBe(true)
  })

  it('toggles completed bags view', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/bags') return Promise.resolve(mockBags)
      if (path === '/pets') return Promise.resolve(mockPets)
      return Promise.resolve([])
    })

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Initially shows incomplete bags
    expect(wrapper.text()).toContain('Bolsas Existentes')

    // Toggle to show completed
    const toggleBtn = wrapper.find('button[class*="btn-outline"]')
    await toggleBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Historial de Bolsas')
  })

  it('shows pet selector and ingredient section', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/bags') return Promise.resolve([])
      if (path === '/pets') return Promise.resolve(mockPets)
      return Promise.resolve([])
    })

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Pet select should exist
    const petSelect = wrapper.find('select')
    expect(petSelect.exists()).toBe(true)

    // Info message when no pet selected
    expect(wrapper.text()).toContain('Selecciona una mascota para ver sus ingredientes')
  })

  it('has form inputs with correct attributes', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/bags') return Promise.resolve([])
      if (path === '/pets') return Promise.resolve(mockPets)
      return Promise.resolve([])
    })

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const inputs = wrapper.findAll('input')
    const nameInput = inputs.find(i => i.attributes('placeholder') === 'Ej: Bolsa de pollo')
    expect(nameInput?.attributes('required')).toBeDefined()
  })

  it('shows create button when not editing', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/bags') return Promise.resolve([])
      if (path === '/pets') return Promise.resolve(mockPets)
      return Promise.resolve([])
    })

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Crear Bolsa')
  })

  it('shows edit button when editing', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/bags') return Promise.resolve([])
      if (path === '/pets') return Promise.resolve(mockPets)
      return Promise.resolve([])
    })

    const wrapper = mount(BagsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Simulate editing by setting form.id
    wrapper.vm.form.id = 'b1'
    wrapper.vm.form.name = 'Test'
    await wrapper.vm.$nextTick()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Guardar Cambios')
  })
})

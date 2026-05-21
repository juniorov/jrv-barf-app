import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PortionsView from '../../views/PortionsView.vue'
import api from '../../api/client.js'

vi.mock('../../api/client.js', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe('PortionsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockPets = [
    {
      _id: 'p1',
      name: 'Firulais',
      ingredients: [
        { ingredient: { _id: 'i1', name: 'Pollo' }, gramsPerPortion: 100, desiredPortions: 5 },
        { ingredient: { _id: 'i2', name: 'Arroz' }, gramsPerPortion: 50, desiredPortions: 3 },
      ],
    },
  ]

  const mockBags = [
    {
      _id: 'b1',
      name: 'Bolsa Pollo',
      quantity: 2,
      pet: { _id: 'p1', name: 'Firulais' },
      isCompleted: false,
      ingredients: [
        { ingredient: { _id: 'i1', name: 'Pollo' }, gramsPerBag: 100 },
      ],
    },
  ]

  it('loads pets and bags on mount', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/pets')
    expect(api.get).toHaveBeenCalledWith('/bags')
  })

  it('shows empty state when no pets', async () => {
    api.get.mockResolvedValue([])

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('No hay mascotas')
  })

  it('shows empty state when pets have no ingredients', async () => {
    const petsWithoutIngredients = [{ _id: 'p1', name: 'Firulais', ingredients: [] }]
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(petsWithoutIngredients)
      if (path === '/bags') return Promise.resolve([])
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('no tienen ingredientes asignados')
  })

  it('displays portion cards for each ingredient', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Pollo')
    expect(wrapper.text()).toContain('Arroz')
    expect(wrapper.text()).toContain('Porciones deseadas')
    expect(wrapper.text()).toContain('Total a comprar')
  })

  it('shows shopping summary section', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Resumen de Compras')
  })

  it('shows copy button for shopping list', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const copyBtn = wrapper.find('button[aria-label="Copiar lista"]')
    expect(copyBtn.exists()).toBe(true)
  })

  it('shows incomplete bags info section', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Bolsas Incompletas')
    expect(wrapper.text()).toContain('Bolsa Pollo')
  })

  it('shows save portions button', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const buttons = wrapper.findAll('button')
    const saveBtn = buttons.find(b => b.text().includes('Guardar Porciones'))
    expect(saveBtn.exists()).toBe(true)
  })

  it('shows missing portions badge', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Arroz is missing from the bag
    expect(wrapper.text()).toContain('Faltantes')
  })

  it('calculates totals correctly', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/bags') return Promise.resolve(mockBags)
      return Promise.resolve([])
    })

    const wrapper = mount(PortionsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    // Pollo: 5 desired + 0 missing = 5 portions * 100g = 500g
    // Arroz: 3 desired + 2 missing = 5 portions * 50g = 250g
    expect(wrapper.text()).toContain('500')
    expect(wrapper.text()).toContain('250')
  })
})

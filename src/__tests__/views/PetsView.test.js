import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PetsView from '../../views/PetsView.vue'
import api from '../../api/client.js'

vi.mock('../../api/client.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('PetsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mockPets = [
    {
      _id: 'p1',
      name: 'Firulais',
      birthDate: '2020-01-01',
      mealsPerDay: 2,
      maxIngredientsPerBag: 5,
      totalInventory: 10,
      feedingTimes: ['08:00', '18:00'],
      ingredients: [
        { ingredient: { _id: 'i1', name: 'Pollo' }, gramsPerPortion: 100 },
      ],
    },
  ]

  const mockIngredients = [
    { _id: 'i1', name: 'Pollo', code: 'POLLO' },
    { _id: 'i2', name: 'Arroz', code: 'ARROZ' },
  ]

  it('loads pets and ingredients on mount', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/pets')
    expect(api.get).toHaveBeenCalledWith('/ingredients')
  })

  it('displays empty state when no pets', async () => {
    api.get.mockResolvedValue([])

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('No hay mascotas aún')
  })

  it('shows search input', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const searchInput = wrapper.find('input[placeholder="Buscar mascota..."]')
    expect(searchInput.exists()).toBe(true)
  })

  it('shows pet card with name and age', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Firulais')
    expect(wrapper.text()).toContain('años')
  })

  it('shows inventory section', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Inventario')
    expect(wrapper.text()).toContain('10 bolsas')
  })

  it('shows edit inventory button', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Editar Inventario')
  })

  it('shows manage ingredients button', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Gestionar')
  })

  it('shows pet actions (edit, feed, delete)', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Editar')
    expect(wrapper.text()).toContain('Día Comida')
    expect(wrapper.text()).toContain('Eliminar')
  })

  it('shows form with correct fields', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.find('input[placeholder="Ej: Rocky"]').exists()).toBe(true)
    expect(wrapper.find('input[type="date"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Comidas al día')
    expect(wrapper.text()).toContain('Máx. ingredientes')
    expect(wrapper.text()).toContain('Horarios de comida')
  })

  it('shows add button when not editing', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Añadir Mascota')
  })

  it('shows save button when editing', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    wrapper.vm.form.id = 'p1'
    await wrapper.vm.$nextTick()

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Guardar Cambios')
  })

  it('shows cancel button when editing', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/pets') return Promise.resolve(mockPets)
      if (path === '/ingredients') return Promise.resolve(mockIngredients)
      return Promise.resolve([])
    })

    const wrapper = mount(PetsView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    wrapper.vm.form.id = 'p1'
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Cancelar')
  })
})

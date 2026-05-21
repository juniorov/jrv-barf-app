import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DashboardView from '../../views/DashboardView.vue'
import api from '../../api/client.js'

vi.mock('../../api/client.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    name: 'RouterLink',
    template: '<a><slot /></a>',
    props: ['to'],
  },
}))

describe('DashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  const mockPetStats = [
    {
      pet: { id: 'p1', name: 'Firulais', mealsPerDay: 2, feedingTimes: ['08:00', '18:00'] },
      completeBags: 5,
      incompleteBagsCount: 2,
      shouldBuyNow: false,
      projectedEmptyDate: '2024-06-01',
      recommendedPurchaseDate: '2024-05-25',
    },
  ]

  const mockSummary = { totalBags: 10, totalPets: 2 }

  const mockInventoryStatus = {
    pets: [{ petId: 'p1', minutesSinceUpdate: 10 }],
  }

  it('loads dashboard data on mount', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/dashboard/pet-statistics') return Promise.resolve(mockPetStats)
      if (path === '/dashboard/summary') return Promise.resolve(mockSummary)
      if (path === '/pets/inventory-status') return Promise.resolve(mockInventoryStatus)
      return Promise.resolve([])
    })

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/dashboard/pet-statistics')
    expect(api.get).toHaveBeenCalledWith('/dashboard/summary')
    expect(api.get).toHaveBeenCalledWith('/pets/inventory-status')
  })

  it('shows loading skeleton initially', async () => {
    api.get.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'SkeletonCard' }).exists()).toBe(true)
  })

  it('shows empty state when no pets', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/dashboard/pet-statistics') return Promise.resolve([])
      if (path === '/dashboard/summary') return Promise.resolve({})
      if (path === '/pets/inventory-status') return Promise.resolve({ pets: [] })
      return Promise.resolve([])
    })

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('No tienes mascotas registradas aún')
  })

  it('displays pet statistics cards', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/dashboard/pet-statistics') return Promise.resolve(mockPetStats)
      if (path === '/dashboard/summary') return Promise.resolve(mockSummary)
      if (path === '/pets/inventory-status') return Promise.resolve(mockInventoryStatus)
      return Promise.resolve([])
    })

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Firulais')
    expect(wrapper.text()).toContain('Bolsas Completas')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('Incompletas')
    expect(wrapper.text()).toContain('2')
  })

  it('shows auto-update controls', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/dashboard/pet-statistics') return Promise.resolve(mockPetStats)
      if (path === '/dashboard/summary') return Promise.resolve(mockSummary)
      if (path === '/pets/inventory-status') return Promise.resolve(mockInventoryStatus)
      return Promise.resolve([])
    })

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Auto cada 60s')
    expect(wrapper.find('button[aria-label="Actualizar dashboard"]').exists()).toBe(true)
  })

  it('shows force update button for pet', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/dashboard/pet-statistics') return Promise.resolve(mockPetStats)
      if (path === '/dashboard/summary') return Promise.resolve(mockSummary)
      if (path === '/pets/inventory-status') return Promise.resolve(mockInventoryStatus)
      return Promise.resolve([])
    })

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Forzar Actualización')
  })

  it('displays feeding times when available', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/dashboard/pet-statistics') return Promise.resolve(mockPetStats)
      if (path === '/dashboard/summary') return Promise.resolve(mockSummary)
      if (path === '/pets/inventory-status') return Promise.resolve(mockInventoryStatus)
      return Promise.resolve([])
    })

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('08:00, 18:00')
  })

  it('shows projected empty date', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/dashboard/pet-statistics') return Promise.resolve(mockPetStats)
      if (path === '/dashboard/summary') return Promise.resolve(mockSummary)
      if (path === '/pets/inventory-status') return Promise.resolve(mockInventoryStatus)
      return Promise.resolve([])
    })

    const wrapper = mount(DashboardView, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Se acaba el')
  })
})

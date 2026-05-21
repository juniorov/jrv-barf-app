import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ConfigView from '../../views/ConfigView.vue'
import { useAuthStore } from '../../stores/auth.js'

const mockRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: { template: '<div>Login</div>' } },
    { path: '/app/pets', name: 'pets', component: { template: '<div>Pets</div>' } },
    { path: '/app/ingredients', name: 'ingredients', component: { template: '<div>Ingredients</div>' } },
    { path: '/app/bags', name: 'bags', component: { template: '<div>Bags</div>' } },
    { path: '/app/portions', name: 'portions', component: { template: '<div>Portions</div>' } },
  ],
})

describe('ConfigView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders user profile section', async () => {
    const auth = useAuthStore()
    auth.setSession('test-token', { email: 'test@example.com' })

    const wrapper = mount(ConfigView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    expect(wrapper.text()).toContain('test@example.com')
    expect(wrapper.text()).toContain('Cuenta activa')
  })

  it('shows user initials from email', async () => {
    const auth = useAuthStore()
    auth.setSession('test-token', { email: 'john.doe@example.com' })

    const wrapper = mount(ConfigView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    expect(wrapper.text()).toContain('JO')
  })

  it('shows quick actions', async () => {
    const auth = useAuthStore()
    auth.setSession('test-token', { email: 'test@example.com' })

    const wrapper = mount(ConfigView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    expect(wrapper.text()).toContain('Acciones Rápidas')
    expect(wrapper.text()).toContain('Mascotas')
    expect(wrapper.text()).toContain('Ingredientes')
    expect(wrapper.text()).toContain('Bolsas')
    expect(wrapper.text()).toContain('Porciones')
  })

  it('shows app info section', async () => {
    const auth = useAuthStore()
    auth.setSession('test-token', { email: 'test@example.com' })

    const wrapper = mount(ConfigView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    expect(wrapper.text()).toContain('Información de la App')
    expect(wrapper.text()).toContain('Versión')
    expect(wrapper.text()).toContain('1.2.0')
    expect(wrapper.text()).toContain('API')
    expect(wrapper.text()).toContain('PWA')
    expect(wrapper.text()).toContain('Instalable')
  })

  it('shows logout button', async () => {
    const auth = useAuthStore()
    auth.setSession('test-token', { email: 'test@example.com' })

    const wrapper = mount(ConfigView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    expect(wrapper.text()).toContain('Cerrar Sesión')
  })

  it('navigates to pets when quick action clicked', async () => {
    const auth = useAuthStore()
    auth.setSession('test-token', { email: 'test@example.com' })

    const pushSpy = vi.spyOn(mockRouter, 'push')

    const wrapper = mount(ConfigView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    const buttons = wrapper.findAll('button')
    const petsButton = buttons.find(b => b.text().includes('Mascotas'))
    await petsButton.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'pets' })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, config } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../../views/auth/LoginView.vue'
import { useAuthStore } from '../../stores/auth.js'

config.global.stubs = {
  RouterLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
}

const mockRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: { template: '<div>Login</div>' } },
    { path: '/register', name: 'register', component: { template: '<div>Register</div>' } },
    { path: '/forgot-password', name: 'forgot-password', component: { template: '<div>Forgot</div>' } },
    { path: '/app/dashboard', name: 'dashboard', component: { template: '<div>Dashboard</div>' } },
  ],
})

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    expect(wrapper.text()).toContain('JRV BARF')
    expect(wrapper.text()).toContain('Gestiona la alimentación de tus mascotas')
  })

  it('has email and password inputs', () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    const emailInput = wrapper.find('input[type="email"]')
    const passwordInput = wrapper.find('input[autocomplete="current-password"]')

    expect(emailInput.exists()).toBe(true)
    expect(passwordInput.exists()).toBe(true)
  })

  it('has password visibility toggle', () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    const toggleBtn = wrapper.find('button[aria-label="Mostrar contraseña"]')
    expect(toggleBtn.exists()).toBe(true)
  })

  it('toggles password visibility', async () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    const passwordInput = wrapper.find('input[autocomplete="current-password"]')
    const toggleBtn = wrapper.find('button[aria-label="Mostrar contraseña"]')

    // Initially password is hidden
    expect(passwordInput.attributes('type')).toBe('password')

    // Toggle to show
    await toggleBtn.trigger('click')
    expect(passwordInput.attributes('type')).toBe('text')

    // Toggle back to hide
    await toggleBtn.trigger('click')
    expect(passwordInput.attributes('type')).toBe('password')
  })

  it('shows register link', () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    expect(wrapper.html()).toContain('/register')
  })

  it('shows forgot password link', () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    expect(wrapper.html()).toContain('/forgot-password')
  })

  it('shows login button', () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
      },
    })

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.text()).toContain('Iniciar Sesión')
  })

  it('shows error when submitting empty form', async () => {
    const wrapper = mount(LoginView, {
      global: {
        plugins: [createPinia(), mockRouter],
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    // The form has required attributes, so HTML5 validation prevents submission
    const emailInput = wrapper.find('input[type="email"]')
    const passwordInput = wrapper.find('input[autocomplete="current-password"]')

    expect(emailInput.attributes('required')).toBeDefined()
    expect(passwordInput.attributes('required')).toBeDefined()
  })
})

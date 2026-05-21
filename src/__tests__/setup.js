import { config } from '@vue/test-utils'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
})

// Mock localStorage with real storage
const store = {}
const localStorageMock = {
  getItem: (key) => store[key] || null,
  setItem: (key, value) => { store[key] = String(value) },
  removeItem: (key) => { delete store[key] },
  clear: () => { for (const key in store) { delete store[key] } },
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: () => Promise.resolve(),
  },
})

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: () => true,
  writable: true,
})

// Global stubs for Bootstrap icons
config.global.stubs = {
  RouterLink: true,
  RouterView: true,
}

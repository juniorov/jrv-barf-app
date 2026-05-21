import { useRouter } from 'vue-router';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const REQUEST_TIMEOUT = 15000; // 15 segundos
const MAX_RETRIES = 2;

let routerInstance = null;

export function setRouter(router) {
  routerInstance = router;
}

function redirectToLogin() {
  localStorage.removeItem('barf_token');
  localStorage.removeItem('barf_user');
  if (routerInstance) {
    routerInstance.push({ name: 'login', query: { redirect: routerInstance.currentRoute.value.fullPath } });
  } else {
    window.location.href = '/login';
  }
}

async function fetchWithTimeout(path, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request(path, options = {}, retries = 0) {
  const token = localStorage.getItem('barf_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetchWithTimeout(path, {
      ...options,
      headers,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      // ignore empty body
    }

    if (response.status === 401) {
      redirectToLogin();
      const error = new Error('Sesión expirada. Inicia sesión nuevamente.');
      error.status = 401;
      throw error;
    }

    if (!response.ok) {
      const message = data?.message || 'Error en la petición';
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La petición tardó demasiado. Verifica tu conexión e intenta de nuevo.');
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      if (retries < MAX_RETRIES && options.method !== 'POST' && options.method !== 'PUT') {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return request(path, options, retries + 1);
      }
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    }

    throw error;
  }
}

const apiClient = {
  API_BASE_URL,
  get(path) {
    return request(path);
  },
  post(path, body) {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  put(path, body) {
    return request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
  patch(path, body) {
    return request(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
  delete(path) {
    return request(path, {
      method: 'DELETE',
    });
  },
  setRouter(router) {
    routerInstance = router;
  },
};

export default apiClient;

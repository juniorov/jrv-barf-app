const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('barf_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // ignore empty body
  }

  if (!response.ok) {
    const message = data?.message || 'Error en la petición';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export default {
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
  delete(path) {
    return request(path, {
      method: 'DELETE',
    });
  },
};


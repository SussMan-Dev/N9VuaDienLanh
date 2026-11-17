/**
 * API Client — centralized HTTP helper.
 * Attaches Bearer token to every request.
 * On 401: clears token and redirects to /login.
 * Returns { data, error } consistently.
 */

const TOKEN_KEY = 'auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Core fetch wrapper.
 * @param {string} path  - URL path (e.g. '/api/v1/auth/me')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<{ data: any, error: string|null }>}
 */
export async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(path, { ...options, headers });

    // Parse JSON (or text fallback) first
    let body;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    // Handle 401
    if (res.status === 401) {
      const isLoginRequest = path.includes('/auth/login');
      if (isLoginRequest) {
        // This is an invalid credentials response, NOT an expired session
        const message =
          (body && body.error && body.error.message) ||
          (body && body.message) ||
          'Tên đăng nhập hoặc mật khẩu không chính xác.';
        return { data: null, error: message };
      }

      // Expired or invalid session token
      clearToken();

      // Only redirect if on an authenticated/protected route
      const isPublicPath =
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/register');
      if (!isPublicPath) {
        window.location.href = '/login';
      }
      return { data: null, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
    }

    if (!res.ok) {
      // Extract error message from API response shape
      const message =
        (body && body.error && body.error.message) ||
        (body && body.message) ||
        `Lỗi ${res.status}`;
      return { data: null, error: message };
    }

    return { data: body, error: null };
  } catch (err) {
    // Network or parse error
    return { data: null, error: err.message || 'Không thể kết nối đến máy chủ.' };
  }
}

export function get(path, options = {}) {
  return request(path, { ...options, method: 'GET' });
}

export function post(path, body, options = {}) {
  return request(path, { ...options, method: 'POST', body: JSON.stringify(body) });
}

export function put(path, body, options = {}) {
  return request(path, { ...options, method: 'PUT', body: JSON.stringify(body) });
}

export function patch(path, body, options = {}) {
  return request(path, { ...options, method: 'PATCH', body: JSON.stringify(body) });
}

export function del(path, options = {}) {
  return request(path, { ...options, method: 'DELETE' });
}

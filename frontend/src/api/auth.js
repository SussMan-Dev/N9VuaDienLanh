/**
 * Auth API endpoints.
 */
import { get, post, setToken, clearToken } from './client.js';

/**
 * Login with username and password.
 * On success, saves token to localStorage.
 * @returns {Promise<{ data, error }>}
 */
export async function login(username, password) {
  const result = await post('/api/v1/auth/login', { username, password });
  if (result.data && result.data.token) {
    setToken(result.data.token);
  }
  return result;
}

/**
 * Logout — revoke session on server and clear local token.
 * @returns {Promise<{ data, error }>}
 */
export async function logout() {
  const result = await post('/api/v1/auth/logout', {});
  clearToken();
  return result;
}

/**
 * Register a new customer account.
 * @returns {Promise<{ data, error }>}
 */
export async function register(payload) {
  return post('/api/v1/auth/register', payload);
}

/**
 * Fetch current authenticated user info.
 * @returns {Promise<{ data: { user, roles, permissions, branchId }, error }>}
 */
export async function getMe() {
  return get('/api/v1/auth/me');
}

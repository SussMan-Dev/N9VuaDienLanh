import { get, post } from './client';

export function login(username: string, password: string) {
  return post('/api/v1/auth/login', { username, password });
}

export function register(payload: {
  fullName: string;
  phone: string;
  username: string;
  password: string;
  email?: string;
  address?: string;
}) {
  return post('/api/v1/auth/register', payload);
}

export function getMe() {
  return get('/api/v1/auth/me');
}

export function logout() {
  return post('/api/v1/auth/logout');
}

export function changePassword(currentPassword: string, newPassword: string) {
  return post('/api/v1/auth/change-password', { currentPassword, newPassword });
}

/**
 * HTTP Client cho Mobile App.
 * - Dùng axios thay vì fetch (hỗ trợ interceptor và timeout tốt hơn trên mobile).
 * - Token được lưu trong expo-secure-store (mã hóa hardware-backed).
 * - Tự động đính kèm Bearer token vào mọi request.
 * - Tự động nhận diện IP máy chủ qua Expo hostUri hoặc IP mạng LAN (192.168.1.101).
 * - Cho phép cấu hình linh hoạt địa chỉ máy chủ.
 */
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

export const TOKEN_KEY = 'auth_token';
export const SERVER_URL_KEY = 'custom_server_url';

/** Tự động xác định địa chỉ IP máy chủ của máy tính */
export function getDefaultBaseUrl(): string {
  // 1. Lấy IP host từ Expo Dev Server nếu chạy qua Expo Go
  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
    return `http://${expoHost}:3000`;
  }
  // 2. IP LAN thực tế của máy chủ đang chạy backend
  return 'http://192.168.1.101:3000';
}

let currentBaseUrl = getDefaultBaseUrl();

export function getBaseUrl(): string {
  return currentBaseUrl;
}

export function setBaseUrl(url: string): void {
  currentBaseUrl = url.replace(/\/+$/, '');
  apiClient.defaults.baseURL = currentBaseUrl;
}

export async function saveCustomServerUrl(url: string): Promise<void> {
  setBaseUrl(url);
  await SecureStore.setItemAsync(SERVER_URL_KEY, currentBaseUrl);
}

export async function initServerUrl(): Promise<string> {
  try {
    const saved = await SecureStore.getItemAsync(SERVER_URL_KEY);
    if (saved && saved.startsWith('http')) {
      setBaseUrl(saved);
      return saved;
    }
  } catch {}
  return currentBaseUrl;
}

export const apiClient = axios.create({
  baseURL: currentBaseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: cập nhật baseURL mới nhất và đính kèm Bearer token
apiClient.interceptors.request.use(async (config) => {
  config.baseURL = currentBaseUrl;
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: xử lý 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

/** Kiểm tra kết nối tới máy chủ */
export async function testServerConnection(targetUrl?: string): Promise<{ ok: boolean; message: string }> {
  const url = (targetUrl || currentBaseUrl).replace(/\/+$/, '');
  try {
    const res = await axios.get(`${url}/api/v1/health`, { timeout: 4000 });
    if (res.data?.status === 'ok') {
      return { ok: true, message: `✅ Đã kết nối thành công tới ${url}` };
    }
    return { ok: false, message: `⚠️ Máy chủ phản hồi khác: ${JSON.stringify(res.data)}` };
  } catch (err: any) {
    return {
      ok: false,
      message: `❌ Không kết nối được tới ${url}. Vui lòng kiểm tra điện thoại và máy tính đã kết nối chung 1 mạng Wi-Fi chưa. (${err.message})`,
    };
  }
}

/** Wrapper tiêu chuẩn trả về { data, error } */
export async function request<T = any>(
  path: string,
  options: AxiosRequestConfig = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await apiClient({ url: path, ...options });
    return { data: res.data as T, error: null };
  } catch (err: any) {
    const axiosErr = err as AxiosError<any>;
    const message =
      axiosErr.response?.data?.error?.message ||
      axiosErr.response?.data?.message ||
      axiosErr.message ||
      'Không thể kết nối đến máy chủ.';
    return { data: null, error: message };
  }
}

export function get<T = any>(path: string, params?: Record<string, any>) {
  return request<T>(path, { method: 'GET', params });
}

export function post<T = any>(path: string, body?: any) {
  return request<T>(path, { method: 'POST', data: body });
}

export function put<T = any>(path: string, body?: any) {
  return request<T>(path, { method: 'PUT', data: body });
}

export function patch<T = any>(path: string, body?: any) {
  return request<T>(path, { method: 'PATCH', data: body });
}

export function del<T = any>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

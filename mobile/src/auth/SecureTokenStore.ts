import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export const TOKEN_KEY = 'auth_token';
export const USERNAME_KEY = 'remembered_username';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Lưu username để ghi nhớ đăng nhập */
export async function saveRememberedUsername(username: string): Promise<void> {
  await SecureStore.setItemAsync(USERNAME_KEY, username);
}

export async function getRememberedUsername(): Promise<string | null> {
  return SecureStore.getItemAsync(USERNAME_KEY);
}

export async function clearRememberedUsername(): Promise<void> {
  await SecureStore.deleteItemAsync(USERNAME_KEY);
}

/** Kiểm tra thiết bị có hỗ trợ sinh trắc học (Face ID / vân tay) */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** Xác thực sinh trắc học và trả về kết quả */
export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Đăng nhập bằng vân tay hoặc Face ID',
    fallbackLabel: 'Dùng mật khẩu',
    disableDeviceFallback: false,
  });
  return result.success;
}

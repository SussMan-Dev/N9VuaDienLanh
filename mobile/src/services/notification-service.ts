/**
 * Notification Service — Mobile
 * Đăng ký Expo Push Token sau khi đăng nhập, lắng nghe thông báo đến.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

// Hiển thị thông báo ngay cả khi app đang mở foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Yêu cầu quyền thông báo và trả về Expo Push Token.
 * Trả về null nếu không được cấp quyền hoặc thiết bị không hỗ trợ.
 */
export async function requestPushPermission(): Promise<string | null> {
  // Chỉ thực thi trên thiết bị thật (không chạy trên simulator)
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return null;
  }

  // Cấu hình Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Vua Sửa Chữa',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1d4ed8',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (err) {
    // Trên simulator không có push token thật
    console.warn('[Notifications] Cannot get push token:', (err as Error).message);
    return null;
  }
}

/**
 * Đăng ký push token lên backend sau khi đăng nhập thành công.
 */
export async function registerPushToken(): Promise<void> {
  const token = await requestPushPermission();
  if (!token) return;

  try {
    await apiClient.post('/api/v1/notifications/device-token', {
      token,
      deviceType: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
    console.log('[Notifications] Push token registered:', token.substring(0, 30) + '...');
  } catch (err: any) {
    // Không block flow đăng nhập nếu đăng ký token thất bại
    console.warn('[Notifications] Failed to register push token:', err?.message);
  }
}

/**
 * Hủy đăng ký push token khi đăng xuất.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData) return;
    await apiClient.delete('/api/v1/notifications/device-token', {
      data: { token: tokenData.data },
    });
  } catch {
    // ignore — đăng xuất vẫn tiếp tục dù xóa token thất bại
  }
}

/**
 * Thêm listener khi nhận thông báo (foreground).
 * Trả về subscription để có thể remove sau.
 */
export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Thêm listener khi người dùng bấm vào thông báo.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

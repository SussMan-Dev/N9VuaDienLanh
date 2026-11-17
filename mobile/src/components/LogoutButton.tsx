import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';

interface Props {
  style?: any;
  textStyle?: any;
}

export default function LogoutButton({ style, textStyle }: Props) {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.btn, style]}
      onPress={handleLogout}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.text, textStyle]}>🚪 Đăng xuất</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

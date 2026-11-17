import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../auth/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const roleLabel: Record<string, string> = {
    ADMIN: '🛡 Quản trị viên',
    MANAGER: '👔 Quản lý',
    TECHNICIAN: '🔧 Kỹ thuật viên',
    RECEPTIONIST: '🗒 Lễ tân',
    WAREHOUSE_STAFF: '📦 Thủ kho',
    ACCOUNTANT: '💰 Kế toán',
    CUSTOMER: '👤 Khách hàng',
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 48 }}>👤</Text>
      </View>
      <Text style={styles.name}>{user?.fullName ?? 'Người dùng'}</Text>
      <Text style={styles.username}>@{user?.username}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{roleLabel[user?.primaryRole ?? ''] ?? user?.primaryRole}</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 60, backgroundColor: '#f8fafc', paddingHorizontal: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  name: { fontSize: 22, fontWeight: '700', color: '#1e293b' },
  username: { fontSize: 15, color: '#64748b', marginTop: 4 },
  roleBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  roleText: { color: '#1d4ed8', fontWeight: '600', fontSize: 14 },
  logoutBtn: {
    marginTop: 48, backgroundColor: '#fee2e2', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 48,
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 16 },
});

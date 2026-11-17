import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { register } from '../../api/auth';
import { useAuth } from '../../auth/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { login } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      Alert.alert('Lỗi nhập liệu', 'Tên đăng nhập phải có tối thiểu 3 ký tự.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Lỗi nhập liệu', 'Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi nhập liệu', 'Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);
    const res = await register({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      username: username.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (res.error) {
      Alert.alert('Đăng ký thất bại', res.error);
      return;
    }

    Alert.alert('Đăng ký thành công', 'Tài khoản của bạn đã được tạo! Hệ thống sẽ tự động đăng nhập.', [
      {
        text: 'Bắt đầu ngay',
        onPress: async () => {
          await login(username.trim().toLowerCase(), password);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>👑 Vua Sửa Chữa</Text>
          <Text style={styles.title}>Tạo tài khoản Khách hàng</Text>
          <Text style={styles.subtitle}>Đặt lịch sửa chữa & theo dõi bảo hành tại nhà</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Số điện thoại *</Text>
          <TextInput
            style={styles.input}
            placeholder="0901234567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Địa chỉ nhà (để thợ đến phục vụ)</Text>
          <TextInput
            style={styles.input}
            placeholder="Số nhà, đường, phường, quận..."
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Tên đăng nhập *</Text>
          <TextInput
            style={styles.input}
            placeholder="username_cua_ban"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mật khẩu (tối thiểu 6 ký tự) *</Text>
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Xác nhận mật khẩu *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Đăng Ký Tài Khoản</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Đã có tài khoản? <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 24, fontWeight: '800', color: '#1d4ed8', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 12,
  },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: {
    padding: 10, borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { marginTop: 18, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: '#64748b' },
});

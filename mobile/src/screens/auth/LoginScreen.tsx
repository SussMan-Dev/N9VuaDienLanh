import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import {
  isBiometricAvailable, authenticateWithBiometric,
  saveRememberedUsername, getRememberedUsername,
} from '../../auth/SecureTokenStore';
import {
  getBaseUrl, saveCustomServerUrl, testServerConnection,
} from '../../api/client';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Cài đặt địa chỉ máy chủ
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const remembered = await getRememberedUsername();
      if (remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
      setBiometricAvailable(await isBiometricAvailable());
      // Tự động kiểm tra kết nối với máy chủ khi mở màn hình
      checkConnection(getBaseUrl());
    })();
  }, []);

  const checkConnection = async (urlToCheck?: string) => {
    setTestingConnection(true);
    const result = await testServerConnection(urlToCheck || serverUrl);
    setConnectionStatus(result);
    setTestingConnection(false);
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrl.trim().startsWith('http')) {
      Alert.alert('Địa chỉ không hợp lệ', 'Địa chỉ máy chủ phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    await saveCustomServerUrl(serverUrl.trim());
    await checkConnection(serverUrl.trim());
    Alert.alert('Đã lưu', `Đã cập nhật máy chủ: ${serverUrl.trim()}`);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }
    setLoading(true);
    setError(null);
    if (rememberMe) {
      await saveRememberedUsername(username.trim());
    }
    const { error: loginErr } = await login(username.trim(), password);
    setLoading(false);
    if (loginErr) {
      setError(loginErr);
      if (loginErr.includes('kết nối') || loginErr.includes('Network Error') || loginErr.includes('Lỗi')) {
        setShowServerConfig(true);
        checkConnection();
      }
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  const handleBiometricLogin = async () => {
    const success = await authenticateWithBiometric();
    if (!success) {
      Alert.alert('Xác thực thất bại', 'Vui lòng thử lại hoặc dùng mật khẩu.');
      return;
    }
    Alert.alert('✅ Xác thực thành công', 'Đang tải thông tin tài khoản...');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>👑</Text>
          <Text style={styles.brandName}>Vua Sửa Chữa</Text>
          <Text style={styles.tagline}>Hệ thống Quản lý Sửa chữa Điện lạnh</Text>
        </View>

        {/* Form Đăng nhập */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>

          {/* Trạng thái kết nối máy chủ (chỉ cảnh báo khi mất kết nối) */}
          {connectionStatus && !connectionStatus.ok && (
            <TouchableOpacity
              style={[styles.statusBox, styles.statusError]}
              onPress={() => setShowServerConfig(true)}
            >
              <Text style={[styles.statusText, styles.statusTextError]}>
                ⚠️ Mất kết nối máy chủ — Bấm để cài đặt
              </Text>
            </TouchableOpacity>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              {error.includes('kết nối') && (
                <Text style={styles.errorGuide}>
                  💡 Hãy đảm bảo điện thoại và máy tính đang kết nối chung mạng Wi-Fi và backend đang chạy.
                </Text>
              )}
            </View>
          )}

          <Text style={styles.label}>Tên đăng nhập</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Ví dụ: admin, ktv_dung..."
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Nhập mật khẩu..."
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Text style={{ fontSize: 20 }}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
            </View>
            <Text style={styles.rememberLabel}>Ghi nhớ tên đăng nhập</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>🔑 Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
              <Text style={styles.biometricText}>🔒 Đăng nhập bằng Vân tay / Face ID</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation?.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              Chưa có tài khoản? <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>

          {/* Điền nhanh tài khoản mẫu */}
          <View style={styles.quickFillSection}>
            <Text style={styles.quickFillTitle}>Chọn nhanh tài khoản thử nghiệm:</Text>
            <View style={styles.quickFillRow}>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickFill('admin', 'Admin@12345678')}>
                <Text style={styles.quickPillText}>🛡 Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickFill('kh_tuanhm', 'password123')}>
                <Text style={styles.quickPillText}>👤 Khách hàng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickFill('ktv_tuan', 'password123')}>
                <Text style={styles.quickPillText}>🔧 KTV Tuấn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickFill('ktv_dung', 'password123')}>
                <Text style={styles.quickPillText}>🔧 KTV Dũng</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickFill('letan_mai', 'password123')}>
                <Text style={styles.quickPillText}>🗒 Lễ tân Mai</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickFill('thukho_an', 'password123')}>
                <Text style={styles.quickPillText}>📦 Thủ kho</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickFill('ketoan_hoa', 'password123')}>
                <Text style={styles.quickPillText}>💰 Kế toán</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cài đặt Server URL */}
          <TouchableOpacity
            style={styles.serverToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.serverToggleText}>
              ⚙️ {showServerConfig ? 'Ẩn cài đặt máy chủ' : 'Cấu hình địa chỉ máy chủ (Server URL)'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverConfigBox}>
              <Text style={styles.serverConfigLabel}>Địa chỉ Backend (IP máy tính:3000):</Text>
              <TextInput
                style={styles.serverInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="http://192.168.1.101:3000"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.testBtn, testingConnection && styles.btnDisabled]}
                  onPress={() => checkConnection(serverUrl)}
                  disabled={testingConnection}
                >
                  <Text style={styles.testBtnText}>
                    {testingConnection ? 'Đang test...' : '🔍 Kiểm tra'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveUrlBtn} onPress={handleSaveServerUrl}>
                  <Text style={styles.saveUrlBtnText}>💾 Lưu địa chỉ</Text>
                </TouchableOpacity>
              </View>
              {connectionStatus && (
                <Text style={[styles.serverStatusMsg, connectionStatus.ok ? { color: '#16a34a' } : { color: '#dc2626' }]}>
                  {connectionStatus.message}
                </Text>
              )}
            </View>
          )}
        </View>

        <Text style={styles.footer}>© 2026 Vua Sửa Chữa — Phiên bản 1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1d4ed8' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 52 },
  brandName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 6 },
  tagline: { fontSize: 13, color: '#bfdbfe', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  statusBox: { padding: 10, borderRadius: 8, marginBottom: 12 },
  statusOk: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  statusError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextOk: { color: '#166534' },
  statusTextError: { color: '#991b1b' },
  errorBox: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '600' },
  errorGuide: { color: '#7f1d1d', fontSize: 12, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: '#1e293b', backgroundColor: '#f8fafc', marginBottom: 12,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    borderColor: '#94a3b8', marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  rememberLabel: { color: '#475569', fontSize: 14 },
  loginBtn: {
    backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 13,
    alignItems: 'center', marginBottom: 10,
  },
  loginBtnDisabled: { backgroundColor: '#93c5fd' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  biometricBtn: {
    borderWidth: 1.5, borderColor: '#1d4ed8', borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', marginBottom: 14,
  },
  biometricText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
  registerLink: { marginTop: 4, marginBottom: 12, alignItems: 'center', paddingVertical: 6 },
  registerLinkText: { fontSize: 13, color: '#64748b' },
  quickFillSection: { marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  quickFillTitle: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 8 },
  quickFillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickPill: { backgroundColor: '#eff6ff', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#dbeafe' },
  quickPillText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  serverToggle: { marginTop: 14, alignItems: 'center', paddingVertical: 6 },
  serverToggleText: { fontSize: 12, color: '#64748b', textDecorationLine: 'underline' },
  serverConfigBox: { marginTop: 10, backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  serverConfigLabel: { fontSize: 12, fontWeight: '600', color: '#334151', marginBottom: 6 },
  serverInput: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13,
    backgroundColor: '#fff', color: '#1e293b', marginBottom: 6,
  },
  testBtn: { flex: 1, backgroundColor: '#0284c7', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  testBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  saveUrlBtn: { flex: 1, backgroundColor: '#10b981', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  saveUrlBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  btnDisabled: { opacity: 0.6 },
  serverStatusMsg: { fontSize: 11, marginTop: 6 },
  footer: { textAlign: 'center', color: '#93c5fd', fontSize: 12, marginTop: 20 },
});

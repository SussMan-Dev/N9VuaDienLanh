import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createServiceRequest, getDeviceTypes } from '../../api/customer-portal';
import { useAuth } from '../../auth/AuthContext';

const DEFAULT_TYPES = [
  { id: 1, name: 'Máy điều hòa' },
  { id: 2, name: 'Tủ lạnh' },
  { id: 3, name: 'Máy giặt' },
  { id: 4, name: 'Máy nước nóng' },
  { id: 5, name: 'Máy sấy' },
  { id: 6, name: 'Máy hút ẩm' },
];

export default function CreateBookingScreen({ navigation }: any) {
  const { user } = useAuth();
  const [deviceTypes, setDeviceTypes] = useState<any[]>(DEFAULT_TYPES);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(1);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone ?? '');
  const [addressLine, setAddressLine] = useState('');
  const [preferredOption, setPreferredOption] = useState('Sáng mai (8h - 11h)');
  const [images, setImages] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await getDeviceTypes();
      if (data && Array.isArray(data) && data.length > 0) {
        setDeviceTypes(data);
        if (!selectedTypeId) setSelectedTypeId(data[0].id);
      }
    })();
  }, []);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền Camera để chụp ảnh thiết bị hỏng.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const photoUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setImages([...images, photoUri]);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền xem Thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const photoUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setImages([...images, photoUri]);
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!issueDescription.trim() || issueDescription.trim().length < 3) {
      Alert.alert('Thiếu thông tin', 'Vui lòng mô tả chi tiết lỗi của thiết bị (tối thiểu 3 ký tự).');
      return;
    }

    // Tính thời gian hẹn ISO
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(9, 0, 0, 0);
    const isoDateTime = tomorrow.toISOString();

    setSubmitting(true);
    const res = await createServiceRequest({
      deviceTypeId: selectedTypeId ?? undefined,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      issueDescription: issueDescription.trim(),
      contactPhone: contactPhone.trim() || undefined,
      addressLine: addressLine.trim() || undefined,
      preferredDatetime: isoDateTime,
      images: images.length > 0 ? images : undefined,
    });
    setSubmitting(false);

    if (res.error) {
      Alert.alert('Lỗi đặt lịch', res.error);
    } else {
      // Reset form sau khi gửi thành công
      setIssueDescription('');
      setImages([]);
      setBrand('');
      setModel('');

      Alert.alert(
        '🎉 Đặt lịch thành công!',
        `Phiếu sửa chữa #${res.data?.orderCode || res.data?.orderId || ''} đã được gửi tới cửa hàng và đang ở trạng thái Chờ tiếp nhận (GĐ 1). Kỹ thuật viên sẽ liên hệ sớm nhất!`,
        [
          {
            text: 'Xem đơn của tôi',
            onPress: () => navigation.navigate('MyOrders'),
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📱 Đặt Lịch Sửa Chữa Tận Nơi</Text>
        <Text style={styles.headerSub}>Báo giá 2 tầng minh bạch • Khách duyệt giá mới sửa • Bảo hành điện tử</Text>
      </View>

      {/* Chọn loại thiết bị */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. Chọn loại thiết bị *</Text>
        {loadingTypes ? (
          <ActivityIndicator size="small" color="#1d4ed8" />
        ) : (
          <View style={styles.typesRow}>
            {deviceTypes.map((dt) => {
              const active = selectedTypeId === dt.id;
              return (
                <TouchableOpacity
                  key={dt.id}
                  style={[styles.typePill, active && styles.typePillActive]}
                  onPress={() => setSelectedTypeId(dt.id)}
                >
                  <Text style={[styles.typePillText, active && styles.typePillTextActive]}>
                    {dt.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hãng / Thương hiệu</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Daikin, LG..."
              value={brand}
              onChangeText={setBrand}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Model (nếu biết)</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Inverter 1.5HP..."
              value={model}
              onChangeText={setModel}
            />
          </View>
        </View>
      </View>

      {/* Mô tả lỗi & Chụp ảnh */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Mô tả hiện tượng hỏng hóc *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ví dụ: Máy giặt vắt kêu to bất thường, không vắt khô được nước, có mùi khét nhẹ..."
          multiline
          numberOfLines={4}
          value={issueDescription}
          onChangeText={setIssueDescription}
        />

        <View style={styles.photoHeader}>
          <Text style={styles.label}>Đính kèm ảnh chụp máy hỏng (nếu có):</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity style={styles.smallPhotoBtn} onPress={handleTakePhoto}>
              <Text style={styles.smallPhotoText}>📷 Chụp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallPhotoOutline} onPress={handlePickPhoto}>
              <Text style={styles.smallPhotoOutlineText}>🖼️ Thư viện</Text>
            </TouchableOpacity>
          </View>
        </View>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
            {images.map((uri, idx) => (
              <View key={idx} style={styles.thumbWrapper}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.deleteBadge} onPress={() => handleRemovePhoto(idx)}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Thời gian & Địa chỉ liên hệ */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3. Thông tin liên hệ & Thời gian hẹn</Text>

        <Text style={styles.label}>Khung giờ mong muốn thợ tới:</Text>
        <View style={styles.presetRow}>
          {['Sáng mai (8h - 11h)', 'Chiều mai (14h - 17h)', 'Cuối tuần này', 'Hôm nay (Gấp)'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.presetPill, preferredOption === opt && styles.presetPillActive]}
              onPress={() => setPreferredOption(opt)}
            >
              <Text style={[styles.presetText, preferredOption === opt && styles.presetTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Số điện thoại liên hệ</Text>
        <TextInput
          style={styles.input}
          placeholder="Số điện thoại nhận cuộc gọi của thợ..."
          keyboardType="phone-pad"
          value={contactPhone}
          onChangeText={setContactPhone}
        />

        <Text style={styles.label}>Địa chỉ nhà bạn</Text>
        <TextInput
          style={styles.input}
          placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
          value={addressLine}
          onChangeText={setAddressLine}
        />
      </View>

      {/* Nút gửi yêu cầu */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>📅 Xác Nhận Đặt Lịch Sửa Chữa</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  typesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typePillActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  typePillText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  typePillTextActive: { color: '#ffffff', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#334151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  smallPhotoBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  smallPhotoText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  smallPhotoOutline: { borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  smallPhotoOutlineText: { color: '#475569', fontWeight: '600', fontSize: 11 },
  thumbnailRow: { flexDirection: 'row', marginTop: 10 },
  thumbWrapper: { position: 'relative', marginRight: 10 },
  thumbnail: { width: 75, height: 75, borderRadius: 8, backgroundColor: '#e2e8f0' },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetPill: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  presetPillActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  presetText: { fontSize: 12, color: '#475569' },
  presetTextActive: { color: '#1d4ed8', fontWeight: '700' },
  submitBtn: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnDisabled: { backgroundColor: '#93c5fd' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createRepairLog } from '../../api/repair-logs';

export default function CameraLogScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [workPerformed, setWorkPerformed] = useState('');
  const [diagnosticDetails, setDiagnosticDetails] = useState('');
  const [imagesBefore, setImagesBefore] = useState<string[]>([]);
  const [imagesAfter, setImagesAfter] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Chụp ảnh từ camera
  const handleTakePhoto = async (type: 'before' | 'after') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền Camera để chụp ảnh thiết bị.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6, // Nén ảnh 60% để tiết kiệm băng thông và bộ nhớ
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      // Nếu có base64 thì dùng định dạng data URL, nếu không thì dùng uri
      const photoUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      if (type === 'before') {
        setImagesBefore([...imagesBefore, photoUri]);
      } else {
        setImagesAfter([...imagesAfter, photoUri]);
      }
    }
  };

  // Chọn ảnh từ thư viện
  const handlePickPhoto = async (type: 'before' | 'after') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền xem Thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const photoUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      if (type === 'before') {
        setImagesBefore([...imagesBefore, photoUri]);
      } else {
        setImagesAfter([...imagesAfter, photoUri]);
      }
    }
  };

  const handleRemovePhoto = (type: 'before' | 'after', index: number) => {
    if (type === 'before') {
      setImagesBefore(imagesBefore.filter((_, i) => i !== index));
    } else {
      setImagesAfter(imagesAfter.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    if (!workPerformed.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập nội dung công việc đã thực hiện.');
      return;
    }

    setSubmitting(true);
    const res = await createRepairLog(orderId, {
      workPerformed: workPerformed.trim(),
      diagnosticDetails: diagnosticDetails.trim() || undefined,
      imagesBefore: imagesBefore.length > 0 ? imagesBefore : undefined,
      imagesAfter: imagesAfter.length > 0 ? imagesAfter : undefined,
    });
    setSubmitting(false);

    if (res.error) {
      Alert.alert('Lỗi lưu nhật ký', res.error);
    } else {
      Alert.alert('Thành công', 'Đã lưu nhật ký sửa chữa và hình ảnh đối chiếu!');
      navigation.goBack();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.headerTitle}>📸 Ghi Nhật Ký & Ảnh Đối Chiếu</Text>
      <Text style={styles.headerSub}>Lưu ảnh hiện trạng trước và sau khi xử lý để minh bạch với khách.</Text>

      {/* Nội dung công việc */}
      <View style={styles.card}>
        <Text style={styles.label}>Nội dung công việc đã làm *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ví dụ: Đã tháo lồng giặt, thay chổi than motor, tra dầu bạc đạn..."
          multiline
          numberOfLines={4}
          value={workPerformed}
          onChangeText={setWorkPerformed}
        />

        <Text style={styles.label}>Ghi chú kỹ thuật bổ sung (nếu có)</Text>
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder="Ghi chú nguyên nhân hỏng, mức độ hao mòn..."
          multiline
          value={diagnosticDetails}
          onChangeText={setDiagnosticDetails}
        />
      </View>

      {/* Ảnh trước sửa chữa */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📷 Ảnh Trước Sửa Chữa ({imagesBefore.length})</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.smallBtn} onPress={() => handleTakePhoto('before')}>
              <Text style={styles.smallBtnText}>📷 Chụp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtnOutline} onPress={() => handlePickPhoto('before')}>
              <Text style={styles.smallBtnOutlineText}>🖼️ Thư viện</Text>
            </TouchableOpacity>
          </View>
        </View>

        {imagesBefore.length === 0 ? (
          <Text style={styles.placeholderText}>Chưa có ảnh. Chụp hiện trạng linh kiện cũ, vết nứt, gãy trước khi sửa.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
            {imagesBefore.map((uri, idx) => (
              <View key={idx} style={styles.thumbWrapper}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.deleteBadge} onPress={() => handleRemovePhoto('before', idx)}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Ảnh sau sửa chữa */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>✨ Ảnh Sau Sửa Chữa ({imagesAfter.length})</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#16a34a' }]} onPress={() => handleTakePhoto('after')}>
              <Text style={styles.smallBtnText}>📷 Chụp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtnOutline} onPress={() => handlePickPhoto('after')}>
              <Text style={styles.smallBtnOutlineText}>🖼️ Thư viện</Text>
            </TouchableOpacity>
          </View>
        </View>

        {imagesAfter.length === 0 ? (
          <Text style={styles.placeholderText}>Chưa có ảnh. Chụp máy đã thay linh kiện mới, máy chạy thử nghiệm thu.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailRow}>
            {imagesAfter.map((uri, idx) => (
              <View key={idx} style={styles.thumbWrapper}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.deleteBadge} onPress={() => handleRemovePhoto('after', idx)}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Nút lưu nhật ký */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>💾 Lưu Nhật Ký & Ảnh Nghiệm Thu</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 14 },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  buttonGroup: { flexDirection: 'row', gap: 6 },
  smallBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  smallBtnOutline: { borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  smallBtnOutlineText: { color: '#475569', fontWeight: '600', fontSize: 11 },
  label: { fontSize: 13, fontWeight: '600', color: '#334151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  textArea: { height: 90 },
  placeholderText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginVertical: 8 },
  thumbnailRow: { flexDirection: 'row', marginTop: 4 },
  thumbWrapper: { position: 'relative', marginRight: 10 },
  thumbnail: { width: 84, height: 84, borderRadius: 8, backgroundColor: '#e2e8f0' },
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
  submitBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: { backgroundColor: '#93c5fd' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

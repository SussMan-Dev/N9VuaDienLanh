import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { listPartsRequests, approvePartsRequest, rejectPartsRequest, issuePartsRequest } from '../../api/parts-requests';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../auth/AuthContext';

export default function WarehouseDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'REQUESTED' | 'ISSUED'>('REQUESTED');

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const res = await listPartsRequests({ status: activeTab });
    if (res.data?.items) {
      setRequests(res.data.items);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleIssue = async (requestId: number) => {
    Alert.alert('Xác nhận xuất kho', 'Duyệt và xuất kho thực tế các linh kiện này cho KTV (tự động trừ tồn kho)?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: '📦 Xuất kho ngay',
        onPress: async () => {
          setSubmitting(true);
          // First approve if needed, then issue
          await approvePartsRequest(requestId, 'Thủ kho phê duyệt');
          const res = await issuePartsRequest(requestId);
          setSubmitting(false);

          if (res.error) {
            Alert.alert('Xuất kho thất bại', res.error);
          } else {
            Alert.alert('Thành công', 'Đã xuất kho linh kiện và cập nhật tồn kho nguyên tử.');
            loadData();
          }
        },
      },
    ]);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Thiếu lý do', 'Vui lòng nhập lý do từ chối yêu cầu.');
      return;
    }
    setSubmitting(true);
    const res = await rejectPartsRequest(selectedRequestId!, rejectReason.trim());
    setSubmitting(false);
    setRejectModal(false);

    if (res.error) {
      Alert.alert('Lỗi', res.error);
    } else {
      Alert.alert('Đã từ chối', 'Đã từ chối cấp phát linh kiện và trả về thông báo cho KTV.');
      loadData();
    }
  };

  return (
    <View style={styles.container}>
      {/* Modal Từ Chối */}
      <Modal visible={rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✕ Từ chối cấp linh kiện</Text>
            <Text style={styles.modalSub}>Nhập lý do không thể xuất kho (VD: hết hàng trong kho, sai quy cách...):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập lý do chi tiết..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModal(false)}>
                <Text style={{ color: '#64748b', fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitReject} disabled={submitting}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? 'Đang gửi...' : 'Xác nhận từ chối'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Greeting Banner */}
      <View style={styles.userBanner}>
        <View>
          <Text style={styles.greetingText}>📦 Quản lý Kho Vật Tư</Text>
          <Text style={styles.subGreeting}>Thủ kho: {user?.fullName || 'Nhân viên kho'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>THỦ KHO</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'REQUESTED' && styles.tabActive]}
          onPress={() => setActiveTab('REQUESTED')}
        >
          <Text style={[styles.tabText, activeTab === 'REQUESTED' && styles.tabTextActive]}>
            ⏳ Chờ Xuất Kho
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ISSUED' && styles.tabActive]}
          onPress={() => setActiveTab('ISSUED')}
        >
          <Text style={[styles.tabText, activeTab === 'ISSUED' && styles.tabTextActive]}>
            ✅ Đã Xuất
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 40 }}>📦</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'REQUESTED' ? 'Không có yêu cầu linh kiện nào chờ xuất' : 'Chưa có lịch sử xuất kho'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.requestCode}>Yêu cầu #{item.id}</Text>
                <Text style={styles.orderCode}>Phiếu: #{item.repairOrderId}</Text>
              </View>
              <Text style={styles.techName}>KTV đề xuất: {item.requestedByName || item.requestedByUserId}</Text>
              <Text style={styles.date}>Ngày tạo: {formatDate(item.createdAt)}</Text>
              {item.notes && <Text style={styles.notes}>Ghi chú: {item.notes}</Text>}

              {/* Items List */}
              {item.items && item.items.length > 0 && (
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsTitle}>Linh kiện cần cấp:</Text>
                  {item.items.map((it: any, idx: number) => (
                    <Text key={idx} style={styles.itemLine}>
                      • {it.itemName || it.inventoryItemName || `Item #${it.inventoryItemId}`} (x{it.quantityRequested})
                    </Text>
                  ))}
                </View>
              )}

              {/* Actions */}
              {activeTab === 'REQUESTED' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnReject]}
                    onPress={() => {
                      setSelectedRequestId(item.id);
                      setRejectReason('');
                      setRejectModal(true);
                    }}
                  >
                    <Text style={styles.btnRejectText}>✕ Từ chối</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnIssue]}
                    onPress={() => handleIssue(item.id)}
                  >
                    <Text style={styles.btnIssueText}>📦 Xuất kho</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  userBanner: {
    backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greetingText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  subGreeting: { fontSize: 12, color: '#64748b', marginTop: 2 },
  roleBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#b45309', fontSize: 11, fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1d4ed8' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#1d4ed8', fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 15, color: '#64748b', marginTop: 8 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  requestCode: { fontWeight: '700', fontSize: 15, color: '#1e293b' },
  orderCode: { fontWeight: '600', fontSize: 13, color: '#1d4ed8' },
  techName: { fontSize: 13, color: '#334155', fontWeight: '600' },
  date: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  notes: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 4 },
  itemsBox: { marginTop: 8, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8 },
  itemsTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 2 },
  itemLine: { fontSize: 12, color: '#334155', marginVertical: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnReject: { backgroundColor: '#fee2e2' },
  btnRejectText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  btnIssue: { backgroundColor: '#10b981' },
  btnIssueText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '800', fontSize: 16, color: '#dc2626', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#475569', marginBottom: 10 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#dc2626' },
});

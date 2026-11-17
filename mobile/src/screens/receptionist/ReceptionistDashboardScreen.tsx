import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Linking, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listRepairOrders, transitionStatus, assignTechnician, listTechnicians } from '../../api/repairs';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../auth/AuthContext';

export default function ReceptionistDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACCEPTED'>('PENDING');

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Assign Modal State
  const [assignModal, setAssignModal] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [techsLoading, setTechsLoading] = useState(false);
  const [assignNotes, setAssignNotes] = useState('Phân công KTV xử lý');

  const loadData = useCallback(async () => {
    const res = await listRepairOrders({ repairStatus: activeTab, limit: 30 });
    if (res.data?.items) {
      setOrders(res.data.items);
    }
  }, [activeTab]);

  const loadTechs = async () => {
    setTechsLoading(true);
    const res = await listTechnicians();
    if (res.data?.items && res.data.items.length > 0) {
      setTechnicians(res.data.items);
      if (!selectedTechId) {
        setSelectedTechId(res.data.items[0].id);
      }
    }
    setTechsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setLoading(false));
      loadTechs();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadTechs()]);
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const handleAccept = async (orderId: number) => {
    Alert.alert('Xác nhận tiếp nhận', 'Chấp nhận đơn hàng này và chuyển sang trạng thái ĐÃ TIẾP NHẬN để phân công KTV?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: '✅ Tiếp nhận ngay',
        onPress: async () => {
          setActionLoading(true);
          const res = await transitionStatus(orderId, 'ACCEPTED', 'Lễ tân tiếp nhận đơn');
          setActionLoading(false);
          if (res.error) {
            Alert.alert('Lỗi', res.error);
          } else {
            Alert.alert(
              'Tiếp nhận thành công',
              'Đơn hàng đã chuyển sang ĐÃ TIẾP NHẬN (ACCEPTED). Admin hoặc Lễ tân có thể phân công Kỹ thuật viên phụ trách.'
            );
            loadData();
          }
        },
      },
    ]);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập lý do từ chối tiếp nhận.');
      return;
    }
    setActionLoading(true);
    const res = await transitionStatus(selectedOrderId!, 'REJECTED', rejectReason.trim());
    setActionLoading(false);
    setRejectModal(false);
    if (res.error) {
      Alert.alert('Lỗi', res.error);
    } else {
      Alert.alert('Đã từ chối', 'Đơn hàng đã được ghi nhận từ chối kèm lý do.');
      loadData();
    }
  };

  const openAssignModal = (orderId: number) => {
    setSelectedOrderId(orderId);
    setAssignNotes('Phân công KTV xử lý');
    setAssignModal(true);
    if (technicians.length === 0) {
      loadTechs();
    }
  };

  const submitAssign = async () => {
    if (!selectedTechId) {
      Alert.alert('Chưa chọn KTV', 'Vui lòng chọn Kỹ thuật viên từ danh sách.');
      return;
    }
    const chosenTech = technicians.find((t) => t.id === selectedTechId);
    const techName = chosenTech?.fullName || chosenTech?.username || `ID ${selectedTechId}`;

    setActionLoading(true);
    const res = await assignTechnician(selectedOrderId!, selectedTechId, assignNotes.trim());
    setActionLoading(false);
    setAssignModal(false);
    if (res.error) {
      Alert.alert('Lỗi', res.error);
    } else {
      Alert.alert('Thành công', `Đã phân công KTV ${techName} và chuyển đơn sang ASSIGNED.`);
      loadData();
    }
  };

  return (
    <View style={styles.container}>
      {/* Modal Từ chối */}
      <Modal visible={rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>❌ Từ chối tiếp nhận đơn</Text>
            <Text style={styles.modalSub}>Nhập lý do cửa hàng không tiếp nhận sửa chữa thiết bị này:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Không có linh kiện thay thế, quá tải, ngoài phạm vi bảo hành..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectModal(false)}>
                <Text style={{ color: '#64748b', fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitReject} disabled={actionLoading}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Phân công KTV chọn theo Tên */}
      <Modal visible={assignModal} transparent animationType="fade" onRequestClose={() => setAssignModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.modalTitle, { color: '#1d4ed8' }]}>🔧 Phân công Kỹ thuật viên</Text>
            <Text style={styles.modalSub}>Chọn Kỹ thuật viên phụ trách sửa chữa đơn #{selectedOrderId}:</Text>

            <Text style={styles.fieldLabel}>Chọn Kỹ thuật viên:</Text>
            <ScrollView style={styles.techListScroll} nestedScrollEnabled>
              {techsLoading ? (
                <ActivityIndicator color="#1d4ed8" style={{ padding: 16 }} />
              ) : technicians.length === 0 ? (
                <Text style={styles.emptyTechText}>Đang tải danh sách KTV...</Text>
              ) : (
                technicians.map((tech) => {
                  const isSelected = selectedTechId === tech.id;
                  return (
                    <TouchableOpacity
                      key={tech.id}
                      style={[styles.techItem, isSelected && styles.techItemSelected]}
                      onPress={() => setSelectedTechId(tech.id)}
                    >
                      <View style={styles.techLeft}>
                        <Text style={styles.techAvatar}>👨‍🔧</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.techName, isSelected && styles.techNameSelected]}>
                            {tech.fullName || tech.username}
                          </Text>
                          <Text style={styles.techSub}>
                            @{tech.username} {tech.phone ? `• 📞 ${tech.phone}` : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Ghi chú phân công:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ghi chú phân công..."
              value={assignNotes}
              onChangeText={setAssignNotes}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAssignModal(false)}>
                <Text style={{ color: '#64748b', fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: '#1d4ed8' }, (!selectedTechId || actionLoading) && { opacity: 0.6 }]}
                onPress={submitAssign}
                disabled={!selectedTechId || actionLoading}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {actionLoading ? 'Đang giao...' : 'Phân công ngay'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Greeting Banner */}
      <View style={styles.userBanner}>
        <View>
          <Text style={styles.greetingText}>👋 Chào {user?.fullName || 'Lễ tân'}</Text>
          <Text style={styles.subGreeting}>Bộ phận Tiếp nhận & Điều phối dịch vụ</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>LỄ TÂN</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'PENDING' && styles.tabActive]}
          onPress={() => setActiveTab('PENDING')}
        >
          <Text style={[styles.tabText, activeTab === 'PENDING' && styles.tabTextActive]}>
            ⏳ Chờ Tiếp Nhận (GĐ 1)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ACCEPTED' && styles.tabActive]}
          onPress={() => setActiveTab('ACCEPTED')}
        >
          <Text style={[styles.tabText, activeTab === 'ACCEPTED' && styles.tabTextActive]}>
            📋 Đã Nhận — Chờ Phân Công (GĐ 2)
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 40 }}>✅</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'PENDING' ? 'Không có đơn chờ tiếp nhận' : 'Không có đơn chờ phân công'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const orderCode = item.orderCode || item.code || `#${item.id}`;
            const deviceName = item.deviceType || 'Thiết bị điện máy';
            const brandModel = [item.brand || item.deviceBrand, item.model || item.deviceModel].filter(Boolean).join(' - ');

            return (
              <View style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderCode}>{orderCode}</Text>
                  <Text style={styles.orderDate}>📅 {formatDate(item.createdAt)}</Text>
                </View>

                {/* Khách hàng & SĐT */}
                <View style={styles.customerRow}>
                  <Text style={styles.customerName}>👤 {item.customerName || 'Khách vãng lai'}</Text>
                  {item.customerPhone ? (
                    <TouchableOpacity
                      style={styles.callBadge}
                      onPress={() => handleCall(item.customerPhone)}
                    >
                      <Text style={styles.callBadgeText}>📞 {item.customerPhone}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Thiết bị */}
                <Text style={styles.deviceInfo}>
                  ⚡ {deviceName}{brandModel ? ` — ${brandModel}` : ''}
                </Text>

                {/* Hiện tượng hỏng */}
                {item.reportedIssue && (
                  <View style={styles.issueBox}>
                    <Text style={styles.issueText} numberOfLines={2}>
                      ⚠️ <Text style={{ fontWeight: '700' }}>Lỗi:</Text> {item.reportedIssue}
                    </Text>
                  </View>
                )}

                {/* Địa chỉ & Thời gian hẹn */}
                <View style={styles.metaBox}>
                  {item.customerAddress && (
                    <Text style={styles.metaText} numberOfLines={1}>
                      📍 {item.customerAddress}
                    </Text>
                  )}
                  {item.preferredDatetime && (
                    <Text style={styles.metaText} numberOfLines={1}>
                      ⏰ Hẹn lúc: {formatDate(item.preferredDatetime)}
                    </Text>
                  )}
                </View>

                {/* Hành động */}
                {activeTab === 'PENDING' ? (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnReject]}
                      onPress={() => {
                        setSelectedOrderId(item.id);
                        setRejectReason('');
                        setRejectModal(true);
                      }}
                    >
                      <Text style={styles.btnRejectText}>❌ Từ chối</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnAccept]}
                      onPress={() => handleAccept(item.id)}
                    >
                      <Text style={styles.btnAcceptText}>✅ Tiếp nhận</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnAssign]}
                      onPress={() => openAssignModal(item.id)}
                    >
                      <Text style={styles.btnAssignText}>🔧 Phân công KTV</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
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
  roleBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#1d4ed8', fontSize: 11, fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1d4ed8' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#1d4ed8', fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 15, color: '#64748b', marginTop: 8 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderCode: { fontWeight: '700', fontSize: 15, color: '#1e293b' },
  orderDate: { fontSize: 12, color: '#94a3b8' },
  customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  customerName: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  callBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#86efac' },
  callBadgeText: { color: '#15803d', fontSize: 12, fontWeight: '700' },
  deviceInfo: { fontSize: 13, color: '#334155', fontWeight: '600', marginTop: 4 },
  issueBox: { backgroundColor: '#f8fafc', borderRadius: 6, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  issueText: { fontSize: 12, color: '#475569' },
  metaBox: { marginTop: 6, gap: 2 },
  metaText: { fontSize: 12, color: '#64748b' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnReject: { backgroundColor: '#fee2e2' },
  btnRejectText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  btnAccept: { backgroundColor: '#10b981' },
  btnAcceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnAssign: { backgroundColor: '#1d4ed8' },
  btnAssignText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontWeight: '800', fontSize: 16, color: '#dc2626', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#475569', marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  techListScroll: { maxHeight: 180, marginBottom: 8 },
  emptyTechText: { fontSize: 13, color: '#94a3b8', padding: 10, textAlign: 'center' },
  techItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc', marginBottom: 6,
  },
  techItemSelected: {
    borderColor: '#1d4ed8', backgroundColor: '#eff6ff',
  },
  techLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  techAvatar: { fontSize: 22, marginRight: 10 },
  techName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  techNameSelected: { color: '#1d4ed8' },
  techSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center',
  },
  radioCircleSelected: { borderColor: '#1d4ed8' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1d4ed8' },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc',
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#dc2626' },
});

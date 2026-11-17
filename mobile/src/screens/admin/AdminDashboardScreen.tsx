import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Linking, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listRepairOrders, assignTechnician, listTechnicians } from '../../api/repairs';
import { formatDate } from '../../utils/formatDate';
import { useAuth } from '../../auth/AuthContext';

function getDeviceIcon(type?: string) {
  if (!type) return '⚡';
  const t = type.toLowerCase();
  if (t.includes('lạnh') || t.includes('điều hòa')) return '❄️';
  if (t.includes('giặt')) return '🧺';
  if (t.includes('tủ lạnh')) return '🧊';
  if (t.includes('bếp')) return '🔥';
  if (t.includes('lò')) return '♨️';
  if (t.includes('nước') || t.includes('lọc')) return '💧';
  return '⚡';
}

export default function AdminDashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'ASSIGN' | 'QUOTE'>('ASSIGN');
  const [acceptedOrders, setAcceptedOrders] = useState<any[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Assign Modal State
  const [assignModal, setAssignModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>('');
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [techsLoading, setTechsLoading] = useState(false);
  const [assignNotes, setAssignNotes] = useState('Admin phân công KTV xử lý');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [acceptedRes, quotesRes] = await Promise.all([
      listRepairOrders({ repairStatus: 'ACCEPTED', limit: 50 }),
      listRepairOrders({ repairStatus: 'AWAITING_ADMIN_APPROVAL', limit: 50 }),
    ]);
    setAcceptedOrders(acceptedRes.data?.items ?? []);
    setPendingQuotes(quotesRes.data?.items ?? []);
  }, []);

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

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openAssignModal = (order: any) => {
    setSelectedOrderId(order.id);
    setSelectedOrderCode(order.orderCode || order.code || `#${order.id}`);
    setAssignNotes('Admin phân công KTV xử lý theo lịch hẹn');
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
      Alert.alert('Phân công thất bại', res.error);
    } else {
      Alert.alert(
        'Phân công thành công',
        `Đã phân công KTV ${techName} phụ trách phiếu ${selectedOrderCode} và chuyển sang trạng thái ASSIGNED.`
      );
      loadData();
    }
  };

  return (
    <View style={styles.container}>
      {/* Modal Phân công KTV chọn theo Tên */}
      <Modal visible={assignModal} transparent animationType="fade" onRequestClose={() => setAssignModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🔧 Phân công Kỹ thuật viên</Text>
            <Text style={styles.modalSub}>
              Phiếu: <Text style={{ fontWeight: '800', color: '#1d4ed8' }}>{selectedOrderCode}</Text>
            </Text>

            <Text style={styles.fieldLabel}>Chọn Kỹ thuật viên phụ trách:</Text>
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
                style={[styles.modalConfirm, (!selectedTechId || actionLoading) && { opacity: 0.6 }]}
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

      {/* Header Profile */}
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>👋 Quản trị viên: {user?.fullName || user?.username}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.primaryRole || 'ADMIN'}</Text>
          </View>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileBtnText}>👤 Tài khoản</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Text style={styles.logoutBtnText}>🚪 Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <TouchableOpacity
          style={[styles.kpi, activeTab === 'ASSIGN' && styles.kpiActive, { backgroundColor: '#eff6ff' }]}
          onPress={() => setActiveTab('ASSIGN')}
        >
          <Text style={[styles.kpiNum, { color: '#1d4ed8' }]}>{acceptedOrders.length}</Text>
          <Text style={styles.kpiLabel}>Đơn chờ phân công KTV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kpi, activeTab === 'QUOTE' && styles.kpiActive, { backgroundColor: '#fef3c7' }]}
          onPress={() => setActiveTab('QUOTE')}
        >
          <Text style={[styles.kpiNum, { color: '#d97706' }]}>{pendingQuotes.length}</Text>
          <Text style={styles.kpiLabel}>Báo giá chờ phê duyệt</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Row */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ASSIGN' && styles.tabActive]}
          onPress={() => setActiveTab('ASSIGN')}
        >
          <Text style={[styles.tabText, activeTab === 'ASSIGN' && styles.tabTextActive]}>
            🔧 Chờ Phân Công ({acceptedOrders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'QUOTE' && styles.tabActive]}
          onPress={() => setActiveTab('QUOTE')}
        >
          <Text style={[styles.tabText, activeTab === 'QUOTE' && styles.tabTextActive]}>
            📋 Duyệt Báo Giá ({pendingQuotes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : activeTab === 'ASSIGN' ? (
        /* TAB 1: DANH SÁCH ĐƠN ĐÃ ĐƯỢC LỄ TÂN DUYỆT - ADMIN PHÂN CÔNG KTV */
        acceptedOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={styles.emptyTitle}>Tất cả đơn đã được phân công KTV!</Text>
            <Text style={styles.emptySub}>Khi lễ tân duyệt đơn mới, danh sách sẽ hiển thị ở đây để Admin phân công.</Text>
          </View>
        ) : (
          <FlatList
            data={acceptedOrders}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => {
              const orderCode = item.orderCode || item.code || `#${item.id}`;
              const deviceIcon = getDeviceIcon(item.deviceType);
              const deviceName = item.deviceType || 'Thiết bị điện máy';
              const brandModel = [item.brand || item.deviceBrand, item.model || item.deviceModel].filter(Boolean).join(' - ');

              return (
                <View style={styles.orderCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.orderCode}>#{orderCode}</Text>
                    <View style={styles.statusBadgeAccepted}>
                      <Text style={styles.statusBadgeText}>ĐÃ TIẾP NHẬN</Text>
                    </View>
                  </View>

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

                  <Text style={styles.deviceInfo}>
                    {deviceIcon} {deviceName}{brandModel ? ` — ${brandModel}` : ''}
                  </Text>

                  {item.reportedIssue && (
                    <View style={styles.issueBox}>
                      <Text style={styles.issueText} numberOfLines={2}>
                        ⚠️ <Text style={{ fontWeight: '700' }}>Lỗi:</Text> {item.reportedIssue}
                      </Text>
                    </View>
                  )}

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
                    <Text style={[styles.metaText, { color: '#94a3b8' }]}>
                      📅 Ngày nhận: {formatDate(item.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.btnAssign}
                      onPress={() => openAssignModal(item)}
                    >
                      <Text style={styles.btnAssignText}>🔧 Phân công Kỹ thuật viên</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : (
        /* TAB 2: DANH SÁCH BÁO GIÁ CẦN ADMIN PHÊ DUYỆT */
        pendingQuotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={styles.emptyTitle}>Không có báo giá nào chờ duyệt</Text>
          </View>
        ) : (
          <FlatList
            data={pendingQuotes}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quoteCard}
                onPress={() => navigation.navigate('QuoteApproval', { orderId: item.id })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.orderCode}>#{item.orderCode || item.code}</Text>
                  <View style={styles.statusBadgeQuote}>
                    <Text style={styles.statusBadgeQuoteText}>CHỜ ADMIN DUYỆT</Text>
                  </View>
                </View>
                <Text style={styles.customerName}>👤 {item.customerName || 'Khách hàng'}</Text>
                <Text style={styles.deviceInfo}>
                  ⚡ {item.deviceType}{item.brand ? ` — ${item.brand}` : ''}
                </Text>
                <Text style={styles.dateText}>📅 Tiếp nhận: {formatDate(item.createdAt)}</Text>
                <View style={styles.quoteActionPill}>
                  <Text style={styles.quoteActionText}>👉 Bấm để xem chi tiết báo giá & Phê duyệt</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  userCard: {
    backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  userInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  userName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  roleBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#3730a3', fontSize: 11, fontWeight: '700' },
  userActions: { flexDirection: 'row', gap: 10 },
  profileBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  profileBtnText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  logoutBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: '#fee2e2',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  kpi: {
    flex: 1, borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  kpiActive: { borderColor: '#1d4ed8' },
  kpiNum: { fontSize: 24, fontWeight: '800' },
  kpiLabel: { fontSize: 11, color: '#475569', marginTop: 2, textAlign: 'center', fontWeight: '600' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1d4ed8' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#1d4ed8', fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 10, textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#3b82f6',
  },
  quoteCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#f59e0b',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderCode: { fontWeight: '800', fontSize: 15, color: '#1e293b' },
  statusBadgeAccepted: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: '#1d4ed8', fontSize: 11, fontWeight: '700' },
  statusBadgeQuote: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeQuoteText: { color: '#d97706', fontSize: 11, fontWeight: '700' },
  customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  customerName: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  callBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#86efac' },
  callBadgeText: { color: '#15803d', fontSize: 12, fontWeight: '700' },
  deviceInfo: { fontSize: 13, color: '#334155', fontWeight: '600', marginTop: 4 },
  issueBox: { backgroundColor: '#fffbeb', borderRadius: 6, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#fef3c7' },
  issueText: { fontSize: 12, color: '#92400e' },
  metaBox: { marginTop: 6, gap: 2 },
  metaText: { fontSize: 12, color: '#64748b' },
  dateText: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  quoteActionPill: {
    marginTop: 8, backgroundColor: '#fffbeb', padding: 8, borderRadius: 6,
    borderWidth: 1, borderColor: '#fde68a', alignItems: 'center',
  },
  quoteActionText: { color: '#b45309', fontSize: 12, fontWeight: '700' },
  actionRow: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btnAssign: {
    backgroundColor: '#1d4ed8', paddingVertical: 10, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  btnAssignText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontWeight: '800', fontSize: 16, color: '#1d4ed8', marginBottom: 4 },
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
  modalConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#1d4ed8' },
});

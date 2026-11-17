import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listRepairOrders, createPayment, transitionStatus } from '../../api/repairs';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
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

export default function AccountantDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'COMPLETED' | 'PAID'>('COMPLETED');

  // Payment Modal State
  const [payModal, setPayModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('Khách thanh toán trực tiếp');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const res = await listRepairOrders({ repairStatus: activeTab, limit: 30 });
    if (res.data?.items) {
      setOrders(res.data.items);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openPayModal = (order: any) => {
    setSelectedOrder(order);
    const balance = Number(order.balance ?? order.balanceDue ?? 0);
    setAmount(balance > 0 ? String(balance) : '0');
    setPaymentMethod('CASH');
    setNotes('Khách thanh toán tại quầy');
    setPayModal(true);
  };

  const submitPayment = async () => {
    const payAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (isNaN(payAmount) || payAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0.');
      return;
    }

    setSubmitting(true);
    const res = await createPayment(selectedOrder.id, {
      amount: payAmount,
      paymentMethod,
      notes: notes.trim(),
    });
    setSubmitting(false);
    setPayModal(false);

    if (res.error) {
      Alert.alert('Thanh toán thất bại', res.error);
    } else {
      Alert.alert(
        'Thành công',
        `Đã thu ${formatCurrency(payAmount)}. ${
          res.data?.newBalance <= 0 ? 'Đơn hàng đã được tự động chuyển sang PAID (Đã thanh toán đủ).' : ''
        }`
      );
      loadData();
    }
  };

  const handleDeliver = async (orderId: number) => {
    Alert.alert('Bàn giao thiết bị', 'Xác nhận bàn giao thiết bị đã hoàn tất sửa chữa cho khách hàng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: '🚚 Bàn giao ngay',
        onPress: async () => {
          setSubmitting(true);
          const res = await transitionStatus(orderId, 'DELIVERED', 'Khách đã nhận lại máy');
          setSubmitting(false);

          if (res.error) {
            Alert.alert('Bàn giao thất bại', res.error);
          } else {
            Alert.alert('Thành công', 'Đã bàn giao thiết bị và kích hoạt bảo hành điện tử.');
            loadData();
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Modal Thu Tiền */}
      <Modal visible={payModal} transparent animationType="fade" onRequestClose={() => setPayModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>💰 Thu tiền phiếu #{selectedOrder?.orderCode || selectedOrder?.code}</Text>
            <Text style={styles.modalSub}>
              Còn nợ: <Text style={{ color: '#dc2626', fontWeight: '800' }}>
                {formatCurrency(selectedOrder?.balance ?? selectedOrder?.balanceDue ?? 0)}
              </Text>
            </Text>

            <Text style={styles.label}>Số tiền thu (VNĐ):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
            />

            {/* Quick amount buttons */}
            <View style={styles.quickAmountRow}>
              <TouchableOpacity
                style={styles.quickAmountBtn}
                onPress={() => setAmount(String(selectedOrder?.balance ?? selectedOrder?.balanceDue ?? 0))}
              >
                <Text style={styles.quickAmountText}>⚡ Thu đủ còn nợ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAmountBtn}
                onPress={() => {
                  const b = Number(selectedOrder?.balance ?? selectedOrder?.balanceDue ?? 0);
                  setAmount(String(Math.round(b / 2)));
                }}
              >
                <Text style={styles.quickAmountText}>50%</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 10 }]}>Hình thức thanh toán:</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodBtn, paymentMethod === 'CASH' && styles.methodBtnActive]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Text style={[styles.methodText, paymentMethod === 'CASH' && styles.methodTextActive]}>
                  💵 Tiền mặt
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, paymentMethod === 'BANK_TRANSFER' && styles.methodBtnActive]}
                onPress={() => setPaymentMethod('BANK_TRANSFER')}
              >
                <Text style={[styles.methodText, paymentMethod === 'BANK_TRANSFER' && styles.methodTextActive]}>
                  🏦 Chuyển khoản
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 10 }]}>Ghi chú:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ghi chú thanh toán..."
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPayModal(false)}>
                <Text style={{ color: '#64748b', fontWeight: '600' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={submitPayment} disabled={submitting}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{submitting ? 'Đang lưu...' : 'Xác nhận thu'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Greeting Banner */}
      <View style={styles.userBanner}>
        <View>
          <Text style={styles.greetingText}>💰 Bộ phận Thu Ngân & Kế Toán</Text>
          <Text style={styles.subGreeting}>Kế toán: {user?.fullName || 'Thu ngân'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>KẾ TOÁN</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'COMPLETED' && styles.tabActive]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
            ⏳ Chờ Thu Tiền (GĐ 9)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'PAID' && styles.tabActive]}
          onPress={() => setActiveTab('PAID')}
        >
          <Text style={[styles.tabText, activeTab === 'PAID' && styles.tabTextActive]}>
            ✅ Đã Thu Đủ (GĐ 10)
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 40 }}>💰</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'COMPLETED' ? 'Không có đơn chờ thu tiền' : 'Chưa có đơn đã thanh toán'}
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
            const deviceIcon = getDeviceIcon(item.deviceType);
            const deviceName = item.deviceType || 'Thiết bị điện máy';
            const brandModel = [item.brand || item.deviceBrand, item.model || item.deviceModel].filter(Boolean).join(' - ');
            const total = Number(item.totalReceivable ?? item.totalAmount ?? 0);
            const paid = Number(item.totalPaid ?? item.totalCollected ?? 0);
            const balance = Number(item.balance ?? item.balanceDue ?? (total - paid));

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orderCode}>#{orderCode}</Text>
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
                  {deviceIcon} {deviceName}{brandModel ? ` — ${brandModel}` : ''}
                </Text>

                {/* Hiện tượng hỏng */}
                {item.reportedIssue && (
                  <View style={styles.issueBox}>
                    <Text style={styles.issueText} numberOfLines={2}>
                      ⚠️ <Text style={{ fontWeight: '700' }}>Lỗi:</Text> {item.reportedIssue}
                    </Text>
                  </View>
                )}

                {/* Địa chỉ & Kỹ thuật viên phụ trách */}
                {(item.customerAddress || item.assignedTechnicianName) && (
                  <View style={styles.metaBox}>
                    {item.customerAddress && (
                      <Text style={styles.metaText} numberOfLines={1}>
                        📍 {item.customerAddress}
                      </Text>
                    )}
                    {item.assignedTechnicianName && (
                      <Text style={[styles.metaText, { marginTop: 2 }]} numberOfLines={1}>
                        🔧 KTV: {item.assignedTechnicianName}
                      </Text>
                    )}
                  </View>
                )}

                {/* Financial Summary */}
                <View style={styles.finBox}>
                  <View style={styles.finRow}>
                    <Text style={styles.finLabel}>Tổng chi phí:</Text>
                    <Text style={styles.finVal}>{formatCurrency(total)}</Text>
                  </View>
                  <View style={styles.finRow}>
                    <Text style={styles.finLabel}>Đã thu:</Text>
                    <Text style={[styles.finVal, { color: '#16a34a' }]}>{formatCurrency(paid)}</Text>
                  </View>
                  <View style={[styles.finRow, styles.finBalanceRow]}>
                    <Text style={[styles.finLabel, { fontWeight: '700' }]}>Còn nợ:</Text>
                    <Text style={[styles.finVal, { color: balance > 0 ? '#dc2626' : '#16a34a', fontWeight: '800' }]}>
                      {formatCurrency(balance)}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  {balance > 0 ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnPay]}
                      onPress={() => openPayModal(item)}
                    >
                      <Text style={styles.btnPayText}>💰 Thu Tiền ({formatCurrency(balance)})</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnDeliver]}
                      onPress={() => handleDeliver(item.id)}
                    >
                      <Text style={styles.btnDeliverText}>🚚 Bàn Giao Máy Cho Khách</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
  roleBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#15803d', fontSize: 11, fontWeight: '700' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderCode: { fontWeight: '800', fontSize: 15, color: '#1e293b' },
  orderDate: { fontSize: 12, color: '#94a3b8' },
  customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  customerName: { fontSize: 14, fontWeight: '700', color: '#1e293b', flex: 1 },
  callBadge: {
    backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe',
  },
  callBadgeText: { fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
  deviceInfo: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  issueBox: {
    backgroundColor: '#fffbeb', borderRadius: 6, padding: 8, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  issueText: { fontSize: 12, color: '#92400e', lineHeight: 16 },
  metaBox: {
    backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, marginBottom: 8,
  },
  metaText: { fontSize: 12, color: '#64748b' },
  finBox: { marginTop: 4, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  finBalanceRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 },
  finLabel: { fontSize: 13, color: '#64748b' },
  finVal: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnPay: { backgroundColor: '#16a34a' },
  btnPayText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDeliver: { backgroundColor: '#1d4ed8' },
  btnDeliverText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '800', fontSize: 16, color: '#15803d', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#475569', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 10, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc',
  },
  quickAmountRow: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 8 },
  quickAmountBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  quickAmountText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  methodRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 10 },
  methodBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  methodBtnActive: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  methodText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  methodTextActive: { color: '#15803d', fontWeight: '700' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#16a34a' },
});

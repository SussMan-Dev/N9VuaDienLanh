import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { listQuotes, adminApproveQuote, getRepairOrder } from '../../api/repairs';
import { formatCurrency } from '../../utils/formatCurrency';

export default function QuoteApprovalScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [orderRes, quoteRes] = await Promise.all([
      getRepairOrder(orderId),
      listQuotes(orderId),
    ]);
    if (orderRes.data) setOrder(orderRes.data);
    if (quoteRes.data) setQuotes(quoteRes.data.items ?? quoteRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [orderId]);

  const handleDecision = async (quoteId: number, decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !actionNote.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ghi chú lý do từ chối hoặc yêu cầu sửa đổi.');
      return;
    }

    Alert.alert(
      decision === 'APPROVED' ? 'Phê duyệt báo giá' : 'Từ chối / Yêu cầu sửa',
      decision === 'APPROVED'
        ? 'Bạn có chắc chắn duyệt báo giá này để gửi cho khách hàng xem xét?'
        : 'Báo giá sẽ bị từ chối và trả về cho Kỹ thuật viên chỉnh sửa.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: decision === 'APPROVED' ? 'Duyệt gửi khách' : 'Xác nhận từ chối',
          style: decision === 'APPROVED' ? 'default' : 'destructive',
          onPress: async () => {
            setSubmitting(true);
            const res = await adminApproveQuote(orderId, quoteId, decision, actionNote.trim() || 'Admin phê duyệt');
            setSubmitting(false);
            if (res.error) {
              Alert.alert('Thao tác thất bại', res.error);
            } else {
              Alert.alert(
                'Thành công',
                decision === 'APPROVED'
                  ? 'Báo giá đã được Admin phê duyệt (Tầng 1) và chuyển sang Chờ khách duyệt!'
                  : 'Đã từ chối báo giá và gửi yêu cầu chỉnh sửa lại cho KTV.'
              );
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Đang tải thông tin báo giá...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {order && (
        <View style={styles.orderHeaderCard}>
          <Text style={styles.orderCodeBadge}>Phiếu: #{order.orderCode}</Text>
          <Text style={styles.customerName}>Khách: {order.customerName}</Text>
          <Text style={styles.deviceInfo}>
            Thiết bị: {order.deviceType} {order.brand ? `(${order.brand})` : ''}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Danh sách Báo giá ({quotes.length})</Text>

      {quotes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Chưa có báo giá nào được tạo cho phiếu này.</Text>
        </View>
      ) : (
        quotes.map((q) => {
          const isPendingAdmin = q.adminApprovalStatus === 'PENDING' || q.status === 'DRAFT' || q.status === 'PENDING_ADMIN';
          const total = Number(q.laborTotal ?? 0) + Number(q.partsTotal ?? 0);

          return (
            <View key={q.id} style={styles.quoteCard}>
              <View style={styles.quoteHeader}>
                <Text style={styles.quoteVersion}>Báo giá v{q.versionNumber ?? q.id}</Text>
                <View style={[styles.badge, isPendingAdmin ? styles.badgePending : styles.badgeDone]}>
                  <Text style={[styles.badgeText, isPendingAdmin ? styles.badgeTextPending : styles.badgeTextDone]}>
                    {q.adminApprovalStatus ?? q.status}
                  </Text>
                </View>
              </View>

              <View style={styles.costBreakdown}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Tiền công:</Text>
                  <Text style={styles.costValue}>{formatCurrency(q.laborTotal)}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Tiền linh kiện:</Text>
                  <Text style={styles.costValue}>{formatCurrency(q.partsTotal)}</Text>
                </View>
                <View style={[styles.costRow, styles.costTotalRow]}>
                  <Text style={styles.costTotalLabel}>Tổng chi phí:</Text>
                  <Text style={styles.costTotalValue}>{formatCurrency(total)}</Text>
                </View>
              </View>

              {q.items && q.items.length > 0 && (
                <View style={styles.itemsList}>
                  <Text style={styles.itemsHeader}>Chi tiết hạng mục:</Text>
                  {q.items.map((it: any, idx: number) => (
                    <Text key={idx} style={styles.itemLine}>
                      • {it.itemType === 'LABOR' ? '[Công]' : '[Vật tư]'} {it.description} ({it.quantity} x {formatCurrency(it.unitPrice)})
                    </Text>
                  ))}
                </View>
              )}

              {isPendingAdmin && (
                <View style={styles.actionContainer}>
                  <Text style={styles.actionLabel}>Ghi chú thẩm định / Lý do:</Text>
                  <TextInput
                    style={styles.actionInput}
                    placeholder="Nhập ghi chú cho KTV hoặc khách..."
                    value={actionNote}
                    onChangeText={setActionNote}
                  />

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnReject]}
                      onPress={() => handleDecision(q.id, 'REJECTED')}
                      disabled={submitting}
                    >
                      <Text style={styles.btnRejectText}>✕ Yêu cầu sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, styles.btnApprove]}
                      onPress={() => handleDecision(q.id, 'APPROVED')}
                      disabled={submitting}
                    >
                      <Text style={styles.btnApproveText}>✓ Duyệt gửi khách</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  orderHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1d4ed8',
    elevation: 2,
  },
  orderCodeBadge: { fontWeight: '700', fontSize: 16, color: '#1d4ed8' },
  customerName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 4 },
  deviceInfo: { fontSize: 13, color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteVersion: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeDone: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextPending: { color: '#b45309' },
  badgeTextDone: { color: '#15803d' },
  costBreakdown: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  costLabel: { color: '#64748b', fontSize: 13 },
  costValue: { color: '#1e293b', fontSize: 13, fontWeight: '500' },
  costTotalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  costTotalLabel: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  costTotalValue: { fontWeight: '800', color: '#1d4ed8', fontSize: 16 },
  itemsList: { marginTop: 12, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  itemsHeader: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 },
  itemLine: { fontSize: 12, color: '#334155', marginBottom: 2 },
  actionContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  actionInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnReject: { backgroundColor: '#fee2e2' },
  btnRejectText: { color: '#b91c1c', fontWeight: '700', fontSize: 14 },
  btnApprove: { backgroundColor: '#1d4ed8' },
  btnApproveText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});

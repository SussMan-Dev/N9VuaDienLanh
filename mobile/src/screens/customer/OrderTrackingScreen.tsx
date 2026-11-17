import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyOrderDetail, customerDecideQuote } from '../../api/customer-portal';
import { getStatusInfo, STATUS_ORDER } from '../../utils/repairStatus';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

export default function OrderTrackingScreen({ route }: any) {
  const { id } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [pendingRejectQuoteId, setPendingRejectQuoteId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await getMyOrderDetail(id);
    if (data) setOrder(data);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDecide = async (quoteId: number, decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED') {
      setPendingRejectQuoteId(quoteId);
      setRejectNote('');
      setRejectModal(true);
      return;
    }
    Alert.alert('Xác nhận', 'Bạn đồng ý với báo giá này và cho phép bắt đầu sửa chữa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: '✅ Đồng ý sửa', onPress: async () => {
          const { error } = await customerDecideQuote(id, quoteId, 'APPROVED');
          if (error) Alert.alert('Lỗi', error);
          else { Alert.alert('✅ Đã duyệt báo giá!'); load(); }
        },
      },
    ]);
  };

  const submitReject = async () => {
    if (!rejectNote.trim()) {
      Alert.alert('Thiếu lý do', 'Vui lòng nhập lý do từ chối.');
      return;
    }
    setSubmitting(true);
    const { error } = await customerDecideQuote(id, pendingRejectQuoteId!, 'REJECTED', rejectNote.trim());
    setSubmitting(false);
    setRejectModal(false);
    if (error) Alert.alert('Lỗi', error);
    else { Alert.alert('✅ Đã từ chối báo giá'); load(); }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#1d4ed8" /></View>;
  }

  if (!order) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Không tìm thấy đơn hàng.</Text></View>;
  }

  const statusInfo = getStatusInfo(order.repairStatus ?? order.repair_status);
  const currentStepIndex = STATUS_ORDER.indexOf(order.repairStatus ?? order.repair_status);
  const pendingQuote = order.quotes?.find((q: any) =>
    (q.status === 'PENDING_CUSTOMER' && q.adminApprovalStatus === 'APPROVED') ||
    q.status === 'AWAITING_CUSTOMER_APPROVAL' ||
    q.status === 'SENT'
  );

  const deviceName = order.device?.typeName || order.deviceType || 'Thiết bị điện máy';
  const brandName = order.device?.brand || order.brand;
  const modelName = order.device?.model;

  return (
    <>
      {/* Modal từ chối báo giá — Android-compatible thay cho Alert.prompt */}
      <Modal visible={rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>❌ Từ chối báo giá</Text>
            <Text style={styles.modalSub}>Vui lòng nhập lý do để cửa hàng có thể điều chỉnh:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập lý do từ chối..."
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              numberOfLines={3}
              autoFocus
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

      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 {order.code ?? order.orderCode ?? `#${order.id}`}</Text>
        <View style={[styles.badge, { backgroundColor: statusInfo.bgColor, alignSelf: 'flex-start', marginTop: 6 }]}>
          <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
        <Text style={styles.meta}>
          Thiết bị: {deviceName}
          {brandName ? ` — ${brandName}` : ''}
          {modelName ? ` (${modelName})` : ''}
        </Text>
        {order.reportedIssue && (
          <Text style={[styles.meta, { fontStyle: 'italic', color: '#475569' }]}>
            Hiện tượng hỏng: {order.reportedIssue}
          </Text>
        )}
        <Text style={styles.meta}>Ngày tạo: {formatDate(order.createdAt)}</Text>
      </View>

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📍 Tiến trình sửa chữa</Text>
        {STATUS_ORDER.slice(0, 10).map((status, idx) => {
          const info = getStatusInfo(status);
          const done = idx < currentStepIndex;
          const active = idx === currentStepIndex;
          return (
            <View key={status} style={styles.timelineRow}>
              <View style={[
                styles.dot,
                done && styles.dotDone,
                active && styles.dotActive,
              ]}>
                {done && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                {active && <Text style={{ color: '#fff', fontSize: 10 }}>●</Text>}
              </View>
              <Text style={[styles.timelineLabel, done && styles.timelineDone, active && styles.timelineActive]}>
                GĐ {idx + 1}: {info.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Báo giá chờ duyệt */}
      {pendingQuote && (
        <View style={[styles.card, { borderColor: '#ea580c', borderWidth: 2 }]}>
          <Text style={styles.sectionTitle}>⚠️ Báo giá cần bạn xem xét</Text>
          <Text style={styles.meta}>Tổng chi phí dự kiến:</Text>
          <Text style={styles.amount}>
            {formatCurrency(
              pendingQuote.totalAmount ??
              ((pendingQuote.laborAmount ?? 0) + (pendingQuote.partsAmount ?? 0) - (pendingQuote.discountAmount ?? 0) + (pendingQuote.taxAmount ?? 0))
            )}
          </Text>

          {pendingQuote.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.quoteRow}>
              <Text style={styles.quoteItem}>{item.description}</Text>
              <Text style={styles.quotePrice}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
            </View>
          ))}

          <View style={styles.decisionRow}>
            <TouchableOpacity
              style={[styles.decisionBtn, { backgroundColor: '#d1fae5', borderColor: '#10b981' }]}
              onPress={() => handleDecide(pendingQuote.id, 'APPROVED')}
            >
              <Text style={{ color: '#065f46', fontWeight: '700' }}>✅ Đồng ý sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.decisionBtn, { backgroundColor: '#fee2e2', borderColor: '#dc2626' }]}
              onPress={() => handleDecide(pendingQuote.id, 'REJECTED')}
            >
              <Text style={{ color: '#991b1b', fontWeight: '700' }}>❌ Từ chối</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Thông tin tài chính */}
      {order.financials && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💰 Thông tin thanh toán</Text>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Tổng chi phí:</Text>
            <Text style={styles.finValue}>{formatCurrency(order.financials.totalAmount ?? order.financials.totalReceivable)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Đã thanh toán:</Text>
            <Text style={[styles.finValue, { color: '#16a34a' }]}>{formatCurrency(order.financials.totalPaid ?? order.financials.totalCollected)}</Text>
          </View>
          <View style={styles.finRow}>
            <Text style={styles.finLabel}>Còn lại:</Text>
            <Text style={[styles.finValue, { color: '#dc2626', fontWeight: '800' }]}>{formatCurrency(order.financials.balanceDue ?? order.financials.balance)}</Text>
          </View>
        </View>
      )}
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  cardTitle: { fontWeight: '800', fontSize: 17, color: '#1e293b' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, color: '#475569', marginTop: 6 },
  sectionTitle: { fontWeight: '700', fontSize: 15, color: '#1e293b', marginBottom: 10 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#cbd5e1', backgroundColor: '#f1f5f9',
    marginRight: 10, justifyContent: 'center', alignItems: 'center',
  },
  dotDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  dotActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  timelineLabel: { fontSize: 13, color: '#94a3b8' },
  timelineDone: { color: '#10b981', textDecorationLine: 'line-through' },
  timelineActive: { color: '#1d4ed8', fontWeight: '700' },
  amount: { fontSize: 24, fontWeight: '800', color: '#1d4ed8', marginVertical: 8 },
  quoteRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  quoteItem: { fontSize: 13, color: '#374151', flex: 1, marginRight: 8 },
  quotePrice: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  decisionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  decisionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  finLabel: { fontSize: 14, color: '#475569' },
  finValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontWeight: '800', fontSize: 17, color: '#dc2626', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#475569', marginBottom: 10 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#1e293b', textAlignVertical: 'top', minHeight: 80,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#f1f5f9' },
  modalConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#dc2626' },
});

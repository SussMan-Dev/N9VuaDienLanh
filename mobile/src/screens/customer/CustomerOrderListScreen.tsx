import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getMyOrders } from '../../api/customer-portal';
import { getStatusInfo } from '../../utils/repairStatus';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

interface CustomerOrder {
  id: number;
  code?: string;
  orderCode?: string;
  deviceType?: string;
  brand?: string;
  device?: {
    brand?: string;
    model?: string;
    deviceType?: string;
    typeName?: string;
  };
  reportedIssue?: string;
  address?: string;
  notes?: string;
  preferredDatetime?: string;
  contactPhone?: string;
  technician?: {
    name: string;
    phone?: string;
  } | null;
  pendingQuote?: {
    id: number;
    totalAmount: number;
  } | null;
  totalAmount?: number;
  rejectionReason?: string | null;
  repairStatus: string;
  createdAt: string;
}

function getDeviceIcon(typeName?: string): string {
  if (!typeName) return '⚡';
  const lower = typeName.toLowerCase();
  if (lower.includes('điều hòa') || lower.includes('máy lạnh')) return '❄️';
  if (lower.includes('giặt')) return '🧺';
  if (lower.includes('tủ lạnh')) return '🧊';
  if (lower.includes('nóng') || lower.includes('nước')) return '🔥';
  if (lower.includes('sấy')) return '♨️';
  if (lower.includes('hút ẩm')) return '💧';
  return '📱';
}

export default function CustomerOrderListScreen({ navigation }: any) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    const { data } = await getMyOrders();
    if (data?.items ?? data) {
      setOrders(data?.items ?? data ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders().finally(() => setLoading(false));
    }, [loadOrders])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: CustomerOrder }) => {
    const statusInfo = getStatusInfo(item.repairStatus);
    const orderCode = item.code || item.orderCode || `#${item.id}`;
    const deviceType = item.device?.typeName || item.device?.deviceType || item.deviceType || 'Thiết bị điện máy';
    const brand = item.device?.brand || item.brand;
    const model = item.device?.model;
    const icon = getDeviceIcon(deviceType);
    const hasPendingQuote = !!item.pendingQuote;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          hasPendingQuote && styles.cardHighlightQuote,
          item.repairStatus === 'REJECTED' && styles.cardHighlightRejected,
        ]}
        onPress={() => navigation.navigate('OrderTracking', { id: item.id })}
        activeOpacity={0.8}
      >
        {/* Card Header: Device Icon, Name & Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.deviceTitleRow}>
            <Text style={styles.deviceIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceType}>{deviceType}</Text>
              <Text style={styles.codeText}>Mã phiếu: {orderCode}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Hãng & Model */}
        {(brand || model) && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🏷️ Thương hiệu:</Text>
            <Text style={styles.infoValue}>{[brand, model].filter(Boolean).join(' — ')}</Text>
          </View>
        )}

        {/* Hiện tượng hỏng */}
        {item.reportedIssue && (
          <View style={styles.issueBox}>
            <Text style={styles.issueText} numberOfLines={2}>
              ⚠️ <Text style={{ fontWeight: '700' }}>Tình trạng:</Text> {item.reportedIssue}
            </Text>
          </View>
        )}

        {/* Kỹ thuật viên phụ trách */}
        {item.technician && (
          <View style={styles.techBox}>
            <Text style={styles.techText}>
              🔧 <Text style={{ fontWeight: '700' }}>KTV phụ trách:</Text> {item.technician.name}
              {item.technician.phone ? ` (📞 ${item.technician.phone})` : ''}
            </Text>
          </View>
        )}

        {/* Địa chỉ & Thời gian hẹn */}
        <View style={styles.detailsGrid}>
          {item.preferredDatetime && (
            <Text style={styles.metaText}>
              ⏰ Hẹn thợ: {formatDate(item.preferredDatetime)}
            </Text>
          )}
          {item.address && (
            <Text style={styles.metaText} numberOfLines={1}>
              📍 Nơi sửa: {item.address}
            </Text>
          )}
          <Text style={styles.metaText}>
            📅 Ngày tạo: {formatDate(item.createdAt)}
          </Text>
        </View>

        {/* Alert Box nếu có báo giá chờ duyệt */}
        {hasPendingQuote && (
          <View style={styles.pendingQuoteAlert}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingQuoteTitle}>⚡ BÁO GIÁ ĐÃ SẴN SÀNG!</Text>
              <Text style={styles.pendingQuoteAmount}>
                Tổng chi phí: {formatCurrency(item.pendingQuote!.totalAmount)}
              </Text>
            </View>
            <View style={styles.actionPill}>
              <Text style={styles.actionPillText}>Xem & Duyệt ➔</Text>
            </View>
          </View>
        )}

        {/* Alert Box nếu bị từ chối */}
        {item.repairStatus === 'REJECTED' && item.rejectionReason && (
          <View style={styles.rejectedAlert}>
            <Text style={styles.rejectedTitle}>❌ Lý do cửa hàng từ chối tiếp nhận:</Text>
            <Text style={styles.rejectedReason}>{item.rejectionReason}</Text>
          </View>
        )}

        {/* Footer: Tổng tiền & Hướng dẫn */}
        <View style={styles.cardFooter}>
          {item.totalAmount !== undefined && item.totalAmount > 0 ? (
            <Text style={styles.footerAmount}>
              Tổng tiền: <Text style={{ color: '#16a34a', fontWeight: '800' }}>{formatCurrency(item.totalAmount)}</Text>
            </Text>
          ) : (
            <Text style={styles.footerHint}>Chạm để xem chi tiết tiến trình</Text>
          )}
          <Text style={styles.footerArrow}>Xem chi tiết ➔</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 56 }}>📋</Text>
          <Text style={styles.emptyTitle}>Chưa có đơn sửa chữa nào</Text>
          <Text style={styles.emptyMsg}>
            Thiết bị điện máy nhà bạn đang gặp sự cố? Hãy đặt lịch để kỹ thuật viên đến kiểm tra tận nơi!
          </Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateBooking')}
          >
            <Text style={styles.createBtnText}>📅 Đặt Lịch Sửa Chữa Ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.topBar}>
            <Text style={styles.topCount}>Bạn có {orders.length} phiếu sửa chữa</Text>
            <TouchableOpacity
              style={styles.topAddBtn}
              onPress={() => navigation.navigate('CreateBooking')}
            >
              <Text style={styles.topAddBtnText}>+ Đặt lịch mới</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={orders}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  topCount: { fontSize: 13, color: '#475569', fontWeight: '700' },
  topAddBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  topAddBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHighlightQuote: {
    borderLeftColor: '#ea580c',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  cardHighlightRejected: {
    borderLeftColor: '#dc2626',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  deviceIcon: { fontSize: 24, marginRight: 8 },
  deviceType: { fontWeight: '800', fontSize: 16, color: '#0f172a' },
  codeText: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
  badge: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  infoLabel: { fontSize: 13, color: '#64748b', marginRight: 6 },
  infoValue: { fontSize: 13, color: '#1e293b', fontWeight: '700' },
  issueBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  issueText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  techBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  techText: { fontSize: 13, color: '#1d4ed8' },
  detailsGrid: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 3,
  },
  metaText: { fontSize: 12, color: '#64748b' },
  pendingQuoteAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderWidth: 1.5,
    borderColor: '#f97316',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  pendingQuoteTitle: { fontSize: 12, fontWeight: '800', color: '#c2410c' },
  pendingQuoteAmount: { fontSize: 14, fontWeight: '800', color: '#ea580c', marginTop: 2 },
  actionPill: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  rejectedAlert: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#f87171',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  rejectedTitle: { fontSize: 12, fontWeight: '700', color: '#b91c1c' },
  rejectedReason: { fontSize: 13, color: '#991b1b', marginTop: 2, fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerAmount: { fontSize: 13, color: '#334155', fontWeight: '600' },
  footerHint: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  footerArrow: { fontSize: 12, color: '#2563eb', fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 19, fontWeight: '800', color: '#1e293b', marginTop: 16 },
  emptyMsg: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  createBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    elevation: 3,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

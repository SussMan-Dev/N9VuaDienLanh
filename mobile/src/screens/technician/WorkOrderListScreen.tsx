import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listRepairOrders } from '../../api/repairs';
import { getStatusInfo } from '../../utils/repairStatus';
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

interface RepairOrder {
  id: number;
  code?: string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deviceType?: string;
  brand?: string;
  model?: string;
  deviceBrand?: string;
  deviceModel?: string;
  reportedIssue?: string;
  preferredDatetime?: string;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  repairStatus: string;
  createdAt: string;
}

export default function WorkOrderListScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MINE' | 'ALL'>('MINE');
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    const params: any = { limit: 50, sortOrder: 'desc' };
    if (activeTab === 'MINE' && user?.id) {
      params.assignedTechnicianId = user.id;
    }
    if (search.trim()) params.search = search.trim();
    const { data } = await listRepairOrders(params);
    if (data?.items) {
      setOrders(data.items);
    }
  }, [activeTab, search, user]);

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

  const handleCall = (phone?: string) => {
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const renderItem = ({ item }: { item: RepairOrder }) => {
    const statusInfo = getStatusInfo(item.repairStatus);
    const orderCode = item.orderCode || item.code || `#${item.id}`;
    const deviceIcon = getDeviceIcon(item.deviceType);
    const deviceName = item.deviceType || 'Thiết bị điện máy';
    const brandModel = [item.brand || item.deviceBrand, item.model || item.deviceModel].filter(Boolean).join(' - ');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('WorkOrderDetail', { id: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderCode}>#{orderCode}</Text>
          <View style={[styles.badge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.badgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
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

        {/* Lỗi hư hỏng */}
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
            <Text style={styles.metaText}>
              ⏰ Hẹn: {formatDate(item.preferredDatetime)}
            </Text>
          )}
          {item.assignedTechnicianName && (
            <Text style={[styles.metaText, { color: '#1d4ed8', fontWeight: '600' }]}>
              🔧 KTV phụ trách: {item.assignedTechnicianName}
            </Text>
          )}
          <Text style={styles.dateText}>📅 Ngày nhận: {formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerHint}>Chạm để mở hồ sơ sửa chữa</Text>
          <Text style={styles.footerArrow}>Thao tác ➔</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Banner KTV Info */}
      <View style={styles.userBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>👨‍🔧 KTV: {user?.fullName || user?.username}</Text>
          <Text style={styles.subGreeting}>Tài khoản: @{user?.username} (ID: #{user?.id})</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>KỸ THUẬT VIÊN</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'MINE' && styles.tabActive]}
          onPress={() => setActiveTab('MINE')}
        >
          <Text style={[styles.tabText, activeTab === 'MINE' && styles.tabTextActive]}>
            📌 Đơn của tôi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ALL' && styles.tabActive]}
          onPress={() => setActiveTab('ALL')}
        >
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
            👥 Tất cả đơn đang xử lý
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Tìm kiếm mã phiếu, lỗi, khách hàng..."
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1d4ed8" />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>📋</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === 'MINE' ? 'Chưa có đơn phân công cho bạn' : 'Không có đơn nào phù hợp'}
          </Text>
          <Text style={styles.emptyMsg}>
            {activeTab === 'MINE'
              ? 'Khi Quản trị viên phân công phiếu cho tài khoản của bạn, phiếu sẽ xuất hiện ở đây.'
              : 'Hãy kéo xuống để làm mới danh sách đơn hàng.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  userBanner: {
    backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greetingText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  subGreeting: { fontSize: 12, color: '#64748b', marginTop: 2 },
  roleBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  roleText: { color: '#1d4ed8', fontSize: 11, fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1d4ed8' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#1d4ed8', fontWeight: '700' },
  searchBar: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchInput: {
    backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#cbd5e1',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#1d4ed8',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderCode: { fontWeight: '800', fontSize: 16, color: '#0f172a' },
  badge: { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  customerName: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  callBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#86efac' },
  callBadgeText: { color: '#15803d', fontSize: 12, fontWeight: '700' },
  deviceInfo: { fontSize: 13, color: '#334155', fontWeight: '600', marginBottom: 6 },
  issueBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  issueText: { fontSize: 12, color: '#475569', lineHeight: 18 },
  metaBox: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 6, gap: 3 },
  metaText: { fontSize: 12, color: '#64748b' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerHint: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  footerArrow: { fontSize: 12, color: '#1d4ed8', fontWeight: '700' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12, textAlign: 'center' },
  emptyMsg: { fontSize: 13, color: '#6b7280', marginTop: 6, textAlign: 'center', lineHeight: 18 },
});

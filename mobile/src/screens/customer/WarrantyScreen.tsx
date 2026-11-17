import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { getMyWarranties } from '../../api/customer-portal';
import { formatDateShort } from '../../utils/formatDate';

interface Warranty {
  id: number;
  warrantyCode: string;
  deviceType: string;
  brand?: string;
  startsAt: string;
  endsAt: string;
  warrantyTerms: string;
}

export default function WarrantyScreen() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const { data } = await getMyWarranties();
    if (data?.items ?? data) setWarranties(data?.items ?? data ?? []);
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  const isActive = (w: Warranty) => new Date(w.endsAt) > new Date();

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

  return (
    <View style={styles.container}>
      {warranties.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>🛡</Text>
          <Text style={styles.emptyTitle}>Chưa có thẻ bảo hành</Text>
          <Text style={styles.emptyMsg}>Thẻ bảo hành sẽ được cấp sau khi sửa xong.</Text>
        </View>
      ) : (
        <FlatList
          data={warranties}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          renderItem={({ item }) => {
            const active = isActive(item);
            return (
              <View style={[styles.card, !active && styles.expiredCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.code}>🛡 {item.warrantyCode}</Text>
                  <View style={[styles.badge, { backgroundColor: active ? '#d1fae5' : '#f3f4f6' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#065f46' : '#6b7280' }}>
                      {active ? 'CÒN HIỆU LỰC' : 'HẾT HẠN'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.device}>{item.deviceType}{item.brand ? ` — ${item.brand}` : ''}</Text>
                <Text style={styles.meta}>Từ: {formatDateShort(item.startsAt)} đến {formatDateShort(item.endsAt)}</Text>
                <Text style={styles.terms} numberOfLines={2}>{item.warrantyTerms}</Text>
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
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#10b981',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  expiredCard: { borderLeftColor: '#d1d5db', opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  code: { fontWeight: '800', fontSize: 15, color: '#1e293b' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  device: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  meta: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  terms: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptyMsg: { fontSize: 14, color: '#6b7280', marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },
});

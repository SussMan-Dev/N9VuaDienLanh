import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { createPartsRequest } from '../../api/parts-requests';
import { listInventoryItems } from '../../api/inventory';
import { formatCurrency } from '../../utils/formatCurrency';

export default function PartsRequestScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal kho
  const [showItemModal, setShowItemModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchItem, setSearchItem] = useState('');

  useEffect(() => {
    if (showItemModal) {
      loadInventory();
    }
  }, [showItemModal]);

  const loadInventory = async () => {
    setLoadingItems(true);
    const { data } = await listInventoryItems({ search: searchItem || undefined, limit: 30 });
    if (data?.items ?? data) {
      setInventoryItems(data?.items ?? data ?? []);
    }
    setLoadingItems(false);
  };

  const handleSelectItem = (item: any) => {
    // Kiểm tra xem đã có chưa
    const existing = selectedItems.find((it) => it.inventoryItemId === item.id);
    if (existing) {
      existing.quantityRequested += 1;
      setSelectedItems([...selectedItems]);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          inventoryItemId: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          price: item.defaultSalePrice || item.standardCost,
          quantityRequested: 1,
        },
      ]);
    }
    setShowItemModal(false);
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...selectedItems];
    updated[index].quantityRequested += delta;
    if (updated[index].quantityRequested <= 0) {
      updated.splice(index, 1);
    }
    setSelectedItems(updated);
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Chưa chọn linh kiện', 'Vui lòng chọn ít nhất 1 linh kiện từ kho.');
      return;
    }

    Alert.alert(
      'Xác nhận gửi yêu cầu kho',
      `Bạn đang yêu cầu ${selectedItems.length} loại linh kiện. Đơn sẽ chuyển sang trạng thái Chờ linh kiện (GĐ 8) cho đến khi thủ kho xuất hàng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi yêu cầu',
          onPress: async () => {
            setSubmitting(true);
            const res = await createPartsRequest({
              repairOrderId: orderId,
              notes: notes.trim() || undefined,
              items: selectedItems.map((it) => ({
                inventoryItemId: it.inventoryItemId,
                quantityRequested: it.quantityRequested,
              })),
            });
            setSubmitting(false);

            if (res.error) {
              Alert.alert('Lỗi tạo yêu cầu', res.error);
            } else {
              Alert.alert('Thành công', 'Đã gửi yêu cầu cấp phát linh kiện. Đơn đã chuyển sang trạng thái Chờ linh kiện (WAITING_PARTS).');
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📦 Yêu Cầu Cấp Phát Linh Kiện Kho</Text>
        <Text style={styles.headerSub}>Gửi yêu cầu để Thủ kho chuẩn bị và xuất kho trừ tồn thực tế.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Danh sách linh kiện cần cấp ({selectedItems.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowItemModal(true)}>
            <Text style={styles.addBtnText}>+ Chọn linh kiện</Text>
          </TouchableOpacity>
        </View>

        {selectedItems.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có linh kiện nào. Bấm nút chọn linh kiện bên trên.</Text>
        ) : (
          selectedItems.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemSku}>SKU: {it.sku} • Giá: {formatCurrency(it.price)}</Text>
              </View>
              <View style={styles.qtyControl}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(idx, -1)}>
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{it.quantityRequested} {it.unit}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(idx, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Ghi chú lý do cho Thủ kho (nếu có)</Text>
        <TextInput
          style={[styles.input, { height: 70 }]}
          placeholder="Ví dụ: Cần gấp trong buổi sáng để kịp giao máy cho khách..."
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>📤 Gửi Yêu Cầu Sang Thủ Kho (GĐ 8)</Text>
        )}
      </TouchableOpacity>

      {/* Modal danh mục kho */}
      <Modal visible={showItemModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Danh mục Linh kiện Kho</Text>
              <TouchableOpacity onPress={() => setShowItemModal(false)}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#64748b' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="🔍 Tìm theo mã hoặc tên..."
              value={searchItem}
              onChangeText={setSearchItem}
              onSubmitEditing={loadInventory}
            />

            {loadingItems ? (
              <ActivityIndicator style={{ marginVertical: 30 }} size="large" color="#1d4ed8" />
            ) : inventoryItems.length === 0 ? (
              <Text style={styles.emptyText}>Không tìm thấy linh kiện nào.</Text>
            ) : (
              <FlatList
                data={inventoryItems}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.invRow} onPress={() => handleSelectItem(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invName}>{item.name}</Text>
                      <Text style={styles.invSku}>SKU: {item.sku} • Đơn vị: {item.unit}</Text>
                    </View>
                    <Text style={styles.invPrice}>{formatCurrency(item.defaultSalePrice || item.standardCost)}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { marginBottom: 14 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
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
  addBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  addBtnText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13, marginVertical: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  itemSku: { fontSize: 12, color: '#64748b', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { backgroundColor: '#e2e8f0', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#334151' },
  qtyNum: { fontSize: 13, fontWeight: '700', color: '#0f172a', minWidth: 40, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#334151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
  },
  submitBtn: { backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnDisabled: { backgroundColor: '#c4b5fd' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  modalSearch: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 12 },
  invRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  invName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  invSku: { fontSize: 12, color: '#64748b', marginTop: 2 },
  invPrice: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
});

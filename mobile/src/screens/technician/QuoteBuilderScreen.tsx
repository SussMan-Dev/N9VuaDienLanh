import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { createQuote } from '../../api/repairs';
import { listInventoryItems } from '../../api/inventory';
import { formatCurrency } from '../../utils/formatCurrency';

interface QuoteItem {
  itemType: 'LABOR' | 'PART';
  description: string;
  quantity: number;
  unitPrice: number;
  inventoryItemId?: number;
}

export default function QuoteBuilderScreen({ route, navigation }: any) {
  const { orderId, isSupplemental = false } = route.params;
  const [laborAmount, setLaborAmount] = useState('150000');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal chọn linh kiện từ kho
  const [showItemModal, setShowItemModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchItem, setSearchItem] = useState('');

  // Item form tạm
  const [itemDesc, setItemDesc] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');

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

  const handleAddItem = (type: 'LABOR' | 'PART') => {
    const qty = Number(itemQty);
    const price = Number(itemPrice);

    if (!itemDesc.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên công việc hoặc linh kiện.');
      return;
    }
    if (!qty || qty <= 0) {
      Alert.alert('Sai số lượng', 'Số lượng phải lớn hơn 0.');
      return;
    }
    if (price < 0 || isNaN(price)) {
      Alert.alert('Sai đơn giá', 'Đơn giá không hợp lệ.');
      return;
    }

    setItems([...items, { itemType: type, description: itemDesc.trim(), quantity: qty, unitPrice: price }]);
    setItemDesc('');
    setItemQty('1');
    setItemPrice('');
  };

  const handleSelectFromInventory = (inv: any) => {
    setItems([
      ...items,
      {
        itemType: 'PART',
        description: `${inv.name} (${inv.sku})`,
        quantity: 1,
        unitPrice: Number(inv.defaultSalePrice || inv.standardCost || 0),
        inventoryItemId: inv.id,
      },
    ]);
    setShowItemModal(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Tính tổng
  const totalLabor = Number(laborAmount || 0) + items.filter((it) => it.itemType === 'LABOR').reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const totalParts = items.filter((it) => it.itemType === 'PART').reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const grandTotal = totalLabor + totalParts;

  const handleSubmit = async () => {
    if (grandTotal <= 0) {
      Alert.alert('Giá trị không hợp lệ', 'Tổng chi phí báo giá phải lớn hơn 0 ₫.');
      return;
    }

    Alert.alert(
      isSupplemental ? 'Xác nhận Báo giá bổ sung' : 'Xác nhận Báo giá',
      `Tổng chi phí là ${formatCurrency(grandTotal)}. Báo giá sẽ được gửi đến Quản trị viên để thẩm định (Tầng 1)?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi duyệt',
          onPress: async () => {
            setSubmitting(true);
            const res = await createQuote(orderId, {
              laborAmount: Number(laborAmount || 0),
              partsAmount: totalParts,
              isSupplemental,
              notes: notes.trim() || undefined,
              items: items.map((it) => ({
                itemType: it.itemType,
                description: it.description,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                inventoryItemId: it.inventoryItemId,
              })),
            });
            setSubmitting(false);

            if (res.error) {
              Alert.alert('Lỗi tạo báo giá', res.error);
            } else {
              Alert.alert('Thành công', 'Báo giá đã được gửi cho Quản trị viên duyệt (Tầng 1).');
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
        <Text style={styles.headerTitle}>
          {isSupplemental ? '⚡ Lập Báo Giá Bổ Sung (Phát sinh)' : '📝 Lập Báo Giá Sửa Chữa (GĐ 5)'}
        </Text>
        <Text style={styles.headerSub}>
          Quy trình 2 tầng duyệt: KTV lập ➔ Admin thẩm định ➔ Khách hàng đồng ý.
        </Text>
      </View>

      {/* Tiền công sửa chữa cơ bản */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛠️ Tiền công kiểm tra & sửa chữa (VNĐ)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ví dụ: 150000"
          value={laborAmount}
          onChangeText={setLaborAmount}
        />
        <Text style={styles.previewCurrency}>= {formatCurrency(laborAmount)}</Text>
      </View>

      {/* Danh sách linh kiện & hạng mục */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📦 Linh kiện & Phụ tùng ({items.length})</Text>
          <TouchableOpacity style={styles.browseStockBtn} onPress={() => setShowItemModal(true)}>
            <Text style={styles.browseStockBtnText}>🔍 Chọn từ kho</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <Text style={styles.emptyItemsText}>Chưa có linh kiện phụ tùng nào được thêm.</Text>
        ) : (
          items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>• {it.description}</Text>
                <Text style={styles.itemPrice}>
                  {it.quantity} x {formatCurrency(it.unitPrice)} = <Text style={{ fontWeight: '700' }}>{formatCurrency(it.quantity * it.unitPrice)}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={styles.removeBtn}>
                <Text style={{ color: '#ef4444', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Form thêm thủ công nhanh */}
        <View style={styles.manualBox}>
          <Text style={styles.manualTitle}>+ Thêm linh kiện hoặc công việc ngoài kho:</Text>
          <TextInput
            style={styles.input}
            placeholder="Tên linh kiện hoặc nội dung..."
            value={itemDesc}
            onChangeText={setItemDesc}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              keyboardType="numeric"
              placeholder="SL"
              value={itemQty}
              onChangeText={setItemQty}
            />
            <TextInput
              style={[styles.input, { flex: 2 }]}
              keyboardType="numeric"
              placeholder="Đơn giá (VNĐ)"
              value={itemPrice}
              onChangeText={setItemPrice}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#1d4ed8' }]} onPress={() => handleAddItem('PART')}>
              <Text style={styles.addBtnText}>+ Thêm Phụ Tùng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#475569' }]} onPress={() => handleAddItem('LABOR')}>
              <Text style={styles.addBtnText}>+ Thêm Tiền Công</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Ghi chú phương án */}
      <View style={styles.card}>
        <Text style={styles.label}>Ghi chú phương án cho khách & quản lý</Text>
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder="Ví dụ: Đã test áp suất gas còn 40 PSI, cần nạp bổ sung R32 và thay tụ kích..."
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Tổng kết chi phí */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tiền công:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalLabor)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tiền linh kiện:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalParts)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.summaryTotalLabel}>TỔNG CHI PHÍ:</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(grandTotal)}</Text>
        </View>
      </View>

      {/* Nút gửi duyệt */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>📤 Gửi Báo Giá Duyệt Admin (Tầng 1)</Text>
        )}
      </TouchableOpacity>

      {/* Modal chọn từ kho */}
      <Modal visible={showItemModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📦 Chọn linh kiện từ Kho</Text>
              <TouchableOpacity onPress={() => setShowItemModal(false)}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#64748b' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              placeholder="🔍 Tìm theo mã SKU hoặc tên linh kiện..."
              value={searchItem}
              onChangeText={setSearchItem}
              onSubmitEditing={loadInventory}
            />

            {loadingItems ? (
              <ActivityIndicator style={{ marginVertical: 30 }} size="large" color="#1d4ed8" />
            ) : inventoryItems.length === 0 ? (
              <Text style={styles.emptyItemsText}>Không tìm thấy linh kiện nào.</Text>
            ) : (
              <FlatList
                data={inventoryItems}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.invRow} onPress={() => handleSelectFromInventory(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invName}>{item.name}</Text>
                      <Text style={styles.invSku}>SKU: {item.sku} • Tồn: {item.currentStock ?? '—'} {item.unit}</Text>
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
  browseStockBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  browseStockBtnText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#334151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  previewCurrency: { color: '#0284c7', fontSize: 13, fontWeight: '600', marginTop: -4 },
  emptyItemsText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13, marginVertical: 6 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  itemPrice: { fontSize: 12, color: '#64748b', marginTop: 2 },
  removeBtn: { padding: 8 },
  manualBox: { marginTop: 12, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  manualTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  addBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  summaryCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { color: '#94a3b8', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  summaryTotalRow: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 6, paddingTop: 6 },
  summaryTotalLabel: { color: '#38bdf8', fontSize: 15, fontWeight: '800' },
  summaryTotalValue: { color: '#38bdf8', fontSize: 18, fontWeight: '800' },
  submitBtn: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#93c5fd' },
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

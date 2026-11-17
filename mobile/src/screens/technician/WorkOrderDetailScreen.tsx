import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Linking, ActivityIndicator, Image, Platform,
} from 'react-native';
import { getRepairOrder, transitionStatus, listQuotes } from '../../api/repairs';
import { listRepairLogs } from '../../api/repair-logs';
import { getStatusInfo } from '../../utils/repairStatus';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

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

function getProgressStep(status: string): number {
  if (['PENDING', 'ACCEPTED', 'ASSIGNED', 'DIAGNOSING'].includes(status)) return 1;
  if (['AWAITING_ADMIN_APPROVAL', 'AWAITING_CUSTOMER_APPROVAL', 'APPROVED'].includes(status)) return 2;
  if (['IN_PROGRESS', 'REPAIRING', 'WAITING_PARTS'].includes(status)) return 3;
  if (['COMPLETED', 'WAITING_PAYMENT', 'PAID', 'DELIVERED'].includes(status)) return 4;
  return 1;
}

export default function WorkOrderDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [orderRes, logRes, quoteRes] = await Promise.all([
      getRepairOrder(id),
      listRepairLogs(id),
      listQuotes(id),
    ]);

    if (orderRes.data) setOrder(orderRes.data);
    if (logRes.data) setLogs(logRes.data.items ?? logRes.data ?? []);
    if (quoteRes.data) setQuotes(quoteRes.data.items ?? quoteRes.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const handleCallCustomer = () => {
    const phone = order?.customerPhone;
    if (!phone) {
      Alert.alert('Không có SĐT', 'Phiếu này không có số điện thoại khách hàng.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMap = () => {
    const address = order?.customerAddress || order?.serviceAddress;
    if (!address) {
      Alert.alert('Không có địa chỉ', 'Phiếu này chưa cập nhật địa chỉ khách hàng.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const handleTransition = async (toStatus: string, reason?: string) => {
    setSubmitting(true);
    const res = await transitionStatus(id, toStatus, reason);
    setSubmitting(false);
    if (res.error) {
      Alert.alert('Lỗi thao tác', res.error);
    } else {
      Alert.alert('Thành công', `Đã cập nhật trạng thái phiếu sang ${toStatus}`);
      loadData();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Đang tải chi tiết hồ sơ sửa chữa...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ fontSize: 16, color: '#64748b' }}>Không tìm thấy thông tin phiếu sửa chữa.</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo(order.repairStatus);
  const currentStep = getProgressStep(order.repairStatus);
  const deviceIcon = getDeviceIcon(order.deviceType);
  const deviceName = order.deviceType || 'Thiết bị điện máy';
  const brandModel = [order.brand || order.deviceBrand, order.model || order.deviceModel || order.modelNumber].filter(Boolean).join(' - ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 50 }}>
      {/* 1. Thanh Tiến Trình 4 Bước Hiện Đại */}
      <View style={styles.stepperCard}>
        <View style={styles.stepperRow}>
          {[
            { step: 1, title: 'Phân công' },
            { step: 2, title: 'Báo giá' },
            { step: 3, title: 'Sửa chữa' },
            { step: 4, title: 'Nghiệm thu' },
          ].map((item, index) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <React.Fragment key={item.step}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      isCompleted && styles.stepCircleDone,
                      isCurrent && styles.stepCircleActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNumber,
                        (isCompleted || isCurrent) && styles.stepNumberActive,
                      ]}
                    >
                      {isCompleted ? '✓' : item.step}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCurrent && styles.stepLabelActive,
                      isCompleted && styles.stepLabelDone,
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
                {index < 3 && (
                  <View
                    style={[
                      styles.stepLine,
                      currentStep > index + 1 && styles.stepLineActive,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* 2. Thẻ Thông Tin Thiết Bị & Trạng Thái */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderCode}>#{order.orderCode || order.code}</Text>
            <Text style={styles.orderDate}>📅 Tiếp nhận: {formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.badgeText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.deviceHeroRow}>
          <Text style={styles.deviceIconLarge}>{deviceIcon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceTitle}>{deviceName}</Text>
            {brandModel ? <Text style={styles.deviceSubtitle}>{brandModel}</Text> : null}
            {order.serialNumber ? (
              <Text style={styles.metaText}>Serial / Số máy: {order.serialNumber}</Text>
            ) : null}
          </View>
        </View>

        {order.reportedIssue || order.issueDescription ? (
          <View style={styles.issueBox}>
            <Text style={styles.issueLabel}>⚠️ Hiện tượng lỗi khách báo:</Text>
            <Text style={styles.issueText}>{order.reportedIssue || order.issueDescription}</Text>
          </View>
        ) : null}
      </View>

      {/* 3. Thẻ Khách Hàng & Nút Gọi/Dẫn Đường Nhanh */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>👤 Thông tin Khách hàng</Text>
        <Text style={styles.customerName}>{order.customerName || 'Khách vãng lai'}</Text>
        {order.customerPhone && (
          <Text style={styles.customerPhone}>📞 {order.customerPhone}</Text>
        )}
        <Text style={styles.customerAddress}>
          📍 {order.customerAddress || order.serviceAddress || 'Tại cửa hàng'}
        </Text>
        {order.preferredDatetime && (
          <Text style={styles.customerTime}>
            ⏰ Thời gian hẹn: <Text style={{ fontWeight: '700', color: '#1d4ed8' }}>{formatDate(order.preferredDatetime)}</Text>
          </Text>
        )}

        <View style={styles.quickContactRow}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.btnCall]}
            onPress={handleCallCustomer}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnText}>📞 Gọi cho khách</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.btnMap]}
            onPress={handleOpenMap}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnText}>🗺️ Chỉ đường Maps</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Khối Thao Tác Quy Trình Sửa Chữa (Đã bỏ chẩn đoán, vào thẳng báo giá) */}
      <View style={styles.workflowCard}>
        <Text style={styles.workflowTitle}>⚡ Thao tác theo giai đoạn</Text>

        {/* Giai đoạn: ASSIGNED hoặc DIAGNOSING -> KTV bấm LẬP BÁO GIÁ ngay */}
        {(order.repairStatus === 'ASSIGNED' || order.repairStatus === 'DIAGNOSING') && (
          <View>
            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.btnCreateQuote]}
              onPress={() => navigation.navigate('QuoteBuilder', { orderId: order.id, isSupplemental: false })}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>📝 Lập Báo Giá Gửi Admin Duyệt</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              💡 Nhập chi phí tiền công và linh kiện thay thế dự kiến để gửi Quản trị viên duyệt tầng 1.
            </Text>
          </View>
        )}

        {/* Giai đoạn: AWAITING_ADMIN_APPROVAL */}
        {order.repairStatus === 'AWAITING_ADMIN_APPROVAL' && (
          <View style={styles.alertBoxAmber}>
            <Text style={styles.alertIcon}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitleAmber}>Đang chờ Admin thẩm định báo giá</Text>
              <Text style={styles.alertTextAmber}>
                Báo giá đã được gửi lên hệ thống. Quản trị viên sẽ phê duyệt trước khi gửi đến Khách hàng.
              </Text>
            </View>
          </View>
        )}

        {/* Giai đoạn: AWAITING_CUSTOMER_APPROVAL */}
        {order.repairStatus === 'AWAITING_CUSTOMER_APPROVAL' && (
          <View style={styles.alertBoxOrange}>
            <Text style={styles.alertIcon}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitleOrange}>Đang chờ Khách hàng xác nhận</Text>
              <Text style={styles.alertTextOrange}>
                Admin đã duyệt báo giá. Khách hàng đang xem chi tiết và xác nhận trên ứng dụng di động.
              </Text>
            </View>
          </View>
        )}

        {/* Giai đoạn: APPROVED -> Khách duyệt xong -> Bắt đầu sửa */}
        {order.repairStatus === 'APPROVED' && (
          <View>
            <TouchableOpacity
              style={[styles.primaryActionBtn, styles.btnStartRepair]}
              onPress={() => handleTransition('IN_PROGRESS', 'KTV bắt đầu thực hiện sửa chữa')}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>🔧 Khách Đã Duyệt — Bắt Đầu Sửa Chữa</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              ✓ Khách hàng đã chấp thuận chi phí. Bấm để chuyển sang trạng thái đang sửa chữa.
            </Text>
          </View>
        )}

        {/* Giai đoạn: IN_PROGRESS / REPAIRING */}
        {(order.repairStatus === 'IN_PROGRESS' || order.repairStatus === 'REPAIRING') && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#0284c7' }]}
              onPress={() => navigation.navigate('CameraLog', { orderId: order.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>📸 Chụp ảnh & Ghi nhật ký thực hiện</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#7c3aed' }]}
              onPress={() => navigation.navigate('PartsRequest', { orderId: order.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>📦 Yêu cầu linh kiện từ kho</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#ea580c' }]}
              onPress={() => navigation.navigate('QuoteBuilder', { orderId: order.id, isSupplemental: true })}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>⚡ Phát sinh hỏng mới — Báo giá bổ sung</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#16a34a' }]}
              onPress={() => handleTransition('COMPLETED', 'KTV hoàn tất sửa chữa và đã nghiệm thu máy đạt chuẩn')}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>✅ Hoàn Thành Sửa Chữa (Chuyển Kế Toán)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Giai đoạn: WAITING_PARTS */}
        {order.repairStatus === 'WAITING_PARTS' && (
          <View style={styles.alertBoxAmber}>
            <Text style={styles.alertIcon}>📦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitleAmber}>Chờ Thủ Kho Xuất Linh Kiện</Text>
              <Text style={styles.alertTextAmber}>
                Yêu cầu linh kiện đã được chuyển sang kho. Khi thủ kho xuất hàng, phiếu sẽ tự động chuyển về Đang sửa chữa.
              </Text>
            </View>
          </View>
        )}

        {/* Giai đoạn: COMPLETED / PAID / DELIVERED */}
        {['COMPLETED', 'WAITING_PAYMENT', 'PAID', 'DELIVERED'].includes(order.repairStatus) && (
          <View style={styles.alertBoxGreen}>
            <Text style={styles.alertIcon}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitleGreen}>Đã Hoàn Tất Sửa Chữa</Text>
              <Text style={styles.alertTextGreen}>
                Thiết bị đã sửa xong. Bộ phận Thu ngân & Kế toán đang xử lý thanh toán và chuẩn bị bàn giao máy cho khách.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 5. Thông Tin Lịch Sử Báo Giá */}
      {quotes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💰 Lịch sử Báo giá ({quotes.length})</Text>
          {quotes.map((q) => {
            const total = Number(q.laborAmount ?? q.laborTotal ?? 0) + Number(q.partsAmount ?? q.partsTotal ?? 0);
            return (
              <View key={q.id} style={styles.quoteItemBox}>
                <View style={styles.quoteItemHeader}>
                  <Text style={styles.quoteVersion}>
                    Báo giá v{q.versionNo ?? q.versionNumber ?? q.id} {q.isSupplemental ? '⚡ (Bổ sung)' : ''}
                  </Text>
                  <View style={[styles.quoteBadge, q.status === 'APPROVED' ? styles.quoteBadgeApproved : styles.quoteBadgePending]}>
                    <Text style={[styles.quoteBadgeText, q.status === 'APPROVED' ? styles.quoteBadgeTextApproved : styles.quoteBadgeTextPending]}>
                      {q.status === 'APPROVED' ? 'ĐÃ DUYỆT' : q.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.quoteTotal}>Tổng chi phí: {formatCurrency(total)}</Text>
                <Text style={styles.quoteSub}>
                  Tiền công: {formatCurrency(q.laborAmount ?? q.laborTotal ?? 0)} | Vật tư: {formatCurrency(q.partsAmount ?? q.partsTotal ?? 0)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 6. Nhật Ký & Ảnh Thực Tế Trước/Sau */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>📷 Nhật ký & Ảnh thực tế ({logs.length})</Text>
          {(order.repairStatus === 'IN_PROGRESS' || order.repairStatus === 'REPAIRING') && (
            <TouchableOpacity
              onPress={() => navigation.navigate('CameraLog', { orderId: order.id })}
              style={styles.addLogSmallBtn}
            >
              <Text style={styles.addLogSmallText}>+ Chụp thêm</Text>
            </TouchableOpacity>
          )}
        </View>

        {logs.length === 0 ? (
          <View style={styles.emptyLogBox}>
            <Text style={styles.emptyLogText}>Chưa có ảnh đối chiếu hoặc nhật ký nào.</Text>
            <Text style={styles.emptyLogSub}>Khi bắt đầu sửa, KTV có thể chụp ảnh hiện trạng trước và sau để lưu trữ minh bạch.</Text>
          </View>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <Text style={styles.logAuthor}>
                🔧 {log.technicianName} • <Text style={styles.logTime}>{formatDate(log.loggedAt || log.createdAt)}</Text>
              </Text>
              <Text style={styles.logWork}>{log.workPerformed}</Text>

              {/* Ảnh trước sửa chữa */}
              {log.imagesBefore && log.imagesBefore.length > 0 && (
                <View style={styles.imageSection}>
                  <Text style={styles.imageSectionTitle}>📷 Hiện trạng Trước khi sửa:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {log.imagesBefore.map((img: string, idx: number) => (
                      <Image key={idx} source={{ uri: img }} style={styles.previewThumbnail} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Ảnh sau sửa chữa */}
              {log.imagesAfter && log.imagesAfter.length > 0 && (
                <View style={styles.imageSection}>
                  <Text style={styles.imageSectionTitle}>✨ Kết quả Sau khi sửa:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                    {log.imagesAfter.map((img: string, idx: number) => (
                      <Image key={idx} source={{ uri: img }} style={styles.previewThumbnail} />
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14, fontWeight: '600' },

  // Stepper
  stepperCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  stepItem: { alignItems: 'center', minWidth: 55 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#cbd5e1', marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  stepCircleDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  stepNumber: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  stepNumberActive: { color: '#fff' },
  stepLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  stepLabelActive: { color: '#1d4ed8', fontWeight: '800' },
  stepLabelDone: { color: '#10b981', fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 2, marginBottom: 16 },
  stepLineActive: { backgroundColor: '#10b981' },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderCode: { fontWeight: '800', fontSize: 18, color: '#1e293b' },
  orderDate: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },

  deviceHeroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 },
  deviceIconLarge: { fontSize: 36, marginRight: 12 },
  deviceTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  deviceSubtitle: { fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 2 },
  metaText: { fontSize: 12, color: '#64748b', marginTop: 2 },

  issueBox: {
    marginTop: 8, backgroundColor: '#fffbeb', padding: 12, borderRadius: 10,
    borderLeftWidth: 4, borderLeftColor: '#f59e0b',
  },
  issueLabel: { fontSize: 12, fontWeight: '700', color: '#b45309', marginBottom: 2 },
  issueText: { fontSize: 13, color: '#92400e', lineHeight: 18 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  customerPhone: { fontSize: 14, color: '#1d4ed8', fontWeight: '600', marginTop: 2 },
  customerAddress: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  customerTime: { fontSize: 12, color: '#64748b', marginTop: 4 },

  quickContactRow: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  quickBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnCall: { backgroundColor: '#10b981' },
  btnMap: { backgroundColor: '#0284c7' },
  quickBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Workflow Action Card
  workflowCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1.5, borderColor: '#bfdbfe',
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  workflowTitle: { fontSize: 15, fontWeight: '800', color: '#1d4ed8', marginBottom: 12 },
  primaryActionBtn: {
    backgroundColor: '#1d4ed8', paddingVertical: 13, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  btnCreateQuote: { backgroundColor: '#1d4ed8' },
  btnStartRepair: { backgroundColor: '#10b981' },
  primaryActionText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  helperText: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 16 },

  // Alerts
  alertBoxAmber: {
    flexDirection: 'row', backgroundColor: '#fffbeb', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#fef3c7', gap: 10, alignItems: 'center',
  },
  alertIcon: { fontSize: 28 },
  alertTitleAmber: { fontSize: 13, fontWeight: '800', color: '#b45309' },
  alertTextAmber: { fontSize: 12, color: '#92400e', marginTop: 2, lineHeight: 16 },

  alertBoxOrange: {
    flexDirection: 'row', backgroundColor: '#fff7ed', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#ffedd5', gap: 10, alignItems: 'center',
  },
  alertTitleOrange: { fontSize: 13, fontWeight: '800', color: '#c2410c' },
  alertTextOrange: { fontSize: 12, color: '#9a3412', marginTop: 2, lineHeight: 16 },

  alertBoxGreen: {
    flexDirection: 'row', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0', gap: 10, alignItems: 'center',
  },
  alertTitleGreen: { fontSize: 13, fontWeight: '800', color: '#15803d' },
  alertTextGreen: { fontSize: 12, color: '#166534', marginTop: 2, lineHeight: 16 },

  // Quotes
  quoteItemBox: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  quoteItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  quoteVersion: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  quoteBadge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  quoteBadgeApproved: { backgroundColor: '#dcfce7' },
  quoteBadgePending: { backgroundColor: '#fef3c7' },
  quoteBadgeText: { fontSize: 10, fontWeight: '700' },
  quoteBadgeTextApproved: { color: '#15803d' },
  quoteBadgeTextPending: { color: '#b45309' },
  quoteTotal: { fontSize: 14, fontWeight: '800', color: '#16a34a', marginTop: 2 },
  quoteSub: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Logs
  addLogSmallBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  addLogSmallText: { color: '#1d4ed8', fontSize: 11, fontWeight: '700' },
  emptyLogBox: { backgroundColor: '#f8fafc', padding: 14, borderRadius: 10, alignItems: 'center' },
  emptyLogText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  emptyLogSub: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  logCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  logAuthor: { fontSize: 12, fontWeight: '700', color: '#334155' },
  logTime: { fontSize: 11, color: '#94a3b8', fontWeight: '400' },
  logWork: { fontSize: 13, color: '#1e293b', marginTop: 4, lineHeight: 18 },
  imageSection: { marginTop: 8 },
  imageSectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  imageScroll: { flexDirection: 'row' },
  previewThumbnail: { width: 70, height: 70, borderRadius: 8, marginRight: 8, backgroundColor: '#e2e8f0' },
});

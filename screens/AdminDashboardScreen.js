import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, FlatList, Image } from 'react-native';
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, increment, getDocs, where, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { SwipeListView } from 'react-native-swipe-list-view';
import { db } from '../firebaseConfig';
import { COLORS } from '../theme';
import { CONFIG } from '../config';

export default function AdminDashboardScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [rewardAmount, setRewardAmount] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [productCount, setProductCount] = useState(0);
  const [allOrders, setAllOrders] = useState([]);

  const STATUS_STEPS = ['Order Placed', 'Confirmed', 'Processing', 'Out for Delivery', 'Completed'];

  useEffect(() => {
    const fetchProductCount = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, "Products"));
        setProductCount(snapshot.data().count);
      } catch (e) { console.error("Error fetching count:", e); }
    };
    fetchProductCount();
  }, []);

  useEffect(() => {
    setLoading(true);
    let unsubscribe;

    if (tab === 'products') {
      unsubscribe = onSnapshot(collection(db, "Products"), (snapshot) => {
        setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    } else if (tab === 'users') {
      unsubscribe = onSnapshot(collection(db, "Users"), async (snapshot) => {
        const usersData = await Promise.all(snapshot.docs.map(async (uDoc) => {
          const q = query(collection(db, "Orders"), where("userId", "==", uDoc.id), orderBy("createdAt", "desc"), limit(1));
          const orderSnap = await getDocs(q);
          return { id: uDoc.id, ...uDoc.data(), lastOrder: orderSnap.docs[0]?.data() };
        }));
        setUsers(usersData);
        setLoading(false);
      });
    } else {
      unsubscribe = onSnapshot(
        query(collection(db, "Orders"), orderBy("createdAt", "desc")),
        { includeMetadataChanges: true }, 
        (snapshot) => {
          const data = snapshot.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            hasNewMessage: !!d.data().hasNewMessage 
          }));
          
          setAllOrders(data);
          
          const filtered = tab === 'current' 
            ? data.filter(i => i.status !== 'Completed') 
            : data.filter(i => i.status === 'Completed');
          
          setOrders(filtered);
          setLoading(false);
        }
      );
    }
    return () => unsubscribe && unsubscribe();
  }, [tab]);

  const proceedOrder = async (orderId, currentStatus) => {
    const currentIndex = STATUS_STEPS.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= STATUS_STEPS.length - 1) return;
    try {
      await updateDoc(doc(db, "Orders", orderId), { status: STATUS_STEPS[currentIndex + 1] });
    } catch (error) {
      Alert.alert("Error", "Could not update order status.");
    }
  };

  const deleteOrder = async (orderId) => {
    Alert.alert("Delete Order", "Are you sure?", [
      { text: "Cancel" },
      { text: "Delete", onPress: async () => await deleteDoc(doc(db, "Orders", orderId)) }
    ]);
  };

  const handleGrantReward = async () => {
    if (!rewardAmount || isNaN(rewardAmount)) return Alert.alert("Error", "Enter valid amount");
    await updateDoc(doc(db, "Users", selectedUser.id), { loyaltyRewards: increment(Number(rewardAmount)) });
    Alert.alert("Success", "Rewards granted!");
    setRewardAmount('');
    setSelectedUser(null);
  };

  const toggleStockStatus = async (productId, currentStatus) => {
    try { await updateDoc(doc(db, "Products", productId), { isOutOfStock: !currentStatus }); } 
    catch (error) { Alert.alert("Error", "Could not update status."); }
  };

  const totalAmount = (ordersList) => ordersList.reduce((s, o) => s + Number(o.totalAmount || 0), 0);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const getOrderDate = (o) => {
    const d = o.createdAt;
    if (!d) return null;
    const ts = d.seconds ? d.seconds * 1000 : (typeof d === 'string' ? Date.parse(d) : d);
    return new Date(ts);
  };

  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const todayOrders = allOrders.filter(o => { const d = getOrderDate(o); return d && isSameDay(d, todayStart); });
  const yesterdayOrders = allOrders.filter(o => { const d = getOrderDate(o); return d && isSameDay(d, yesterdayStart); });
  const weekOrders = allOrders.filter(o => { const d = getOrderDate(o); return d && d >= sevenDaysAgo && d <= now; });
  const monthOrders = allOrders.filter(o => { const d = getOrderDate(o); return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });

  const todayEarning = totalAmount(todayOrders);
  const yesterdayEarning = totalAmount(yesterdayOrders);
  const weekEarning = totalAmount(weekOrders);
  const monthEarning = totalAmount(monthOrders);

  return (
    <View style={styles.container}>
      <View style={styles.adminHeader}>
        <View>
          <Text style={styles.adminTitle}>Admin Dashboard</Text>
          <Text style={styles.subTitle}>Total Products: {productCount}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ChangeCredentials')}>
          <Text style={styles.changeCredText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.earningRow}>
        <View style={[styles.earningCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.earningLabel}>Today</Text>
          <Text style={styles.earningValue}>{CONFIG.CURRENCY} {todayEarning.toFixed(2)}</Text>
        </View>
        <View style={[styles.earningCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={styles.earningLabel}>Yesterday</Text>
          <Text style={styles.earningValue}>{CONFIG.CURRENCY} {yesterdayEarning.toFixed(2)}</Text>
        </View>
        <View style={[styles.earningCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.earningLabel}>Last 7 Days</Text>
          <Text style={styles.earningValue}>{CONFIG.CURRENCY} {weekEarning.toFixed(2)}</Text>
        </View>
        <View style={[styles.earningCard, { backgroundColor: '#F3E5F5' }]}>
          <Text style={styles.earningLabel}>This Month</Text>
          <Text style={styles.earningValue}>{CONFIG.CURRENCY} {monthEarning.toFixed(2)}</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddItemScreen')}>
        <Text style={styles.fabText}>+ Add Product</Text>
      </TouchableOpacity>

      <View style={styles.tabContainer}>
        {['current', 'history', 'users', 'products'].map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} /> : (
        tab === 'products' ? (
          <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.summaryLabel}>Total Products</Text>
              <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{products.length}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.summaryLabel}>In Stock</Text>
              <Text style={[styles.summaryValue, { color: '#E65100' }]}>{products.filter(p => !p.isOutOfStock).length}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
              <Text style={styles.summaryLabel}>Out of Stock</Text>
              <Text style={[styles.summaryValue, { color: '#C62828' }]}>{products.filter(p => p.isOutOfStock).length}</Text>
            </View>
          </View>
          <FlatList data={products} keyExtractor={(i) => i.id} contentContainerStyle={{ paddingBottom: 20 }} renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Image source={{ uri: item.imageUrl }} style={styles.productCardImg} />
              <View style={styles.productCardInfo}>
                <Text style={styles.productCardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productCardCategory}>{item.category}</Text>
                <Text style={styles.productCardPrice}>{CONFIG.CURRENCY} {Number(item.price || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.productCardActions}>
                <View style={[styles.stockDot, { backgroundColor: item.isOutOfStock ? '#EF5350' : '#66BB6A' }]} />
                <TouchableOpacity
                  style={[styles.stockToggleBtn, { backgroundColor: item.isOutOfStock ? '#4CAF50' : '#EF5350' }]}
                  onPress={() => toggleStockStatus(item.id, item.isOutOfStock)}
                >
                  <Text style={styles.stockToggleText}>{item.isOutOfStock ? 'In' : 'Out'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )} />
          </>
        ) : tab === 'users' ? (
          <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.summaryLabel}>Total Users</Text>
              <Text style={[styles.summaryValue, { color: '#1565C0' }]}>{users.length}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
              <Text style={styles.summaryLabel}>With Rewards</Text>
              <Text style={[styles.summaryValue, { color: '#7B1FA2' }]}>{users.filter(u => (u.loyaltyRewards || 0) > 0).length}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.summaryLabel}>Total Rewards</Text>
              <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{CONFIG.CURRENCY} {users.reduce((s, u) => s + (u.loyaltyRewards || 0), 0).toFixed(2)}</Text>
            </View>
          </View>
          <FlatList data={users} keyExtractor={(i) => i.id} contentContainerStyle={{ paddingBottom: 20 }} renderItem={({ item }) => (
            <TouchableOpacity style={styles.userCardNew} onPress={() => navigation.navigate('AdminUserDetails', { userId: item.id })} activeOpacity={0.7}>
              <View style={styles.userAvatarWrap}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{item.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userInfoName}>{item.name || 'Anonymous User'}</Text>
                {item.email && <Text style={styles.userInfoEmail}>{item.email}</Text>}
                <View style={styles.userMetaRow}>
                  <Text style={styles.userMetaText}>ID: {item.uniqueId || item.id?.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.userMetaDivider}>|</Text>
                  <Text style={styles.userMetaText}>{item.loyaltyRewards || 0} LR</Text>
                </View>
                {item.lastOrder && (
                  <Text style={styles.userLastOrder}>
                    Last order: {CONFIG.CURRENCY} {Number(item.lastOrder.totalAmount || 0).toFixed(2)}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.grantBtn} onPress={() => setSelectedUser(item)}>
                <Text style={styles.grantBtnText}>+</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )} />
          </>
        ) : tab === 'history' ? (
            <>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.summaryLabel}>Completed Orders</Text>
                  <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{orders.length}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.summaryLabel}>Amount Received</Text>
                  <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{CONFIG.CURRENCY} {orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0).toFixed(2)}</Text>
                </View>
              </View>
              <FlatList
                data={orders}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const date = item.createdAt
                    ? new Date(item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                  const itemsCount = item.items?.length || 0;
                  return (
                    <TouchableOpacity style={styles.historyCard} onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}>
                      <View style={styles.historyTop}>
                        <View style={styles.historyIdRow}>
                          <Text style={styles.historyId}>#{item.id?.slice(-8).toUpperCase()}</Text>
                          <Text style={styles.historyDate}>{date}</Text>
                        </View>
                        <View style={styles.paidBadge}>
                          <Text style={styles.paidBadgeText}>Paid</Text>
                        </View>
                      </View>
                      <View style={styles.historyMid}>
                        <Text style={styles.historyCustomer}>{item.customerName || 'Guest'}</Text>
                        <Text style={styles.historyItems}>{itemsCount} item{itemsCount !== 1 ? 's' : ''}</Text>
                      </View>
                      <View style={styles.historyBottom}>
                        <Text style={styles.historyAmount}>{CONFIG.CURRENCY} {Number(item.totalAmount || 0).toFixed(2)}</Text>
                        <Text style={styles.historyPayment}>{item.paymentMethod || 'COD'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: '#999' }}>No completed orders yet.</Text>}
              />
            </>
          ) : (
            <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.summaryLabel}>Pending Orders</Text>
                <Text style={[styles.summaryValue, { color: '#E65100' }]}>{allOrders.filter(o => o.status !== 'Completed').length}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.summaryLabel}>Pending Amount</Text>
                <Text style={[styles.summaryValue, { color: '#1565C0' }]}>{CONFIG.CURRENCY} {allOrders.filter(o => o.status !== 'Completed').reduce((s, o) => s + Number(o.totalAmount || 0), 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.summaryLabel}>Amount Received</Text>
                <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{CONFIG.CURRENCY} {allOrders.filter(o => o.status === 'Completed').reduce((s, o) => s + Number(o.totalAmount || 0), 0).toFixed(2)}</Text>
              </View>
            </View>
          <SwipeListView 
            data={orders} 
            extraData={orders}
            keyExtractor={(i) => i.id} 
            renderItem={({ item }) => (
              <View style={[styles.orderCard, { backgroundColor: item.hasNewMessage ? '#FFFBEA' : '#FFF' }]}>
                <TouchableOpacity onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.orderId}>#{item.id?.slice(0, 6)}</Text>
                    {item.hasNewMessage && (
                        <View style={styles.badgeAlert}><Text style={styles.badgeAlertText}>NEW MESSAGE</Text></View>
                    )}
                    <View style={[styles.pill, {backgroundColor: item.status === 'Completed' ? '#E8F5E9' : '#FFF3E0'}]}>
                      <Text style={{fontSize: 10, color: item.status === 'Completed' ? '#2E7D32' : '#EF6C00'}}>{item.status || 'PENDING'}</Text>
                    </View>
                  </View>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <Text style={styles.price}>{CONFIG.CURRENCY} {Number(item.totalAmount || 0).toFixed(2)}</Text>
                </TouchableOpacity>
                
                {item.status !== 'Completed' && (
                  <TouchableOpacity style={styles.proceedBtn} onPress={() => proceedOrder(item.id, item.status)} activeOpacity={0.8}>
                    <Text style={styles.proceedBtnText}>→ {STATUS_STEPS[STATUS_STEPS.indexOf(item.status) + 1]?.toUpperCase()}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )} 
            renderHiddenItem={(data) => (
              <View style={styles.rowBack}>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteOrder(data.item.id)}>
                  <Text style={{color:'#FFF', fontWeight:'bold'}}>Delete</Text>
                </TouchableOpacity>
              </View>
            )} 
            rightOpenValue={-75} 
          />
          </>
        )
      )
    }
      
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Grant Rewards to {selectedUser?.name}</Text>
            <TextInput placeholder="Enter amount" keyboardType="numeric" value={rewardAmount} onChangeText={setRewardAmount} style={styles.input} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, {backgroundColor: '#ccc'}]} onPress={() => setSelectedUser(null)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, {backgroundColor: COLORS.primary}]} onPress={handleGrantReward}><Text style={{color: '#FFF'}}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  adminHeader: { backgroundColor: COLORS.primary, padding: 30, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between' },
  adminTitle: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  subTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  changeCredText: { color: 'rgba(255,255,255,0.7)', marginTop: 10 },
  earningRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6 },
  earningCard: { flex: 1, padding: 8, borderRadius: 10, alignItems: 'center' },
  earningLabel: { fontSize: 9, fontWeight: '600', color: '#555', marginBottom: 2 },
  earningValue: { fontSize: 12, fontWeight: '800', color: '#222' },
  summaryRow: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 10, gap: 8 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: '#666', marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: '800' },
  fab: { position: 'absolute', right: 20, top: 65, backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, elevation: 5, zIndex: 10 },
  fabText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  tabContainer: { flexDirection: 'row', margin: 15, backgroundColor: '#EEE', borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FFF', elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#666' },
  activeTabText: { color: COLORS.primary },
  userCard: { backgroundColor: '#FFF', padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userIdText: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  badge: { fontSize: 11, backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, marginTop: 5 },
  rewardBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  rewardBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  orderCard: { padding: 15, marginHorizontal: 15, marginBottom: 10, borderRadius: 12, elevation: 1 },
  badgeAlert: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  badgeAlertText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  orderId: { fontSize: 10, color: '#999' },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  customerName: { fontSize: 16, fontWeight: '600' },
  price: { fontWeight: 'bold', fontSize: 15, marginTop: 5 },
  proceedBtn: { marginTop: 10, backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  proceedBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  productCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginBottom: 10, borderRadius: 14, padding: 12, elevation: 1, flexDirection: 'row', alignItems: 'center' },
  productCardImg: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#F0F2F1' },
  productCardInfo: { flex: 1, marginLeft: 12 },
  productCardName: { fontSize: 14, fontWeight: '700', color: '#222' },
  productCardCategory: { fontSize: 11, color: '#888', marginTop: 1 },
  productCardPrice: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginTop: 3 },
  productCardActions: { alignItems: 'center', gap: 6 },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  stockToggleBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  stockToggleText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  userCardNew: { backgroundColor: '#FFF', marginHorizontal: 15, marginBottom: 10, borderRadius: 14, padding: 14, elevation: 1, flexDirection: 'row', alignItems: 'center' },
  userAvatarWrap: { marginRight: 14 },
  userAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userInfoName: { fontSize: 15, fontWeight: '700', color: '#222' },
  userInfoEmail: { fontSize: 12, color: '#888', marginTop: 1 },
  userMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  userMetaText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  userMetaDivider: { fontSize: 11, color: '#DDD' },
  userLastOrder: { fontSize: 11, color: '#999', marginTop: 3, fontStyle: 'italic' },
  grantBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(46,125,50,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  grantBtnText: { fontSize: 20, color: COLORS.primary, fontWeight: '700', lineHeight: 22 },
  historyCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginBottom: 10, borderRadius: 14, padding: 16, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyId: { fontSize: 13, fontWeight: '700', color: '#333' },
  historyDate: { fontSize: 11, color: '#999' },
  paidBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  paidBadgeText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  historyMid: { marginBottom: 8 },
  historyCustomer: { fontSize: 15, fontWeight: '600', color: '#222' },
  historyItems: { fontSize: 12, color: '#888', marginTop: 2 },
  historyBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8 },
  historyAmount: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  historyPayment: { fontSize: 11, color: '#666', backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  rowBack: { marginHorizontal: 15, marginBottom: 10, flex: 1, justifyContent: 'center', alignItems: 'flex-end', backgroundColor: '#FF5252', borderRadius: 12 },
  deleteButton: { padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 25, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#DDD', padding: 12, borderRadius: 8, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  btn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 10, marginHorizontal: 5 }
});
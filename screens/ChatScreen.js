import React, { useState, useEffect, useRef } from 'react';
import { 
  View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, writeBatch, getDocs, doc, setDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../AuthContext';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const flatListRef = useRef(null);

  const isAdmin = user?.role === 'admin' || user?.email === 'shoaib@developer.com';

  useEffect(() => {
    const clearNotifications = async () => {
      if (!orderId) return;
      try {
        const orderRef = doc(db, "Orders", orderId);
        const updateData = isAdmin 
          ? { hasNewMessage: false } 
          : { hasNewMessageForUser: false };
        await setDoc(orderRef, updateData, { merge: true });
      } catch (error) {
        console.error("Error clearing notification flag:", error);
      }
    };
    clearNotifications();
  }, [orderId, user, isAdmin]);

  useEffect(() => {
    if (!orderId || !user) return;
    const messagesRef = collection(db, "Orders", orderId, "Messages");
    const hiddenRef = collection(db, "Orders", orderId, "HiddenMessages", user.uid, "DeletedItems");

    const unsubscribe = onSnapshot(query(messagesRef, orderBy("createdAt", "asc")), async (msgSnapshot) => {
      const hiddenSnapshot = await getDocs(hiddenRef);
      const hiddenIds = hiddenSnapshot.docs.map(d => d.id);

      const msgs = msgSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => !hiddenIds.includes(m.id));

      setMessages(msgs);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      const unread = msgSnapshot.docs.filter(d => 
        d.data().read === false && d.data().senderId !== user.uid && !hiddenIds.includes(d.id)
      );
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
      }
    });

    return unsubscribe;
  }, [orderId, user?.uid, refreshKey]);

  const handleClearChat = () => {
    Alert.alert("Clear Chat", "Delete all messages for your view only?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const hiddenRef = collection(db, "Orders", orderId, "HiddenMessages", user.uid, "DeletedItems");
        const msgSnapshot = await getDocs(collection(db, "Orders", orderId, "Messages"));
        const batch = writeBatch(db);
        msgSnapshot.docs.forEach(d => {
          batch.set(doc(hiddenRef, d.id), { hiddenAt: serverTimestamp() });
        });
        await batch.commit();
        setRefreshKey(prev => prev + 1);
      }}
    ]);
  };

  const sendMessage = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;
    setIsSending(true);
    setText('');
    try {
      await addDoc(collection(db, "Orders", orderId, "Messages"), {
        text: trimmedText,
        senderId: user.uid,
        senderName: user?.name || user?.email?.split('@')[0] || 'User',
        senderRole: isAdmin ? 'admin' : 'customer',
        createdAt: serverTimestamp(),
        read: false
      });

      const orderRef = doc(db, "Orders", orderId);
      const updateData = isAdmin 
        ? { hasNewMessageForUser: true }
        : { hasNewMessage: true };
      await setDoc(orderRef, updateData, { merge: true });
    } catch (e) {
      setText(trimmedText);
      Alert.alert("Error", "Failed to send: " + e.message);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const shouldShowDate = (msg, index) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const currDate = msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000) : null;
    const prevDate = prev?.createdAt?.seconds ? new Date(prev.createdAt.seconds * 1000) : null;
    if (!currDate || !prevDate) return false;
    return currDate.toDateString() !== prevDate.toDateString();
  };

  if (!user || !orderId) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={48} color="#DDD" />
        <Text style={{ color: '#999', marginTop: 12 }}>Chat not available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Order Chat</Text>
          <Text style={styles.headerSub}>#{orderId?.slice(-8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color="#CCC" />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Start the conversation about this order</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <>
              {shouldShowDate(item, index) && (
                <View style={styles.dateSep}>
                  <Text style={styles.dateSepText}>{formatDate(item.createdAt)}</Text>
                </View>
              )}
              <View style={[
                styles.msgWrap,
                item.senderId === user.uid ? styles.myMsgWrap : styles.theirMsgWrap
              ]}>
                {item.senderId !== user.uid && (
                  <View style={[styles.senderBadge, isAdmin ? styles.adminBadge : styles.customerBadge]}>
                    <Text style={styles.senderBadgeText}>
                      {item.senderRole === 'admin' ? 'Admin' : 'Customer'}
                    </Text>
                  </View>
                )}
                <View style={[
                  styles.msg,
                  item.senderId === user.uid ? styles.myMsg : styles.theirMsg
                ]}>
                  <Text style={item.senderId === user.uid ? styles.myText : styles.theirText}>
                    {item.text}
                  </Text>
                  <View style={styles.msgFooter}>
                    <Text style={item.senderId === user.uid ? styles.myTime : styles.theirTime}>
                      {formatTime(item.createdAt)}
                    </Text>
                    {item.senderId === user.uid && (
                      <Ionicons 
                        name={item.read ? "checkmark-done" : "checkmark"} 
                        size={14} 
                        color={item.read ? "#81D4FA" : "#90A4AE"} 
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#B0B8B4"
            multiline
            maxLength={500}
            onSubmitEditing={() => { if (text.trim()) sendMessage(); }}
            returnKeyType="send"
            blurOnSubmit
          />
          <TouchableOpacity 
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage} 
            disabled={isSending || !text.trim()}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  clearBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  listContent: { paddingVertical: 16, flexGrow: 1 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: COLORS.border },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  dateSep: { alignItems: 'center', marginVertical: 12 },
  dateSepText: { fontSize: 11, color: COLORS.textSecondary, backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },

  msgWrap: { marginHorizontal: 14, marginBottom: 8, maxWidth: '78%' },
  myMsgWrap: { alignSelf: 'flex-end' },
  theirMsgWrap: { alignSelf: 'flex-start' },

  senderBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  adminBadge: { backgroundColor: '#E3F2FD' },
  customerBadge: { backgroundColor: '#FFF3E0' },
  senderBadgeText: { fontSize: 10, fontWeight: '700', color: '#555' },

  msg: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myMsg: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirMsg: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  myText: { color: '#FFF', fontSize: 15, lineHeight: 20 },
  theirText: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 20 },

  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  myTime: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  theirTime: { fontSize: 10, color: COLORS.textSecondary },

  inputContainer: {
    flexDirection: 'row', padding: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: COLORS.surface, alignItems: 'flex-end',
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 100,
    backgroundColor: COLORS.background, borderRadius: 21,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: COLORS.textPrimary,
    marginRight: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  sendButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: { backgroundColor: '#B0B8B4', shadowOpacity: 0 },
});

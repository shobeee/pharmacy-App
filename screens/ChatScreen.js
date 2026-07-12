import React, { useState, useEffect } from 'react';
import { 
  View, FlatList, TextInput, TouchableOpacity, Text, StyleSheet, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
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

export default function ChatScreen({ route }) {
  const { orderId } = route.params || {};
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Helper to identify Admin
  const isAdmin = user?.role === 'admin' || user?.email === 'shoaib@developer.com';

  // Clear flags when anyone enters the chat
  useEffect(() => {
    const clearNotifications = async () => {
      if (!orderId) return;
      try {
        const orderRef = doc(db, "Orders", orderId);
        // Clear appropriate flag based on who is reading
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
    const messagesRef = collection(db, "Orders", orderId, "Messages");
    const hiddenRef = collection(db, "Orders", orderId, "HiddenMessages", user.uid, "DeletedItems");

    const unsubscribe = onSnapshot(query(messagesRef, orderBy("createdAt", "asc")), async (msgSnapshot) => {
      const hiddenSnapshot = await getDocs(hiddenRef);
      const hiddenIds = hiddenSnapshot.docs.map(d => d.id);
      
      const msgs = msgSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => !hiddenIds.includes(m.id));
        
      setMessages(msgs);

      // Auto-mark as read
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
  }, [orderId, user.uid, refreshKey]);

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
        text: trimmedText, senderId: user.uid, createdAt: serverTimestamp(), read: false
      });
      
      // CRITICAL: Update the cross-platform notification flag
      const orderRef = doc(db, "Orders", orderId);
      const updateData = isAdmin 
        ? { hasNewMessageForUser: true } // Admin talks -> User gets "!"
        : { hasNewMessage: true };       // User talks -> Admin gets "!"
        
      await setDoc(orderRef, updateData, { merge: true });
      
    } catch (e) {
      setText(trimmedText);
      Alert.alert("Error", "Failed to send: " + e.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!user || !orderId) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#999' }}>Chat not available</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Chat</Text>
        <TouchableOpacity onPress={handleClearChat}>
          <Ionicons name="trash-outline" size={24} color="red" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList 
          data={messages}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <View style={[styles.msg, item.senderId === user.uid ? styles.myMsg : styles.theirMsg]}>
              <Text style={item.senderId === user.uid ? styles.myText : styles.theirText}>{item.text}</Text>
              {item.senderId === user.uid && (
                <View style={styles.tickContainer}>
                  <Ionicons name={item.read ? "checkmark-done" : "checkmark"} size={16} color={item.read ? "#81D4FA" : "#D1D1D1"} />
                </View>
              )}
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            value={text} 
            onChangeText={setText} 
            placeholder="Type a message..." 
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={isSending}>
            {isSending ? <ActivityIndicator color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  flex: { flex: 1 },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 18, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EEE',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05 
  },
  title: { fontSize: 20, fontWeight: '700', color: '#333' },
  msg: { 
    paddingHorizontal: 16, paddingVertical: 10, 
    marginVertical: 4, borderRadius: 20, 
    maxWidth: '75%', marginHorizontal: 12,
  },
  myMsg: { 
    alignSelf: 'flex-end', backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4 
  },
  theirMsg: { 
    alignSelf: 'flex-start', backgroundColor: '#E9E9EB', 
    borderBottomLeftRadius: 4 
  },
  myText: { color: '#FFF', fontSize: 16 },
  theirText: { color: '#222', fontSize: 16 },
  tickContainer: { alignSelf: 'flex-end', marginTop: 4, opacity: 0.8 },
  inputContainer: { 
    flexDirection: 'row', padding: 12, backgroundColor: '#FFF', 
    alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0'
  },
  input: { 
    flex: 1, height: 45, backgroundColor: '#F2F2F7', 
    borderRadius: 22, paddingHorizontal: 20, fontSize: 16, marginRight: 10 
  },
  sendButton: { 
    width: 45, height: 45, borderRadius: 22, 
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 
  }
});
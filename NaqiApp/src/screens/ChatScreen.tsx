/**
 * Chat Screen
 *
 * Real-time chat interface for customers to communicate with support.
 * Supports text messages, image attachments, and location sharing.
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import {useChat} from '../contexts/ChatContext';
import {useAuth} from '../contexts/AuthContext';
import {COLORS} from '../constants';
// Uncomment when ready to use
// import {launchImageLibrary} from 'react-native-image-picker';
// import Geolocation from '@react-native-community/geolocation';
// import {uploadChatImage} from '../services/storage';

const ChatScreen: React.FC = () => {
  const {t} = useTranslation();
  const {messages, isConnected, sessionId, sendTextMessage, sendImageMessage, sendLocationMessage} =
    useChat();
  const {user} = useAuth();
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages]);

  const handleSendText = () => {
    if (inputText.trim()) {
      sendTextMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleSendImage = async () => {
    Alert.alert(
      t('chat.imageUpload'),
      t('chat.imageUploadPending'),
    );

    /* Uncomment when dependencies are ready:
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
      });

      if (result.assets && result.assets[0].uri) {
        setUploading(true);
        const imageUrl = await uploadChatImage(
          result.assets[0].uri,
          sessionId || 'temp',
        );
        sendImageMessage(imageUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
    */
  };

  const handleSendLocation = () => {
    Alert.alert(
      t('chat.locationSharing'),
      t('chat.locationSharingPending'),
    );

    /* Uncomment when dependencies are ready:
    Geolocation.getCurrentPosition(
      position => {
        sendLocationMessage({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: 'Current Location',
        });
      },
      error => {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Failed to get location');
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
    */
  };

  const renderMessage = ({item}: {item: any}) => {
    const isMe = item.sender_uid === user?.uid;

    return (
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.theirMessage,
        ]}>
        {!isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}

        {item.message_type === 'text' && (
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            {item.content}
          </Text>
        )}

        {item.message_type === 'image' && (
          <Image source={{uri: item.image_url}} style={styles.messageImage} />
        )}

        {item.message_type === 'location' && (
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            📍 {item.location?.address || t('chat.sharedLocation')}
          </Text>
        )}

        <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('chat.title')}</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: isConnected ? '#4CAF50' : '#F44336'},
              ]}
            />
            <Text style={styles.connectionStatus}>
              {isConnected ? t('chat.connected') : t('chat.disconnected')}
            </Text>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.message_id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isConnected
                  ? t('chat.emptyConnected')
                  : t('chat.emptyDisconnected')}
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={handleSendImage}
            style={styles.iconButton}
            disabled={!isConnected || uploading}>
            <Text style={styles.iconText}>📷</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendLocation}
            style={styles.iconButton}
            disabled={!isConnected}>
            <Text style={styles.iconText}>📍</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={COLORS.gray}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={isConnected && !uploading}
          />

          <TouchableOpacity
            onPress={handleSendText}
            style={[
              styles.sendButton,
              (!isConnected || !inputText.trim() || uploading) &&
                styles.sendButtonDisabled,
            ]}
            disabled={!isConnected || !inputText.trim() || uploading}>
            {uploading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.sendButtonText}>{t('chat.send')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionStatus: {
    fontSize: 12,
    color: COLORS.gray,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.black,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.white,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  messageTime: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  iconText: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    color: COLORS.black,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  sendButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ChatScreen;

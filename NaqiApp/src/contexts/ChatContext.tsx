/**
 * Chat Context
 *
 * Manages chat state and provides methods for real-time messaging.
 */

import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import {useAuth} from './AuthContext';
import socketService from '../services/socketService';

interface Message {
  message_id: string;
  sender_uid: string;
  sender_role: 'user' | 'admin';
  sender_name: string;
  message_type: 'text' | 'image' | 'location';
  content: string;
  image_url?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  created_at: string;
}

interface ChatContextType {
  messages: Message[];
  sessionId: string | null;
  isConnected: boolean;
  sendTextMessage: (content: string) => void;
  sendImageMessage: (imageUrl: string) => void;
  sendLocationMessage: (location: any) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const {user, idToken} = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Setup socket event listeners
  const setupEventListeners = useCallback(() => {
    console.log('[ChatContext] Setting up event listeners');

    // Remove any existing listeners first to prevent duplicates
    socketService.offSessionJoined();
    socketService.offNewMessage();

    // Listen for session joined event
    socketService.onSessionJoined((data: any) => {
      console.log('Session joined:', data);
      setSessionId(data.session_id);
      setIsConnected(true);

      // Load message history if available
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    });

    // Listen for new messages
    socketService.onNewMessage((message: Message) => {
      console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
    });
  }, []);

  // Handle socket reconnection
  const handleReconnect = useCallback(() => {
    console.log('[ChatContext] Socket reconnected, re-joining session');

    // Re-setup event listeners after reconnect
    setupEventListeners();

    // Re-join session
    socketService.joinSession();
  }, [setupEventListeners]);

  const connectToChat = useCallback(async () => {
    if (!user || !idToken) return;

    try {
      console.log('[ChatContext] Connecting to chat...');

      // Connect to Socket.IO server
      socketService.connect(idToken);

      // Setup event listeners for the first time
      setupEventListeners();

      // Listen for reconnection events
      socketService.onReconnect(handleReconnect);

      // Join session as customer
      socketService.joinSession();
    } catch (error) {
      console.error('Error connecting to chat:', error);
      setIsConnected(false);
    }
  }, [user, idToken, setupEventListeners, handleReconnect]);

  const disconnectFromChat = useCallback(() => {
    console.log('[ChatContext] Disconnecting from chat');
    socketService.offSessionJoined();
    socketService.offNewMessage();
    socketService.offReconnect();
    socketService.disconnect();
    setIsConnected(false);
    setSessionId(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (user && idToken) {
      connectToChat();
    } else {
      disconnectFromChat();
    }

    return () => {
      disconnectFromChat();
    };
  }, [user, idToken, connectToChat, disconnectFromChat]);

  const sendTextMessage = (content: string) => {
    if (!isConnected || !sessionId) {
      console.warn('Cannot send message: not connected to chat');
      return;
    }
    socketService.sendMessage(content);
  };

  const sendImageMessage = (imageUrl: string) => {
    if (!isConnected || !sessionId) {
      console.warn('Cannot send image: not connected to chat');
      return;
    }
    socketService.sendImage(imageUrl);
  };

  const sendLocationMessage = (location: any) => {
    if (!isConnected || !sessionId) {
      console.warn('Cannot send location: not connected to chat');
      return;
    }
    socketService.sendLocation(location);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        sessionId,
        isConnected,
        sendTextMessage,
        sendImageMessage,
        sendLocationMessage,
      }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};

'use client';

/**
 * Admin Chat Context
 *
 * Provides persistent socket connection and chat state across all admin pages.
 * Handles notifications, unread counts, and real-time updates.
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

interface ChatSession {
  session_id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  last_message_at: string | null;
  unread_count_admin?: number;
}

interface Message {
  message_id: string;
  sender_uid: string;
  sender_role: string;
  sender_name: string;
  message_type: 'text' | 'image' | 'location';
  content?: string;
  image_url?: string;
  location?: { latitude: number; longitude: number };
  created_at: string;
}

interface AdminChatContextType {
  socket: Socket | null;
  connected: boolean;
  sessions: ChatSession[];
  totalUnread: number;
  joinSession: (sessionId: string) => void;
  sendMessage: (content: string) => void;
  getSessionMessages: (sessionId: string) => Message[];
}

const AdminChatContext = createContext<AdminChatContextType | undefined>(undefined);

export function AdminChatProvider({ children }: { children: React.ReactNode }) {
  const { user, getIdToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          console.error('Failed to play notification sound:', error);
        });
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Show notification
  const showNotification = (title: string, body: string) => {
    // Always show toast
    setToastMessage(`${title}: ${body}`);
    setTimeout(() => setToastMessage(null), 5000);

    // Browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'chat-notification',
      });
    }

    // Play sound
    playNotificationSound();
  };

  // Initialize persistent socket connection
  useEffect(() => {
    if (!user) return;

    const initSocket = async () => {
      const token = await getIdToken();
      if (!token) return;

      const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
      const socketInstance = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => {
        console.log('[AdminChat] Socket connected');
        setConnected(true);
        socketInstance.emit('admin_join');
      });

      socketInstance.on('disconnect', () => {
        console.log('[AdminChat] Socket disconnected');
        setConnected(false);
      });

      // Receive all active sessions
      socketInstance.on('admin_sessions', (data: { sessions: ChatSession[] }) => {
        console.log('[AdminChat] Active sessions:', data.sessions);
        setSessions(data.sessions);
      });

      // Session update notification
      socketInstance.on('session_update', (data: Partial<ChatSession>) => {
        console.log('[AdminChat] Session update:', data);

        // Show notification for new messages
        if (data.unread_count_admin && data.unread_count_admin > 0) {
          showNotification(
            `New message from ${data.customer_name || 'Customer'}`,
            data.customer_email || 'New chat message received'
          );
        }

        setSessions((prev) => {
          const existingSession = prev.find(s => s.session_id === data.session_id);
          if (existingSession) {
            return prev.map((session) =>
              session.session_id === data.session_id
                ? { ...session, ...data }
                : session
            );
          } else {
            return [...prev, data as ChatSession];
          }
        });
      });

      // Joined a specific session
      socketInstance.on('session_joined', (data: { session_id: string; status: string; messages: Message[] }) => {
        console.log('[AdminChat] Joined session:', data.session_id);
        setSessionMessages(prev => ({
          ...prev,
          [data.session_id]: data.messages
        }));
      });

      // New message received
      socketInstance.on('new_message', (message: Message) => {
        console.log('[AdminChat] New message:', message);

        // Add message to session messages
        setSessionMessages(prev => {
          const sessionId = Object.keys(prev).find(id =>
            prev[id].some(m => m.message_id === message.message_id)
          );

          if (!sessionId) return prev;

          return {
            ...prev,
            [sessionId]: [...(prev[sessionId] || []), message]
          };
        });
      });

      socketInstance.on('error', (data: { message: string }) => {
        console.error('[AdminChat] Socket error:', data.message);
      });

      setSocket(socketInstance);

      // Don't disconnect on cleanup - keep connection alive
      return () => {
        // socketInstance.disconnect();
      };
    };

    initSocket();
  }, [user, getIdToken]);

  // Calculate total unread
  const totalUnread = sessions.reduce((sum, session) => sum + (session.unread_count_admin || 0), 0);

  // Join a session
  const joinSession = (sessionId: string) => {
    if (socket) {
      socket.emit('admin_join_session', { session_id: sessionId });
    }
  };

  // Send message
  const sendMessage = (content: string) => {
    if (socket && content.trim()) {
      socket.emit('send_message', { content: content.trim() });
    }
  };

  // Get messages for a session
  const getSessionMessages = (sessionId: string): Message[] => {
    return sessionMessages[sessionId] || [];
  };

  return (
    <AdminChatContext.Provider
      value={{
        socket,
        connected,
        sessions,
        totalUnread,
        joinSession,
        sendMessage,
        getSessionMessages,
      }}
    >
      {/* Global toast notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl z-50 max-w-md animate-slide-in-right">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <p className="font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
      {children}
    </AdminChatContext.Provider>
  );
}

export function useAdminChat() {
  const context = useContext(AdminChatContext);
  if (context === undefined) {
    // Return default values instead of throwing error during SSR
    return {
      socket: null,
      connected: false,
      sessions: [],
      totalUnread: 0,
      joinSession: () => {},
      sendMessage: () => {},
      getSessionMessages: () => [],
    };
  }
  return context;
}

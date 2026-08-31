'use client';

/**
 * Admin Chat Page
 *
 * Real-time chat interface for admins to respond to customer messages.
 * Uses Socket.IO with admin_join and admin_join_session events.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

interface ChatSession {
  session_id: string;
  customer_uid: string;
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

export default function ChatPage() {
  const searchParams = useSearchParams();
  const { user, getIdToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [bellAnimation, setBellAnimation] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSelectedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedSessionRef = useRef<string | null>(null);
  const sessionsLoadedRef = useRef(false); // Track if sessions have been initially loaded

  // Keep ref in sync with state
  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Initialize audio element
  useEffect(() => {
    // Create audio element for notification sound
    // Place your notification.mp3 file in: admin-dashboard/public/sounds/notification.mp3
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.5; // 50% volume
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        // Reset audio to beginning in case it's already playing
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(error => {
          console.error('Failed to play notification sound:', error);
        });
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Show browser notification
  const showNotification = (title: string, body: string) => {
    // Always show toast notification
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

    // Trigger bell animation
    setBellAnimation(true);
    setTimeout(() => setBellAnimation(false), 1000);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update page title with unread count
  useEffect(() => {
    const totalUnread = sessions.reduce((sum, session) => sum + (session.unread_count_admin || 0), 0);

    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Chat - Admin Dashboard`;
    } else {
      document.title = 'Chat - Admin Dashboard';
    }

    return () => {
      document.title = 'Admin Dashboard';
    };
  }, [sessions]);

  // Join a session (memoized to prevent unnecessary re-renders)
  const handleJoinSession = useCallback((sessionId: string) => {
    if (!socket) return;

    setSelectedSession(sessionId);
    setMessages([]);

    // Reset unread count for this session in UI
    setSessions((prev) =>
      prev.map((session) =>
        session.session_id === sessionId
          ? { ...session, unread_count_admin: 0 }
          : session
      )
    );

    socket.emit('admin_join_session', { session_id: sessionId });
  }, [socket]);

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const initSocket = async () => {
      const token = await getIdToken();
      if (!token) return;

      // Socket.IO connects to base URL, not /api endpoint
      const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
      const socketInstance = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
        // Join admin room to see all sessions
        socketInstance.emit('admin_join');
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      // Receive all active sessions
      socketInstance.on('admin_sessions', (data: { sessions: ChatSession[] }) => {
        console.log('Active sessions:', data.sessions);
        setSessions(data.sessions);
        sessionsLoadedRef.current = true; // Mark that sessions have been loaded
      });

      // Session update notification
      socketInstance.on('session_update', (data: Partial<ChatSession>) => {
        console.log('Session update:', data);

        // Show notification for new messages from other sessions
        if (data.unread_count_admin && data.unread_count_admin > 0) {
          // Only notify if not viewing this session or tab is not focused
          if (data.session_id !== selectedSessionRef.current || document.hidden) {
            showNotification(
              `New message from ${data.customer_name || 'Customer'}`,
              data.customer_email || 'New chat message received'
            );
          }
        }

        setSessions((prev) => {
          const existingSession = prev.find(s => s.session_id === data.session_id);
          if (existingSession) {
            // Update existing session
            return prev.map((session) =>
              session.session_id === data.session_id
                ? { ...session, ...data }
                : session
            );
          } else {
            // Add new session to list
            return [...prev, data as ChatSession];
          }
        });
      });

      // Joined a specific session
      socketInstance.on('session_joined', (data: { session_id: string; status: string; messages: Message[] }) => {
        console.log('Joined session:', data);
        setMessages(data.messages);
      });

      // Session created or found (for admin-initiated chats)
      socketInstance.on('session_created_or_found', (data: { session: ChatSession }) => {
        console.log('Session created or found:', data.session);

        // Add session to list if not already there
        setSessions((prev) => {
          const exists = prev.find(s => s.session_id === data.session.session_id);
          if (!exists) {
            return [...prev, data.session];
          }
          return prev;
        });

        // Auto-join the session (use ref to avoid stale closure)
        if (!selectedSessionRef.current) {
          handleJoinSession(data.session.session_id);
          autoSelectedRef.current = true;
        }
      });

      // New message received
      socketInstance.on('new_message', (message: Message) => {
        console.log('New message:', message);

        // Only show notification if message is from customer and tab is not focused
        if (message.sender_role === 'user' && document.hidden) {
          showNotification(
            `${message.sender_name}`,
            message.message_type === 'text' ? message.content || 'New message' :
            message.message_type === 'image' ? 'Sent an image' :
            message.message_type === 'location' ? 'Shared a location' : 'New message'
          );
        }

        setMessages((prev) => [...prev, message]);
      });

      // Error handling
      socketInstance.on('error', (data: { message: string }) => {
        console.error('Socket error:', data.message);
        alert(`Error: ${data.message}`);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    };

    initSocket();
  }, [user, getIdToken]);

  // Auto-select session from URL parameter
  useEffect(() => {
    const userId = searchParams.get('userId');

    // Only proceed if we have userId, socket is connected, and sessions have been loaded
    if (userId && !autoSelectedRef.current && socket && sessionsLoadedRef.current) {
      // Find the session that matches the userId
      const targetSession = sessions.find(session => session.customer_uid === userId);

      if (targetSession && !selectedSession) {
        // Session exists, join it
        console.log(`Found existing session for user ${userId}, joining...`);
        handleJoinSession(targetSession.session_id);
        autoSelectedRef.current = true;
      } else if (!targetSession && !selectedSession) {
        // No session found after sessions loaded - request backend to get or create one
        console.log(`No existing session for user ${userId}, requesting creation...`);
        socket.emit('admin_get_or_create_session', { customer_uid: userId });
        autoSelectedRef.current = true; // Set to prevent repeated requests
      }
    }
  }, [sessions, searchParams, socket, selectedSession, handleJoinSession]);

  // Send message
  const handleSendMessage = () => {
    if (!socket || !messageInput.trim() || !selectedSession) return;

    socket.emit('send_message', {
      content: messageInput.trim(),
    });

    setMessageInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const customerName = searchParams.get('customerName');

  // Calculate total unread messages
  const totalUnread = sessions.reduce((sum, session) => sum + (session.unread_count_admin || 0), 0);

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl z-50 max-w-md animate-slide-in-right">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <p className="font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Chat</h1>
          <p className="text-gray-600">
            Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </p>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <div className={`w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center transition-all ${
            bellAnimation ? 'animate-bounce bg-blue-200 scale-110' : ''
          }`}>
            <span className="text-2xl">🔔</span>
          </div>
          {totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-2 shadow-lg animate-pulse">
              {totalUnread > 99 ? '99+' : totalUnread}
            </div>
          )}
        </div>
      </div>

      {customerName && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Opening chat for:</span> {decodeURIComponent(customerName)}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Select the customer's chat session from the list on the left to start messaging.
          </p>
        </div>
      )}

      <div className="flex gap-6 h-[calc(100%-5rem)]">
        {/* Sessions List */}
        <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Active Sessions</h2>
            <p className="text-sm text-gray-600">{sessions.length} active</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No active sessions
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => handleJoinSession(session.session_id)}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedSession === session.session_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {session.customer_name}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {session.customer_email}
                      </p>
                      {session.last_message_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(session.last_message_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    {(session.unread_count_admin ?? 0) > 0 && (
                      <span className="ml-2 min-w-[20px] h-5 px-1.5 bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                        {session.unread_count_admin}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          {selectedSession ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.message_id}
                    className={`flex ${message.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                        message.sender_role === 'admin'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-xs opacity-75 mb-1">{message.sender_name}</p>
                      {message.message_type === 'text' && <p>{message.content}</p>}
                      {message.message_type === 'image' && (
                        <img src={message.image_url} alt="Shared image" className="rounded max-w-full" />
                      )}
                      {message.message_type === 'location' && message.location && (
                        <a
                          href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline hover:opacity-80 transition-opacity inline-block"
                        >
                          📍 Location: {message.location.latitude.toFixed(6)}, {message.location.longitude.toFixed(6)}
                          <span className="block text-xs mt-1 opacity-75">Click to view on Google Maps</span>
                        </a>
                      )}
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a session to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

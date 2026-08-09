'use client';

/**
 * Admin Chat Page
 *
 * Real-time chat interface for admins to respond to customer messages.
 * Uses Socket.IO with admin_join and admin_join_session events.
 */

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';

interface ChatSession {
  session_id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  last_message_at: string | null;
  has_new_message?: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSelectedRef = useRef(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      });

      // Session update notification
      socketInstance.on('session_update', (data: Partial<ChatSession>) => {
        console.log('Session update:', data);
        setSessions((prev) =>
          prev.map((session) =>
            session.session_id === data.session_id
              ? { ...session, ...data }
              : session
          )
        );
      });

      // Joined a specific session
      socketInstance.on('session_joined', (data: { session_id: string; status: string; messages: Message[] }) => {
        console.log('Joined session:', data);
        setMessages(data.messages);
      });

      // New message received
      socketInstance.on('new_message', (message: Message) => {
        console.log('New message:', message);
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

    if (userId && sessions.length > 0 && !autoSelectedRef.current && socket) {
      // Find session for this user (sessions should have customer_email or we can match by user_id in session data)
      // For now, we'll look for the first session since the backend might need to expose user_id in session data
      // In a production system, you'd match sessions[i].customer_uid === userId or similar

      // Auto-select the first session for demo purposes
      // TODO: Backend should include user_id in ChatSession interface to properly match
      const targetSession = sessions[0];

      if (targetSession && !selectedSession) {
        handleJoinSession(targetSession.session_id);
        autoSelectedRef.current = true;
      }
    }
  }, [sessions, searchParams, socket, selectedSession]);

  // Join a session
  const handleJoinSession = (sessionId: string) => {
    if (!socket) return;

    setSelectedSession(sessionId);
    setMessages([]);
    socket.emit('admin_join_session', { session_id: sessionId });
  };

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

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Chat</h1>
        <p className="text-gray-600">
          Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
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
                    {session.has_new_message && (
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
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
                        <p className="text-sm">
                          📍 Location: {message.location.latitude.toFixed(6)}, {message.location.longitude.toFixed(6)}
                        </p>
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

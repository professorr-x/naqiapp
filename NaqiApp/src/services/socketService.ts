/**
 * Socket.IO Client Service
 *
 * Manages real-time communication with the backend Socket.IO server.
 */

import {io, Socket} from 'socket.io-client';
import Config from 'react-native-config';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  /**
   * Connect to Socket.IO server with Firebase authentication
   */
  connect(firebaseToken: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.token = firebaseToken;

    // Remove /api from base URL for socket connection
    const baseUrl = (Config.API_BASE_URL || 'http://localhost:8000/api').replace('/api', '');

    this.socket = io(baseUrl, {
      path: '/socket.io',
      auth: {
        token: firebaseToken,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ==================== Customer Methods ====================

  /**
   * Join or create a chat session (customer)
   */
  joinSession() {
    this.socket?.emit('join_session', {});
  }

  /**
   * Listen for session joined event
   */
  onSessionJoined(callback: (data: any) => void) {
    this.socket?.on('session_joined', callback);
  }

  /**
   * Remove session joined listener
   */
  offSessionJoined() {
    this.socket?.off('session_joined');
  }

  /**
   * Send a text message
   */
  sendMessage(content: string) {
    this.socket?.emit('send_message', {content});
  }

  /**
   * Send an image message
   */
  sendImage(imageUrl: string) {
    this.socket?.emit('send_image', {image_url: imageUrl});
  }

  /**
   * Send a location message
   */
  sendLocation(location: Location) {
    this.socket?.emit('send_location', {location});
  }

  /**
   * Listen for new messages
   */
  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('new_message', callback);
  }

  /**
   * Remove new message listener
   */
  offNewMessage() {
    this.socket?.off('new_message');
  }

  // ==================== Admin Methods ====================

  /**
   * Join admin room to see all sessions (admin only)
   */
  adminJoin() {
    this.socket?.emit('admin_join', {});
  }

  /**
   * Join a specific customer session (admin only)
   */
  adminJoinSession(sessionId: string) {
    this.socket?.emit('admin_join_session', {session_id: sessionId});
  }

  /**
   * Listen for all admin sessions (admin only)
   */
  onAdminSessions(callback: (data: any) => void) {
    this.socket?.on('admin_sessions', callback);
  }

  /**
   * Listen for session updates (admin only)
   */
  onSessionUpdate(callback: (data: any) => void) {
    this.socket?.on('session_update', callback);
  }

  /**
   * Remove admin sessions listener
   */
  offAdminSessions() {
    this.socket?.off('admin_sessions');
  }

  /**
   * Remove session update listener
   */
  offSessionUpdate() {
    this.socket?.off('session_update');
  }
}

// Export singleton instance
export default new SocketService();

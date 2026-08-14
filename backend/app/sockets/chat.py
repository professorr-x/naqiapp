"""
Socket.IO Chat Server

This module provides real-time chat functionality using Socket.IO.
Supports text messages, image attachments, and location sharing.
"""

import socketio
from firebase_admin import auth
from datetime import datetime
from google.cloud.firestore_v1._helpers import DatetimeWithNanoseconds
from app.database import (
    create_chat_session,
    get_chat_session,
    create_message,
    update_chat_session_last_message,
    get_user_by_firebase_uid,
    get_user_role,
    get_active_session_for_customer,
    get_all_active_sessions,
    assign_admin_to_session,
    get_session_messages
)
from app.services.notifications import send_chat_message_notification


def serialize_firestore_data(data):
    """Convert Firestore data to JSON-serializable format."""
    if isinstance(data, dict):
        return {key: serialize_firestore_data(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_firestore_data(item) for item in data]
    elif isinstance(data, (DatetimeWithNanoseconds, datetime)):
        return data.isoformat()
    else:
        return data


# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',  # Configure properly in production
    logger=True,
    engineio_logger=True
)

# Track connected users: {socket_id: {'uid': str, 'role': str, 'session_id': str}}
connected_users = {}


@sio.event
async def connect(sid, environ, auth_data):
    """Handle client connection."""
    print(f"Client {sid} attempting to connect")

    # Verify Firebase token
    if not auth_data or 'token' not in auth_data:
        print(f"Client {sid} rejected: No token provided")
        return False

    try:
        token = auth_data['token']
        decoded_token = auth.verify_id_token(token)
        firebase_uid = decoded_token['uid']
        role = get_user_role(firebase_uid) or 'user'

        connected_users[sid] = {
            'uid': firebase_uid,
            'role': role,
            'session_id': None
        }

        print(f"Client {sid} connected: {firebase_uid} (role: {role})")
        return True

    except Exception as e:
        print(f"Client {sid} rejected: {str(e)}")
        return False


@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    if sid in connected_users:
        user_info = connected_users[sid]
        print(f"Client {sid} disconnected: {user_info['uid']}")

        # Leave session room if in one
        if user_info['session_id']:
            await sio.leave_room(sid, user_info['session_id'])

        del connected_users[sid]


@sio.event
async def join_session(sid, data):
    """Customer joins/creates their chat session."""
    if sid not in connected_users:
        await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
        return

    user_info = connected_users[sid]

    if user_info['role'] != 'user':
        await sio.emit('error', {'message': 'Only customers can join sessions'}, room=sid)
        return

    # Get or create session for this customer
    customer_uid = user_info['uid']
    user_data = get_user_by_firebase_uid(customer_uid)

    # Check for existing active session
    existing_session = get_active_session_for_customer(customer_uid)

    if existing_session:
        session = existing_session
    else:
        # Create new session
        session = create_chat_session(
            customer_uid=customer_uid,
            customer_name=user_data.get('display_name', 'Customer'),
            customer_email=user_data.get('email', '')
        )

    session_id = session['session_id']

    # Join room
    await sio.enter_room(sid, session_id)
    user_info['session_id'] = session_id

    # Get message history
    messages = get_session_messages(session_id)

    # Send session info and message history
    await sio.emit('session_joined', {
        'session_id': session_id,
        'status': session['status'],
        'messages': serialize_firestore_data(messages)
    }, room=sid)

    # Notify admins of new/active session
    await sio.emit('session_update', {
        'session_id': session_id,
        'customer_name': session['customer_name'],
        'customer_email': session['customer_email'],
        'status': session['status'],
        'last_message_at': session.get('last_message_at').isoformat() if session.get('last_message_at') else None
    }, room='admins')


@sio.event
async def admin_join(sid):
    """Admin joins the admin room to see all sessions."""
    if sid not in connected_users:
        await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
        return

    user_info = connected_users[sid]

    if user_info['role'] != 'admin':
        await sio.emit('error', {'message': 'Admin access required'}, room=sid)
        return

    # Join admin room
    await sio.enter_room(sid, 'admins')

    # Send all active sessions
    active_sessions = get_all_active_sessions()
    serialized_sessions = serialize_firestore_data(active_sessions)
    await sio.emit('admin_sessions', {'sessions': serialized_sessions}, room=sid)


@sio.event
async def admin_join_session(sid, data):
    """Admin joins a specific customer session."""
    if sid not in connected_users:
        await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
        return

    user_info = connected_users[sid]

    if user_info['role'] != 'admin':
        await sio.emit('error', {'message': 'Admin access required'}, room=sid)
        return

    session_id = data.get('session_id')
    if not session_id:
        await sio.emit('error', {'message': 'session_id required'}, room=sid)
        return

    # Verify session exists
    session = get_chat_session(session_id)
    if not session:
        await sio.emit('error', {'message': 'Session not found'}, room=sid)
        return

    # Assign admin to session if not assigned
    if not session.get('assigned_admin_uid'):
        admin_data = get_user_by_firebase_uid(user_info['uid'])
        assign_admin_to_session(
            session_id,
            user_info['uid'],
            admin_data.get('display_name', 'Admin')
        )

    # Join room
    await sio.enter_room(sid, session_id)
    user_info['session_id'] = session_id

    # Get message history
    messages = get_session_messages(session_id)

    await sio.emit('session_joined', {
        'session_id': session_id,
        'status': session['status'],
        'messages': serialize_firestore_data(messages)
    }, room=sid)


@sio.event
async def send_message(sid, data):
    """Send a text message."""
    if sid not in connected_users:
        await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
        return

    user_info = connected_users[sid]
    session_id = user_info.get('session_id')

    if not session_id:
        await sio.emit('error', {'message': 'Not in a session'}, room=sid)
        return

    content = data.get('content', '').strip()
    if not content:
        await sio.emit('error', {'message': 'Message content required'}, room=sid)
        return

    # Get sender info
    sender_data = get_user_by_firebase_uid(user_info['uid'])

    # Use "Leo" as display name for all admin messages
    sender_name = "Leo" if user_info['role'] == 'admin' else sender_data.get('display_name', 'User')

    # Save message to Firestore
    message = create_message(
        session_id=session_id,
        sender_uid=user_info['uid'],
        sender_role=user_info['role'],
        sender_name=sender_name,
        message_type='text',
        content=content
    )

    # Update session last message time
    update_chat_session_last_message(session_id)

    # Broadcast to session room
    await sio.emit('new_message', {
        'message_id': message['message_id'],
        'sender_uid': user_info['uid'],
        'sender_role': user_info['role'],
        'sender_name': sender_name,
        'message_type': 'text',
        'content': content,
        'created_at': message['created_at'].isoformat()
    }, room=session_id)

    # Notify admins if message from customer
    if user_info['role'] == 'user':
        session = get_chat_session(session_id)
        await sio.emit('session_update', {
            'session_id': session_id,
            'customer_name': session.get('customer_name'),
            'has_new_message': True
        }, room='admins')

    # Send push notification if message from admin to customer
    if user_info['role'] == 'admin':
        try:
            # Get session to find customer
            session = get_chat_session(session_id)
            if session and session.get('customer_uid'):
                customer_uid = session['customer_uid']

                # Get customer's Firestore user document
                customer_data = get_user_by_firebase_uid(customer_uid)

                if customer_data and customer_data.get('id'):
                    customer_user_id = customer_data['id']
                    admin_name = sender_data.get('display_name', 'Admin')

                    # Send push notification
                    print(f"[DEBUG] Sending chat notification to customer {customer_user_id} from admin {admin_name}")
                    await send_chat_message_notification(
                        user_id=customer_user_id,
                        sender_name=admin_name,
                        message_preview=content,
                        session_id=session_id
                    )
                else:
                    print(f"[DEBUG] Customer user data not found for firebase_uid: {customer_uid}")
            else:
                print(f"[DEBUG] Session or customer_uid not found for session {session_id}")
        except Exception as e:
            print(f"[ERROR] Failed to send chat notification: {str(e)}")


@sio.event
async def send_image(sid, data):
    """Handle image upload."""
    # Image will be uploaded to Firebase Storage from client
    # Client sends image_url after upload
    if sid not in connected_users:
        return

    user_info = connected_users[sid]
    session_id = user_info.get('session_id')

    if not session_id:
        await sio.emit('error', {'message': 'Not in a session'}, room=sid)
        return

    image_url = data.get('image_url')
    if not image_url:
        await sio.emit('error', {'message': 'image_url required'}, room=sid)
        return

    sender_data = get_user_by_firebase_uid(user_info['uid'])

    # Use "Leo" as display name for all admin messages
    sender_name = "Leo" if user_info['role'] == 'admin' else sender_data.get('display_name', 'User')

    message = create_message(
        session_id=session_id,
        sender_uid=user_info['uid'],
        sender_role=user_info['role'],
        sender_name=sender_name,
        message_type='image',
        content='',
        image_url=image_url
    )

    update_chat_session_last_message(session_id)

    await sio.emit('new_message', {
        'message_id': message['message_id'],
        'sender_uid': user_info['uid'],
        'sender_role': user_info['role'],
        'sender_name': sender_name,
        'message_type': 'image',
        'image_url': image_url,
        'created_at': message['created_at'].isoformat()
    }, room=session_id)

    # Send push notification if message from admin to customer
    if user_info['role'] == 'admin':
        try:
            session = get_chat_session(session_id)
            if session and session.get('customer_uid'):
                customer_uid = session['customer_uid']
                customer_data = get_user_by_firebase_uid(customer_uid)

                if customer_data and customer_data.get('id'):
                    customer_user_id = customer_data['id']
                    admin_name = sender_data.get('display_name', 'Admin')

                    await send_chat_message_notification(
                        user_id=customer_user_id,
                        sender_name=admin_name,
                        message_preview="Sent an image",
                        session_id=session_id
                    )
        except Exception as e:
            print(f"[ERROR] Failed to send chat notification for image: {str(e)}")


@sio.event
async def send_location(sid, data):
    """Share live location."""
    if sid not in connected_users:
        return

    user_info = connected_users[sid]
    session_id = user_info.get('session_id')

    if not session_id:
        await sio.emit('error', {'message': 'Not in a session'}, room=sid)
        return

    location = data.get('location')
    if not location or 'latitude' not in location or 'longitude' not in location:
        await sio.emit('error', {'message': 'Invalid location data'}, room=sid)
        return

    sender_data = get_user_by_firebase_uid(user_info['uid'])

    # Use "Leo" as display name for all admin messages
    sender_name = "Leo" if user_info['role'] == 'admin' else sender_data.get('display_name', 'User')

    message = create_message(
        session_id=session_id,
        sender_uid=user_info['uid'],
        sender_role=user_info['role'],
        sender_name=sender_name,
        message_type='location',
        content='',
        location=location
    )

    update_chat_session_last_message(session_id)

    await sio.emit('new_message', {
        'message_id': message['message_id'],
        'sender_uid': user_info['uid'],
        'sender_role': user_info['role'],
        'sender_name': sender_name,
        'message_type': 'location',
        'location': location,
        'created_at': message['created_at'].isoformat()
    }, room=session_id)

    # Send push notification if message from admin to customer
    if user_info['role'] == 'admin':
        try:
            session = get_chat_session(session_id)
            if session and session.get('customer_uid'):
                customer_uid = session['customer_uid']
                customer_data = get_user_by_firebase_uid(customer_uid)

                if customer_data and customer_data.get('id'):
                    customer_user_id = customer_data['id']
                    admin_name = sender_data.get('display_name', 'Admin')

                    await send_chat_message_notification(
                        user_id=customer_user_id,
                        sender_name=admin_name,
                        message_preview="Shared a location",
                        session_id=session_id
                    )
        except Exception as e:
            print(f"[ERROR] Failed to send chat notification for location: {str(e)}")

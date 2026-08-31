#!/usr/bin/env python3
"""
Migration script to add message_count to existing chat sessions.

This script:
1. Fetches all chat sessions from Firestore
2. Counts the actual messages for each session
3. Updates each session with the correct message_count
4. Sets last_message_at to None if no messages exist
"""

import os
import sys
from google.cloud import firestore

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import get_firestore_db

CHAT_SESSIONS_COLLECTION = 'chat_sessions'
MESSAGES_COLLECTION = 'chat_messages'


def migrate_chat_sessions():
    """Migrate all existing chat sessions to include message_count."""
    db = get_firestore_db()

    # Get all sessions
    sessions_ref = db.collection(CHAT_SESSIONS_COLLECTION)
    sessions = sessions_ref.stream()

    updated_count = 0
    skipped_count = 0

    print("Starting migration...")

    for session_doc in sessions:
        session_id = session_doc.id
        session_data = session_doc.to_dict()

        # Count messages for this session
        messages_ref = db.collection(MESSAGES_COLLECTION)
        message_count = len(list(messages_ref.where('session_id', '==', session_id).stream()))

        # Get the latest message timestamp
        last_message = None
        if message_count > 0:
            latest_messages = messages_ref.where('session_id', '==', session_id)\
                .order_by('created_at', direction=firestore.Query.DESCENDING)\
                .limit(1).stream()

            for msg in latest_messages:
                msg_data = msg.to_dict()
                last_message = msg_data.get('created_at')
                break

        # Update session
        update_data = {
            'message_count': message_count,
        }

        # Only update last_message_at if we have messages
        if message_count > 0 and last_message:
            update_data['last_message_at'] = last_message
        elif message_count == 0:
            update_data['last_message_at'] = None

        session_doc.reference.update(update_data)

        updated_count += 1
        print(f"✓ Updated session {session_id}: {message_count} messages")

    print(f"\nMigration complete!")
    print(f"Updated: {updated_count} sessions")


if __name__ == '__main__':
    try:
        migrate_chat_sessions()
    except Exception as e:
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

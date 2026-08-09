"""
Script to promote an existing user to admin role.
Run with: python -m scripts.create_first_admin <email>
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Initialize Firebase before importing database
from app.firebase_admin import initialize_firebase, get_user_by_email as firebase_get_user_by_email
initialize_firebase()

from app.database import get_user_by_email, update_user_role


def promote_to_admin(email: str):
    """Promote a user to admin role by email."""
    # Look up user in Firebase
    firebase_user = firebase_get_user_by_email(email)

    if not firebase_user:
        print(f"✗ Error: No Firebase user found with email '{email}'")
        print("  Please make sure the user has registered in the app first.")
        return False

    firebase_uid = firebase_user['uid']

    # Check if user exists in Firestore
    firestore_user = get_user_by_email(email)

    if not firestore_user:
        print(f"✗ Error: User '{email}' exists in Firebase but not in Firestore.")
        print("  The user may need to complete registration first.")
        return False

    # Update role to admin
    success = update_user_role(firebase_uid, 'admin')

    if success:
        print(f"\n✓ Success!")
        print(f"  User '{email}' has been promoted to admin.")
        print(f"  Firebase UID: {firebase_uid}")
        return True
    else:
        print(f"✗ Error: Failed to update user role.")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.create_first_admin <email>")
        print("\nExample:")
        print("  python -m scripts.create_first_admin admin@example.com")
        sys.exit(1)

    email = sys.argv[1]

    print(f"Promoting user to admin role...")
    print(f"Email: {email}\n")

    try:
        success = promote_to_admin(email)

        if not success:
            sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        sys.exit(1)

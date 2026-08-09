"""
One-time migration script to add 'role' field to all existing users.
Run with: python -m scripts.migrate_user_roles
"""

import sys
import os

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Initialize Firebase before importing database
from app.firebase_admin import initialize_firebase
initialize_firebase()

from app.database import migrate_existing_users_to_default_role


if __name__ == "__main__":
    print("Starting user role migration...")
    print("This will add 'role' field (default: 'user') to all existing users.\n")

    try:
        count = migrate_existing_users_to_default_role()
        print(f"\n✓ Migration complete!")
        print(f"  Updated {count} users to 'user' role.")

        if count == 0:
            print("  All users already have roles assigned.")
    except Exception as e:
        print(f"\n✗ Migration failed: {str(e)}")
        sys.exit(1)

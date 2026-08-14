"""
Notification Service

Handles push notifications via Firebase Cloud Messaging (FCM)
"""

from typing import Dict, Any, List
from app.firebase_admin import send_fcm_multicast
from app.database import get_user_device_tokens, deactivate_device_token, get_user_by_id
import logging

logger = logging.getLogger(__name__)


# Notification templates for different order statuses
NOTIFICATION_TEMPLATES = {
    "en": {
        "confirmed": {
            "title": "Order Confirmed!",
            "body": "Your order #{order_id_short} has been confirmed. Delivery on {delivery_date} {time_window}."
        },
        "dispatched": {
            "title": "Order Dispatched!",
            "body": "Your order #{order_id_short} is on the way. Expected {time_window}."
        },
        "delivered": {
            "title": "Order Delivered!",
            "body": "Your order #{order_id_short} has been delivered. Enjoy your fresh water!"
        },
        "cancelled": {
            "title": "Order Cancelled",
            "body": "Your order #{order_id_short} has been cancelled."
        }
    },
    "ar": {
        "confirmed": {
            "title": "تم تأكيد الطلب!",
            "body": "تم تأكيد طلبك #{order_id_short}. التوصيل في {delivery_date} {time_window}."
        },
        "dispatched": {
            "title": "تم إرسال الطلب!",
            "body": "طلبك #{order_id_short} في الطريق. متوقع {time_window}."
        },
        "delivered": {
            "title": "تم تسليم الطلب!",
            "body": "تم تسليم طلبك #{order_id_short}. استمتع بمياهك النقية!"
        },
        "cancelled": {
            "title": "تم إلغاء الطلب",
            "body": "تم إلغاء طلبك #{order_id_short}."
        }
    }
}


def get_order_notification_template(
    status: str,
    order_id: str,
    order_data: Dict[str, Any],
    language: str = 'en'
) -> Dict[str, Any]:
    """
    Generate notification template for order status update

    Args:
        status: Order status (confirmed, dispatched, delivered, cancelled)
        order_id: Full order ID
        order_data: Order document data
        language: Preferred language ('en' or 'ar'), defaults to 'en'

    Returns:
        dict: Contains 'title', 'body', and 'data' for the notification
    """
    # Get language templates, fall back to English if language not found
    lang_templates = NOTIFICATION_TEMPLATES.get(language, NOTIFICATION_TEMPLATES.get('en'))
    template = lang_templates.get(status)

    if not template:
        return None

    # Create short order ID (last 6 characters)
    order_id_short = order_id[-6:].upper()

    # Format delivery date and time
    delivery_date = order_data.get('delivery_date', '')
    time_window = order_data.get('delivery_time_window', 'during the day')

    # Replace placeholders in template
    title = template['title']
    body = template['body'].format(
        order_id_short=order_id_short,
        delivery_date=delivery_date,
        time_window=time_window
    )

    # Data payload for deep linking
    data = {
        "type": "order_status_update",
        "order_id": order_id,
        "status": status,
        "deep_link": f"/orders/{order_id}"
    }

    return {
        "title": title,
        "body": body,
        "data": data
    }


async def send_order_status_notification(
    user_id: str,
    order_id: str,
    status: str,
    order_data: Dict[str, Any]
) -> bool:
    """
    Send push notification for order status update

    Args:
        user_id: Firestore user document ID
        order_id: Order document ID
        status: New order status
        order_data: Order document data

    Returns:
        bool: True if notification sent successfully, False otherwise
    """
    try:
        print(f"[DEBUG] send_order_status_notification called - user_id: {user_id}, order_id: {order_id}, status: {status}")

        # Get user's active device tokens
        device_tokens = get_user_device_tokens(user_id)
        print(f"[DEBUG] Retrieved {len(device_tokens) if device_tokens else 0} device tokens for user {user_id}")

        if not device_tokens:
            logger.info(f"No active device tokens for user {user_id}")
            print(f"[DEBUG] No active device tokens for user {user_id}")
            return False

        # Get user's language preference
        user = get_user_by_id(user_id)
        language = user.get('preferred_language', 'en') if user else 'en'
        print(f"[DEBUG] User language preference: {language}")

        # Generate notification content
        notification = get_order_notification_template(status, order_id, order_data, language)

        if not notification:
            logger.warning(f"No notification template for status: {status}")
            print(f"[DEBUG] No notification template for status: {status}")
            return False

        # Send FCM notification
        logger.info(f"Sending notification to user {user_id} for order {order_id} (status: {status})")
        print(f"[DEBUG] Sending notification to user {user_id} for order {order_id} (status: {status})")

        response = send_fcm_multicast(
            tokens=device_tokens,
            title=notification['title'],
            body=notification['body'],
            data=notification['data']
        )

        # Log results
        logger.info(f"Notification sent: {response.success_count} success, {response.failure_count} failed")
        print(f"[DEBUG] FCM Response: {response.success_count} success, {response.failure_count} failed")

        # Log individual token results
        for idx, resp in enumerate(response.responses):
            token_preview = device_tokens[idx][:20] + "..." if len(device_tokens[idx]) > 20 else device_tokens[idx]
            if resp.success:
                print(f"[DEBUG] ✓ Token {idx+1}/{len(device_tokens)} ({token_preview}): SUCCESS")
            else:
                print(f"[DEBUG] ✗ Token {idx+1}/{len(device_tokens)} ({token_preview}): FAILED - {resp.exception if hasattr(resp, 'exception') else 'Unknown error'}")

        # Cleanup failed tokens
        if response.failure_count > 0:
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    failed_token = device_tokens[idx]
                    logger.warning(f"Deactivating failed token: {failed_token}")
                    deactivate_device_token(failed_token)

        return response.success_count > 0

    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}")
        return False


async def send_chat_message_notification(
    user_id: str,
    sender_name: str,
    message_preview: str,
    session_id: str
) -> bool:
    """
    Send push notification for new chat message

    Args:
        user_id: Firestore user document ID (recipient)
        sender_name: Name of the message sender (e.g., "Admin", "Support")
        message_preview: Preview of the message content (truncated)
        session_id: Chat session ID for deep linking

    Returns:
        bool: True if notification sent successfully, False otherwise
    """
    try:
        print(f"[DEBUG] send_chat_message_notification called - user_id: {user_id}, sender: {sender_name}")

        # Get user's active device tokens
        device_tokens = get_user_device_tokens(user_id)
        print(f"[DEBUG] Retrieved {len(device_tokens) if device_tokens else 0} device tokens for user {user_id}")

        if not device_tokens:
            logger.info(f"No active device tokens for user {user_id}")
            print(f"[DEBUG] No active device tokens for user {user_id}")
            return False

        # Get user's language preference
        user = get_user_by_id(user_id)
        language = user.get('preferred_language', 'en') if user else 'en'
        print(f"[DEBUG] User language preference: {language}")

        # Truncate message preview if too long
        max_preview_length = 100
        if len(message_preview) > max_preview_length:
            message_preview = message_preview[:max_preview_length] + "..."

        # Create notification payload with localized title
        # Always show "Leo" as the sender name instead of admin name
        if language == 'ar':
            title = "رسالة جديدة من ليو"
        else:
            title = "New message from Leo"
        body = message_preview

        # Data payload for deep linking
        data = {
            "type": "chat_message",
            "session_id": session_id,
            "deep_link": "/chat"
        }

        # Send FCM notification
        logger.info(f"Sending chat notification to user {user_id} from {sender_name}")
        print(f"[DEBUG] Sending chat notification to user {user_id}")

        response = send_fcm_multicast(
            tokens=device_tokens,
            title=title,
            body=body,
            data=data
        )

        # Log results
        logger.info(f"Chat notification sent: {response.success_count} success, {response.failure_count} failed")
        print(f"[DEBUG] FCM Response: {response.success_count} success, {response.failure_count} failed")

        # Log individual token results
        for idx, resp in enumerate(response.responses):
            token_preview = device_tokens[idx][:20] + "..." if len(device_tokens[idx]) > 20 else device_tokens[idx]
            if resp.success:
                print(f"[DEBUG] ✓ Token {idx+1}/{len(device_tokens)} ({token_preview}): SUCCESS")
            else:
                print(f"[DEBUG] ✗ Token {idx+1}/{len(device_tokens)} ({token_preview}): FAILED - {resp.exception if hasattr(resp, 'exception') else 'Unknown error'}")

        # Cleanup failed tokens
        if response.failure_count > 0:
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    failed_token = device_tokens[idx]
                    logger.warning(f"Deactivating failed token: {failed_token}")
                    deactivate_device_token(failed_token)

        return response.success_count > 0

    except Exception as e:
        logger.error(f"Failed to send chat notification: {str(e)}")
        print(f"[DEBUG] Exception in send_chat_message_notification: {str(e)}")
        return False

"""
Notification Service

Handles push notifications via Firebase Cloud Messaging (FCM)
"""

from typing import Dict, Any, List
from app.firebase_admin import send_fcm_multicast
from app.database import get_user_device_tokens, deactivate_device_token
import logging

logger = logging.getLogger(__name__)


# Notification templates for different order statuses
NOTIFICATION_TEMPLATES = {
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
}


def get_order_notification_template(
    status: str,
    order_id: str,
    order_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate notification template for order status update

    Args:
        status: Order status (confirmed, dispatched, delivered, cancelled)
        order_id: Full order ID
        order_data: Order document data

    Returns:
        dict: Contains 'title', 'body', and 'data' for the notification
    """
    template = NOTIFICATION_TEMPLATES.get(status)

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
        # Get user's active device tokens
        device_tokens = get_user_device_tokens(user_id)

        if not device_tokens:
            logger.info(f"No active device tokens for user {user_id}")
            return False

        # Generate notification content
        notification = get_order_notification_template(status, order_id, order_data)

        if not notification:
            logger.warning(f"No notification template for status: {status}")
            return False

        # Send FCM notification
        logger.info(f"Sending notification to user {user_id} for order {order_id} (status: {status})")

        response = send_fcm_multicast(
            tokens=device_tokens,
            title=notification['title'],
            body=notification['body'],
            data=notification['data']
        )

        # Log results
        logger.info(f"Notification sent: {response.success_count} success, {response.failure_count} failed")

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

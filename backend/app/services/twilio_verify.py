"""
Twilio Verify Service for OTP verification
Uses Twilio Verify API (better than manual SMS)
"""
import os
import logging
from typing import Dict, Optional
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

logger = logging.getLogger(__name__)


class TwilioVerifyService:
    """Service for handling OTP via Twilio Verify API"""

    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.verify_sid = os.getenv('TWILIO_VERIFY_SID')
        self.enabled = os.getenv('TWILIO_VERIFY_ENABLED', 'false').lower() == 'true'

        if self.enabled:
            if not all([self.account_sid, self.auth_token, self.verify_sid]):
                logger.error("Twilio Verify is enabled but credentials are missing")
                self.enabled = False
            else:
                self.client = Client(self.account_sid, self.auth_token)
                logger.info(f"Twilio Verify Service initialized with SID: {self.verify_sid}")
        else:
            logger.info("Twilio Verify Service is disabled")

    def send_verification(
        self,
        phone_number: str,
        channel: str = 'sms',
        locale: str = 'en'
    ) -> Dict[str, any]:
        """
        Send OTP verification code via Twilio Verify

        Args:
            phone_number: Phone number in E.164 format (e.g., +9647801234567)
            channel: Delivery channel ('sms' or 'call')
            locale: Language locale ('en' or 'ar')

        Returns:
            dict: Result with 'success', 'sid', 'status', and 'error' fields
        """
        if not self.enabled:
            raise ValueError("Twilio Verify service is not enabled")

        try:
            logger.info(f"Sending verification to {phone_number} via {channel}")

            verification = self.client.verify.v2.services(self.verify_sid) \
                .verifications \
                .create(to=phone_number, channel=channel, locale=locale)

            logger.info(f"Verification sent successfully. SID: {verification.sid}, Status: {verification.status}")

            return {
                'success': True,
                'sid': verification.sid,
                'status': verification.status,
                'to': verification.to,
                'channel': verification.channel,
                'error': None
            }

        except TwilioRestException as e:
            logger.error(f"Twilio Verify send failed: {e.code} - {e.msg}")
            return {
                'success': False,
                'sid': None,
                'status': 'failed',
                'error': f"Failed to send verification: {e.msg}"
            }
        except Exception as e:
            logger.error(f"Unexpected error sending verification: {str(e)}")
            return {
                'success': False,
                'sid': None,
                'status': 'failed',
                'error': f"Failed to send verification: {str(e)}"
            }

    def check_verification(
        self,
        phone_number: str,
        code: str
    ) -> Dict[str, any]:
        """
        Verify OTP code via Twilio Verify

        Args:
            phone_number: Phone number in E.164 format
            code: OTP code entered by user

        Returns:
            dict: Result with 'success', 'status', and 'error' fields
        """
        if not self.enabled:
            raise ValueError("Twilio Verify service is not enabled")

        try:
            logger.info(f"Checking verification for {phone_number}")

            verification_check = self.client.verify.v2.services(self.verify_sid) \
                .verification_checks \
                .create(to=phone_number, code=code)

            logger.info(f"Verification check result: {verification_check.status}")

            is_approved = verification_check.status == 'approved'

            return {
                'success': is_approved,
                'status': verification_check.status,
                'valid': is_approved,
                'error': None if is_approved else 'Invalid verification code'
            }

        except TwilioRestException as e:
            logger.error(f"Twilio Verify check failed: {e.code} - {e.msg}")
            return {
                'success': False,
                'status': 'failed',
                'valid': False,
                'error': f"Verification failed: {e.msg}"
            }
        except Exception as e:
            logger.error(f"Unexpected error checking verification: {str(e)}")
            return {
                'success': False,
                'status': 'failed',
                'valid': False,
                'error': f"Verification failed: {str(e)}"
            }

    @staticmethod
    def is_restricted_country(phone_number: str) -> bool:
        """
        Check if phone number is from a Firebase-restricted country

        Args:
            phone_number: Phone number in E.164 format

        Returns:
            bool: True if country is restricted for Firebase SMS
        """
        # Countries where Firebase SMS has issues (error code 39)
        restricted_codes = [
            '+964',  # Iraq
            # Add more as needed
        ]

        for code in restricted_codes:
            if phone_number.startswith(code):
                return True

        return False

    def should_use_verify(self, phone_number: str) -> bool:
        """
        Determine if Twilio Verify should be used for this phone number

        Args:
            phone_number: Phone number in E.164 format

        Returns:
            bool: True if Twilio Verify should be used
        """
        if not self.enabled:
            return False

        return self.is_restricted_country(phone_number)


# Global instance
twilio_verify_service = TwilioVerifyService()


def send_verification_code(
    phone_number: str,
    channel: str = 'sms',
    locale: str = 'en'
) -> Dict[str, any]:
    """Send verification code via Twilio Verify"""
    return twilio_verify_service.send_verification(phone_number, channel, locale)


def verify_code(phone_number: str, code: str) -> Dict[str, any]:
    """Verify code via Twilio Verify"""
    return twilio_verify_service.check_verification(phone_number, code)


def should_use_twilio(phone_number: str) -> bool:
    """Check if Twilio Verify should be used for this number"""
    return twilio_verify_service.should_use_verify(phone_number)

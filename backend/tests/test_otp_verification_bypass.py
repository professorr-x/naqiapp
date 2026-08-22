"""
Tests for OTP verification endpoints with App Store reviewer bypass

These tests verify:
1. Reviewer phone + correct code → approved
2. Reviewer phone + wrong code → rejected, Twilio not called
3. Non-reviewer phone → normal Twilio path still runs
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

# Test client
client = TestClient(app)

# Test constants
REVIEWER_PHONE = os.getenv('REVIEWER_PHONE_NUMBER', '+15551234567')
REVIEWER_CODE = os.getenv('REVIEWER_OTP_CODE', '424242')
NORMAL_PHONE = '+9647801234567'
NORMAL_CODE = '123456'


class TestOTPVerificationBypass:
    """Tests for OTP verification bypass functionality"""

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567', 'REVIEWER_OTP_CODE': '424242'})
    @patch('app.services.twilio_verify.twilio_verify_service')
    def test_send_bypass_reviewer_phone(self, mock_twilio):
        """Test /verify/send with reviewer phone - should bypass Twilio"""
        mock_twilio.enabled = True

        response = client.post(
            '/api/auth/verify/send',
            params={'phone_number': REVIEWER_PHONE, 'locale': 'en'}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['message'] == 'Verification code sent'
        assert data['channel'] == 'sms'
        assert '***' in data['phone_masked']

        # Verify Twilio was NOT called
        mock_twilio.send_verification.assert_not_called()

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567', 'REVIEWER_OTP_CODE': '424242'})
    @patch('app.services.twilio_verify.twilio_verify_service')
    def test_send_normal_phone_uses_twilio(self, mock_twilio):
        """Test /verify/send with normal phone - should use Twilio"""
        mock_twilio.enabled = True
        mock_twilio.should_use_verify.return_value = True
        mock_twilio.send_verification.return_value = {
            'success': True,
            'sid': 'VE123456',
            'status': 'pending',
            'channel': 'sms',
            'error': None
        }

        response = client.post(
            '/api/auth/verify/send',
            params={'phone_number': NORMAL_PHONE, 'locale': 'en'}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True

        # Verify Twilio WAS called
        mock_twilio.send_verification.assert_called_once_with(NORMAL_PHONE, 'sms', 'en')

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567', 'REVIEWER_OTP_CODE': '424242'})
    @patch('app.firebase_admin.get_user_by_phone_number')
    @patch('app.firebase_admin.create_user_with_phone_and_password')
    @patch('app.database.get_user_by_phone_number')
    @patch('app.database.create_user')
    @patch('app.services.twilio_verify.twilio_verify_service')
    def test_check_bypass_correct_code(
        self,
        mock_twilio,
        mock_db_create_user,
        mock_db_get_user,
        mock_fb_create_user,
        mock_fb_get_user
    ):
        """Test /verify/check with reviewer phone + correct code - should approve without Twilio"""
        mock_twilio.enabled = True

        # Mock Firebase user doesn't exist initially
        mock_fb_get_user.return_value = None
        mock_fb_create_user.return_value = {
            'uid': 'reviewer-uid-123',
            'phone_number': REVIEWER_PHONE,
            'email': '15551234567@naqi.app',
            'display_name': 'App Store Reviewer'
        }

        # Mock Firestore user doesn't exist initially
        mock_db_get_user.return_value = None
        mock_db_create_user.return_value = {
            'id': 'firestore-reviewer-id',
            'firebase_uid': 'reviewer-uid-123',
            'phone_number': REVIEWER_PHONE,
            'display_name': 'App Store Reviewer'
        }

        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': REVIEWER_PHONE, 'code': REVIEWER_CODE}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['message'] == 'Phone number verified'
        assert data['status'] == 'approved'

        # Verify user was created
        mock_fb_create_user.assert_called_once()
        mock_db_create_user.assert_called_once()

        # Verify Twilio was NOT called
        mock_twilio.check_verification.assert_not_called()

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567', 'REVIEWER_OTP_CODE': '424242'})
    @patch('app.services.twilio_verify.twilio_verify_service')
    def test_check_bypass_wrong_code(self, mock_twilio):
        """Test /verify/check with reviewer phone + wrong code - should reject without calling Twilio"""
        mock_twilio.enabled = True

        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': REVIEWER_PHONE, 'code': '999999'}  # Wrong code
        )

        assert response.status_code == 400
        data = response.json()
        assert data['detail'] == 'Invalid verification code'

        # Verify Twilio was NOT called
        mock_twilio.check_verification.assert_not_called()

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567', 'REVIEWER_OTP_CODE': '424242'})
    @patch('app.firebase_admin.get_user_by_phone_number')
    @patch('app.database.get_user_by_phone_number')
    @patch('app.services.twilio_verify.twilio_verify_service')
    def test_check_bypass_existing_user(
        self,
        mock_twilio,
        mock_db_get_user,
        mock_fb_get_user
    ):
        """Test /verify/check with reviewer phone when user already exists"""
        mock_twilio.enabled = True

        # Mock existing Firebase user
        mock_fb_get_user.return_value = {
            'uid': 'existing-reviewer-uid',
            'phone_number': REVIEWER_PHONE,
            'email': '15551234567@naqi.app',
            'display_name': 'App Store Reviewer'
        }

        # Mock existing Firestore user
        mock_db_get_user.return_value = {
            'id': 'existing-firestore-id',
            'firebase_uid': 'existing-reviewer-uid',
            'phone_number': REVIEWER_PHONE,
            'display_name': 'App Store Reviewer'
        }

        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': REVIEWER_PHONE, 'code': REVIEWER_CODE}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['status'] == 'approved'

        # Verify Twilio was NOT called
        mock_twilio.check_verification.assert_not_called()

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567', 'REVIEWER_OTP_CODE': '424242'})
    @patch('app.services.twilio_verify.twilio_verify_service')
    def test_check_normal_phone_uses_twilio(self, mock_twilio):
        """Test /verify/check with normal phone - should use Twilio"""
        mock_twilio.enabled = True
        mock_twilio.check_verification.return_value = {
            'success': True,
            'status': 'approved',
            'valid': True,
            'error': None
        }

        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': NORMAL_PHONE, 'code': NORMAL_CODE}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['status'] == 'approved'

        # Verify Twilio WAS called
        mock_twilio.check_verification.assert_called_once_with(NORMAL_PHONE, NORMAL_CODE)

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567', 'REVIEWER_OTP_CODE': '424242'})
    @patch('app.services.twilio_verify.twilio_verify_service')
    def test_check_normal_phone_twilio_rejects(self, mock_twilio):
        """Test /verify/check with normal phone and invalid Twilio code"""
        mock_twilio.enabled = True
        mock_twilio.check_verification.return_value = {
            'success': False,
            'status': 'failed',
            'valid': False,
            'error': 'Invalid verification code'
        }

        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': NORMAL_PHONE, 'code': '000000'}  # Wrong code
        )

        assert response.status_code == 400
        data = response.json()
        assert 'Invalid verification code' in data['detail']

        # Verify Twilio WAS called
        mock_twilio.check_verification.assert_called_once()

    @patch.dict(os.environ, {'REVIEWER_PHONE_NUMBER': '+15551234567'})
    def test_bypass_without_leading_plus(self):
        """Test bypass works with phone number formatted without leading +"""
        # The endpoint normalizes phone numbers, so this should still trigger bypass
        response = client.post(
            '/api/auth/verify/send',
            params={'phone_number': '15551234567', 'locale': 'en'}  # No leading +
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['message'] == 'Verification code sent'

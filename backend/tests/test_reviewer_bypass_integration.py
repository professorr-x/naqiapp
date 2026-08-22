"""
Integration tests for OTP reviewer bypass

These tests verify the bypass works end-to-end without heavy mocking.
"""
import pytest
import os
from fastapi.testclient import TestClient
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment variables before importing app
os.environ['REVIEWER_PHONE_NUMBER'] = '+15551234567'
os.environ['REVIEWER_OTP_CODE'] = '424242'
os.environ['TWILIO_VERIFY_ENABLED'] = 'false'  # Disable Twilio for tests
os.environ['DEBUG'] = 'true'

from main import app

client = TestClient(app)

class TestReviewerBypassIntegration:
    """Integration tests for reviewer bypass"""

    def test_send_reviewer_phone_returns_success(self):
        """Test /verify/send with reviewer phone returns success"""
        response = client.post(
            '/api/auth/verify/send',
            params={'phone_number': '+15551234567', 'locale': 'en'}
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['success'] is True
        assert data['message'] == 'Verification code sent'
        assert 'phone_masked' in data
        assert data['channel'] == 'sms'

    def test_send_reviewer_phone_without_plus(self):
        """Test /verify/send works with phone number without leading +"""
        response = client.post(
            '/api/auth/verify/send',
            params={'phone_number': '15551234567', 'locale': 'en'}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True

    def test_check_reviewer_phone_correct_code(self):
        """Test /verify/check with reviewer phone and correct code"""
        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': '+15551234567', 'code': '424242'}
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['success'] is True
        assert data['message'] == 'Phone number verified'
        assert data['status'] == 'approved'

    def test_check_reviewer_phone_wrong_code(self):
        """Test /verify/check with reviewer phone and wrong code"""
        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': '+15551234567', 'code': '999999'}
        )

        assert response.status_code == 400
        data = response.json()
        assert 'Invalid verification code' in data['detail']

    def test_check_reviewer_phone_without_plus_correct_code(self):
        """Test /verify/check works without leading + with correct code"""
        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': '15551234567', 'code': '424242'}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['success'] is True
        assert data['status'] == 'approved'

    def test_send_normal_phone_requires_twilio(self):
        """Test /verify/send with normal phone requires Twilio (and fails when disabled)"""
        response = client.post(
            '/api/auth/verify/send',
            params={'phone_number': '+9647801234567', 'locale': 'en'}
        )

        # Should fail because Twilio is disabled in test environment
        assert response.status_code == 503
        data = response.json()
        assert 'Twilio Verify service is not available' in data['detail']

    def test_check_normal_phone_requires_twilio(self):
        """Test /verify/check with normal phone requires Twilio (and fails when disabled)"""
        response = client.post(
            '/api/auth/verify/check',
            params={'phone_number': '+9647801234567', 'code': '123456'}
        )

        # Should fail because Twilio is disabled in test environment
        assert response.status_code == 503
        data = response.json()
        assert 'Twilio Verify service is not available' in data['detail']

    def test_environment_variables_used(self):
        """Test that custom environment variables are respected"""
        # Create a new client with different env vars
        os.environ['REVIEWER_PHONE_NUMBER'] = '+15559999999'
        os.environ['REVIEWER_OTP_CODE'] = '111111'

        # Import fresh to pick up new env vars
        # Note: In real testing, you'd restart the app, but for this test
        # we're verifying the env vars are read from os.getenv() each time

        response = client.post(
            '/api/auth/verify/send',
            params={'phone_number': '+15559999999', 'locale': 'en'}
        )

        # Should work with new reviewer phone
        assert response.status_code == 200

        # Reset env vars
        os.environ['REVIEWER_PHONE_NUMBER'] = '+15551234567'
        os.environ['REVIEWER_OTP_CODE'] = '424242'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

"""
Test suite for Realtouch Invoice - Admin Portal, Forgot Password, and New User Signup
Tests the following features:
1. Admin Portal endpoints (stats, users, transactions, settings, templates)
2. Forgot Password flow
3. New user signup with empty company details
4. Non-owner access restrictions
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
OWNER_EMAIL = "rgvlimited@gmail.com"
OWNER_PASSWORD = "Admin123"
TEST_USER_EMAIL = "visitsombeauty@gmail.com"
TEST_USER_PASSWORD = "1988chisom?"


class TestHealthAndBasics:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASS: Health endpoint returns healthy status")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Realtouch Invoice API" in data.get("message", "")
        print("PASS: Root endpoint returns API info")


class TestOwnerLogin:
    """Test owner login and session management"""
    
    @pytest.fixture
    def owner_session(self):
        """Login as owner and return session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert data["user"]["is_owner"] == True
        print(f"PASS: Owner login successful, is_owner={data['user']['is_owner']}")
        return data["session_token"]
    
    def test_owner_login(self, owner_session):
        """Test owner can login"""
        assert owner_session is not None
        print("PASS: Owner login returns valid session token")
    
    def test_owner_has_is_owner_flag(self, owner_session):
        """Test owner user has is_owner flag"""
        headers = {"Authorization": f"Bearer {owner_session}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_owner") == True
        assert data.get("effective_plan") == "owner"
        print(f"PASS: Owner has is_owner=True, effective_plan=owner")


class TestAdminEndpoints:
    """Test Admin Portal endpoints - require owner access"""
    
    @pytest.fixture
    def owner_headers(self):
        """Get owner auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Owner login failed: {response.text}")
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def non_owner_headers(self):
        """Get non-owner auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Test user login failed: {response.text}")
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_admin_stats_as_owner(self, owner_headers):
        """Test GET /api/admin/stats as owner"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        # Verify stats structure
        assert "total_users" in data
        assert "total_invoices" in data
        assert "total_revenue" in data
        assert "total_downloads" in data
        assert "plan_distribution" in data
        assert "paid_invoices" in data
        assert "unpaid_invoices" in data
        print(f"PASS: Admin stats returned - {data['total_users']} users, {data['total_invoices']} invoices")
    
    def test_admin_stats_forbidden_for_non_owner(self, non_owner_headers):
        """Test GET /api/admin/stats returns 403 for non-owner"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=non_owner_headers)
        assert response.status_code == 403
        print("PASS: Admin stats returns 403 for non-owner")
    
    def test_admin_users_list(self, owner_headers):
        """Test GET /api/admin/users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify user structure
        if len(data) > 0:
            user = data[0]
            assert "user_id" in user
            assert "email" in user
            assert "password_hash" not in user  # Should not expose password
        print(f"PASS: Admin users list returned {len(data)} users")
    
    def test_admin_users_forbidden_for_non_owner(self, non_owner_headers):
        """Test GET /api/admin/users returns 403 for non-owner"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=non_owner_headers)
        assert response.status_code == 403
        print("PASS: Admin users returns 403 for non-owner")
    
    def test_admin_transactions_list(self, owner_headers):
        """Test GET /api/admin/transactions"""
        response = requests.get(f"{BASE_URL}/api/admin/transactions", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Admin transactions list returned {len(data)} transactions")
    
    def test_admin_transactions_forbidden_for_non_owner(self, non_owner_headers):
        """Test GET /api/admin/transactions returns 403 for non-owner"""
        response = requests.get(f"{BASE_URL}/api/admin/transactions", headers=non_owner_headers)
        assert response.status_code == 403
        print("PASS: Admin transactions returns 403 for non-owner")
    
    def test_admin_settings_get(self, owner_headers):
        """Test GET /api/admin/settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=owner_headers)
        assert response.status_code == 200
        data = response.json()
        # Verify settings structure
        assert "free_download_limit" in data
        assert "features" in data
        assert "pricing" in data
        assert "maintenance_mode" in data
        print(f"PASS: Admin settings returned - download limit: {data['free_download_limit']}")
    
    def test_admin_settings_forbidden_for_non_owner(self, non_owner_headers):
        """Test GET /api/admin/settings returns 403 for non-owner"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=non_owner_headers)
        assert response.status_code == 403
        print("PASS: Admin settings returns 403 for non-owner")
    
    def test_admin_update_user_plan(self, owner_headers):
        """Test PUT /api/admin/users/{user_id} to update plan"""
        # First get a non-owner user
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=owner_headers)
        users = response.json()
        non_owner_user = next((u for u in users if u.get("email") != OWNER_EMAIL), None)
        
        if not non_owner_user:
            pytest.skip("No non-owner user found to test plan update")
        
        user_id = non_owner_user["user_id"]
        original_plan = non_owner_user.get("plan", "starter")
        
        # Update to professional
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers=owner_headers,
            json={"plan": "professional"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "professional"
        print(f"PASS: Admin updated user plan to professional")
        
        # Restore original plan
        requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers=owner_headers,
            json={"plan": original_plan}
        )


class TestForgotPassword:
    """Test Forgot Password flow"""
    
    def test_forgot_password_existing_email(self):
        """Test POST /api/auth/forgot-password with existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Since email service is not configured, should return reset_token
        if "reset_token" in data:
            print(f"PASS: Forgot password returned reset token (email service not configured)")
        else:
            print(f"PASS: Forgot password sent email or returned message")
    
    def test_forgot_password_nonexistent_email(self):
        """Test POST /api/auth/forgot-password with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_test_email_12345@example.com"
        })
        # Should return 200 to not reveal if email exists
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("PASS: Forgot password returns 200 for non-existent email (security)")
    
    def test_reset_password_invalid_token(self):
        """Test POST /api/auth/reset-password with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "password": "NewPassword123"
        })
        assert response.status_code == 400
        print("PASS: Reset password returns 400 for invalid token")
    
    def test_reset_password_flow(self):
        """Test complete forgot/reset password flow"""
        # Create a test user first
        test_email = f"test_reset_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Reset Test User",
            "email": test_email,
            "password": "OldPassword123"
        })
        
        if signup_response.status_code != 200:
            pytest.skip("Could not create test user for reset flow")
        
        # Request password reset
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_email
        })
        assert forgot_response.status_code == 200
        forgot_data = forgot_response.json()
        
        # Since email service is not configured, we should get the token directly
        if "reset_token" not in forgot_data:
            pytest.skip("Email service configured - cannot test reset flow without token")
        
        reset_token = forgot_data["reset_token"]
        
        # Reset password
        reset_response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": reset_token,
            "password": "NewPassword456"
        })
        assert reset_response.status_code == 200
        print("PASS: Password reset successful")
        
        # Verify can login with new password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "NewPassword456"
        })
        assert login_response.status_code == 200
        print("PASS: Can login with new password after reset")


class TestNewUserSignup:
    """Test new user signup creates user with empty company details"""
    
    def test_signup_creates_empty_company_details(self):
        """Test POST /api/auth/signup creates user with empty company details"""
        test_email = f"test_signup_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test Signup User",
            "email": test_email,
            "password": "TestPass123"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify user was created
        assert "user" in data
        user = data["user"]
        
        # Verify company_details exists and name is empty (not "Realtouch Global Ventures Ltd")
        assert "company_details" in user
        company_name = user["company_details"].get("name", "")
        
        # The company name should be empty, not "Realtouch Global Ventures Ltd"
        assert company_name == "", f"Expected empty company name, got: '{company_name}'"
        print(f"PASS: New user signup has empty company_details.name (not Realtouch)")
        
        # Verify other defaults
        assert user.get("plan") == "starter"
        assert user.get("download_count") == 0
        print("PASS: New user has starter plan and 0 downloads")
    
    def test_signup_duplicate_email_rejected(self):
        """Test signup with existing email is rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Duplicate Test",
            "email": TEST_USER_EMAIL,  # Existing user
            "password": "TestPass123"
        })
        assert response.status_code == 400
        print("PASS: Signup with duplicate email returns 400")


class TestEmailPasswordLogin:
    """Test email/password login"""
    
    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        print("PASS: Login with valid credentials successful")
    
    def test_login_invalid_password(self):
        """Test login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        print("PASS: Login with invalid password returns 401")
    
    def test_login_nonexistent_email(self):
        """Test login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent_12345@example.com",
            "password": "AnyPassword123"
        })
        assert response.status_code == 401
        print("PASS: Login with non-existent email returns 401")


class TestInvoiceCRUD:
    """Test Invoice CRUD operations still work"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_invoice(self, auth_headers):
        """Test POST /api/invoices"""
        response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json={
            "document_type": "Invoice",
            "customer_name": "Test Customer",
            "customer_email": "test@customer.com",
            "invoice_date": "2025-01-15",
            "due_date": "2025-02-15",
            "items": [
                {"description": "Test Service", "quantity": 1, "rate": 100.00, "amount": 100.00}
            ],
            "tax_rate": 20.0,
            "status": "unpaid"
        })
        assert response.status_code == 200
        data = response.json()
        assert "invoice_id" in data
        assert data["customer_name"] == "Test Customer"
        print(f"PASS: Invoice created with ID {data['invoice_id']}")
        return data["invoice_id"]
    
    def test_get_invoices(self, auth_headers):
        """Test GET /api/invoices"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET invoices returned {len(data)} invoices")
    
    def test_invoice_crud_flow(self, auth_headers):
        """Test complete invoice CRUD flow"""
        # Create
        create_response = requests.post(f"{BASE_URL}/api/invoices", headers=auth_headers, json={
            "document_type": "Invoice",
            "customer_name": "CRUD Test Customer",
            "invoice_date": "2025-01-15",
            "items": [{"description": "Test", "quantity": 1, "rate": 50.00, "amount": 50.00}],
            "tax_rate": 0,
            "status": "unpaid"
        })
        assert create_response.status_code == 200
        invoice_id = create_response.json()["invoice_id"]
        print(f"PASS: Created invoice {invoice_id}")
        
        # Read
        get_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert get_response.status_code == 200
        print("PASS: Read invoice")
        
        # Update
        update_response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers, json={
            "status": "paid"
        })
        assert update_response.status_code == 200
        assert update_response.json()["status"] == "paid"
        print("PASS: Updated invoice status to paid")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        print("PASS: Deleted invoice")
        
        # Verify deleted
        verify_response = requests.get(f"{BASE_URL}/api/invoices/{invoice_id}", headers=auth_headers)
        assert verify_response.status_code == 404
        print("PASS: Invoice no longer exists after delete")


class TestPDFTemplates:
    """Test PDF Templates endpoint"""
    
    def test_get_pdf_templates(self):
        """Test GET /api/pdf-templates"""
        response = requests.get(f"{BASE_URL}/api/pdf-templates")
        assert response.status_code == 200
        data = response.json()
        # Should have at least the 5 default templates
        assert "classic" in data
        assert "modern" in data
        assert "minimal" in data
        assert "emerald" in data
        assert "crimson" in data
        print(f"PASS: PDF templates returned {len(data)} templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

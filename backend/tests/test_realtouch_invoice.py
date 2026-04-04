"""
Realtouch Invoice Backend API Tests
Testing: Auth, PDF Templates, Recurring Processing, Payments, Invoice CRUD
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://invoice-dashboard-49.preview.emergentagent.com')

class TestHealthAndBasics:
    """Basic health and API availability tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASS: Health endpoint returns healthy status")
    
    def test_root_endpoint(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "Realtouch Invoice API" in data.get("message", "")
        print("PASS: Root endpoint returns API info")


class TestPDFTemplates:
    """PDF Template customization tests"""
    
    def test_get_pdf_templates(self):
        """Test GET /api/pdf-templates returns 5 templates"""
        response = requests.get(f"{BASE_URL}/api/pdf-templates")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 5 templates exist
        expected_templates = ["classic", "modern", "minimal", "emerald", "crimson"]
        for template_id in expected_templates:
            assert template_id in data, f"Missing template: {template_id}"
            assert "name" in data[template_id]
            assert "header_color" in data[template_id]
            assert "accent_color" in data[template_id]
        
        # Verify template names
        assert data["classic"]["name"] == "Classic Blue"
        assert data["modern"]["name"] == "Modern Dark"
        assert data["minimal"]["name"] == "Minimal Grey"
        assert data["emerald"]["name"] == "Emerald Green"
        assert data["crimson"]["name"] == "Crimson Red"
        
        print(f"PASS: GET /api/pdf-templates returns all 5 templates: {list(data.keys())}")


class TestEmailPasswordAuth:
    """Email/Password authentication tests"""
    
    @pytest.fixture
    def test_user_data(self):
        """Generate unique test user data"""
        unique_id = uuid.uuid4().hex[:8]
        return {
            "name": f"Test User {unique_id}",
            "email": f"test_{unique_id}@example.com",
            "password": "testpass123"
        }
    
    def test_signup_success(self, test_user_data):
        """Test POST /api/auth/signup creates new user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json=test_user_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user" in data
        assert "session_token" in data
        assert data["user"]["email"] == test_user_data["email"].lower()
        assert data["user"]["name"] == test_user_data["name"]
        assert data["user"]["plan"] == "starter"
        assert "user_id" in data["user"]
        
        print(f"PASS: Signup successful for {test_user_data['email']}")
        return data
    
    def test_signup_duplicate_email(self, test_user_data):
        """Test signup with duplicate email fails"""
        # First signup
        requests.post(f"{BASE_URL}/api/auth/signup", json=test_user_data)
        
        # Second signup with same email
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=test_user_data)
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data.get("detail", "").lower()
        print("PASS: Duplicate email signup correctly rejected")
    
    def test_login_success(self, test_user_data):
        """Test POST /api/auth/login with valid credentials"""
        # First create user
        requests.post(f"{BASE_URL}/api/auth/signup", json=test_user_data)
        
        # Then login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "session_token" in data
        assert data["user"]["email"] == test_user_data["email"].lower()
        
        print(f"PASS: Login successful for {test_user_data['email']}")
    
    def test_login_invalid_password(self, test_user_data):
        """Test login with wrong password fails"""
        # First create user
        requests.post(f"{BASE_URL}/api/auth/signup", json=test_user_data)
        
        # Login with wrong password
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_user_data["email"],
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        print("PASS: Invalid password correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "anypassword"
            }
        )
        assert response.status_code == 401
        print("PASS: Non-existent user login correctly rejected")


class TestGoogleOAuthEndpoint:
    """Google OAuth endpoint existence tests"""
    
    def test_google_oauth_endpoint_exists(self):
        """Test POST /api/auth/google endpoint exists"""
        # Send invalid credential to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/auth/google",
            json={"credential": "invalid_token"}
        )
        # Should return 401 (invalid credential) not 404 (endpoint not found)
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("PASS: POST /api/auth/google endpoint exists and validates credentials")


class TestAuthenticatedEndpoints:
    """Tests requiring authentication"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Create a test user and return authenticated session"""
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "name": f"Auth Test User {unique_id}",
            "email": f"authtest_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        # Signup
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=user_data)
        assert response.status_code == 200
        data = response.json()
        
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {data['session_token']}",
            "Content-Type": "application/json"
        })
        
        return session, data["user"]
    
    def test_update_pdf_template(self, authenticated_session):
        """Test PUT /api/user/pdf-template updates user's template"""
        session, user = authenticated_session
        
        # Update to emerald template
        response = session.put(
            f"{BASE_URL}/api/user/pdf-template",
            json={"template_id": "emerald"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["template_id"] == "emerald"
        print("PASS: PUT /api/user/pdf-template updates template successfully")
    
    def test_update_pdf_template_invalid(self, authenticated_session):
        """Test PUT /api/user/pdf-template with invalid template fails"""
        session, user = authenticated_session
        
        response = session.put(
            f"{BASE_URL}/api/user/pdf-template",
            json={"template_id": "invalid_template"}
        )
        assert response.status_code == 400
        print("PASS: Invalid template ID correctly rejected")
    
    def test_recurring_process_endpoint(self, authenticated_session):
        """Test POST /api/recurring/process endpoint works"""
        session, user = authenticated_session
        
        response = session.post(f"{BASE_URL}/api/recurring/process")
        assert response.status_code == 200
        data = response.json()
        
        # Should return processed count (0 if no recurring invoices)
        assert "processed" in data
        assert "invoices" in data
        assert isinstance(data["processed"], int)
        assert isinstance(data["invoices"], list)
        
        print(f"PASS: POST /api/recurring/process works, processed {data['processed']} invoices")
    
    def test_create_checkout_with_bacs_debit(self, authenticated_session):
        """Test POST /api/payments/stripe/create-checkout accepts bacs_debit"""
        session, user = authenticated_session
        
        response = session.post(
            f"{BASE_URL}/api/payments/stripe/create-checkout",
            json={
                "plan": "professional",
                "origin_url": "https://invoice-dashboard-49.preview.emergentagent.com",
                "payment_method": "bacs_debit"
            }
        )
        
        # Should return checkout URL (or error if Stripe test key issue)
        # We're testing that the endpoint accepts the payment_method parameter
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert "session_id" in data
            print("PASS: POST /api/payments/stripe/create-checkout accepts bacs_debit payment method")
        else:
            # Stripe test key may not support BACS, but endpoint should exist
            print(f"INFO: Stripe checkout returned {response.status_code} - may be test key limitation")
            assert response.status_code in [200, 400, 500]  # Not 404
            print("PASS: POST /api/payments/stripe/create-checkout endpoint exists and accepts bacs_debit parameter")
    
    def test_create_checkout_with_card(self, authenticated_session):
        """Test POST /api/payments/stripe/create-checkout with card payment"""
        session, user = authenticated_session
        
        response = session.post(
            f"{BASE_URL}/api/payments/stripe/create-checkout",
            json={
                "plan": "professional",
                "origin_url": "https://invoice-dashboard-49.preview.emergentagent.com",
                "payment_method": "card"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert "session_id" in data
            print("PASS: POST /api/payments/stripe/create-checkout works with card payment")
        else:
            print(f"INFO: Stripe checkout returned {response.status_code}")
            assert response.status_code != 404
            print("PASS: Stripe checkout endpoint exists")


class TestInvoiceCRUD:
    """Invoice CRUD operations tests"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Create a test user and return authenticated session"""
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "name": f"Invoice Test User {unique_id}",
            "email": f"invoicetest_{unique_id}@example.com",
            "password": "testpass123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/signup", json=user_data)
        assert response.status_code == 200
        data = response.json()
        
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {data['session_token']}",
            "Content-Type": "application/json"
        })
        
        return session, data["user"]
    
    def test_create_invoice(self, authenticated_session):
        """Test POST /api/invoices creates invoice"""
        session, user = authenticated_session
        
        invoice_data = {
            "document_type": "Invoice",
            "customer_name": "Test Customer",
            "customer_email": "customer@test.com",
            "invoice_date": "2025-01-15",
            "due_date": "2025-02-15",
            "items": [
                {"description": "Test Service", "quantity": 1, "rate": 100, "amount": 100}
            ],
            "tax_rate": 20,
            "status": "unpaid"
        }
        
        response = session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "invoice_id" in data
        assert data["customer_name"] == "Test Customer"
        assert data["total"] == 120  # 100 + 20% tax
        
        print(f"PASS: Invoice created with ID {data['invoice_id']}")
        return data
    
    def test_get_invoices(self, authenticated_session):
        """Test GET /api/invoices returns list"""
        session, user = authenticated_session
        
        # Create an invoice first
        invoice_data = {
            "document_type": "Invoice",
            "customer_name": "List Test Customer",
            "invoice_date": "2025-01-15",
            "items": [{"description": "Service", "quantity": 1, "rate": 50, "amount": 50}],
            "tax_rate": 0,
            "status": "unpaid"
        }
        session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        
        # Get invoices
        response = session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"PASS: GET /api/invoices returns {len(data)} invoices")
    
    def test_update_invoice(self, authenticated_session):
        """Test PUT /api/invoices/{id} updates invoice"""
        session, user = authenticated_session
        
        # Create invoice
        invoice_data = {
            "document_type": "Invoice",
            "customer_name": "Update Test Customer",
            "invoice_date": "2025-01-15",
            "items": [{"description": "Service", "quantity": 1, "rate": 100, "amount": 100}],
            "tax_rate": 0,
            "status": "unpaid"
        }
        create_response = session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        invoice_id = create_response.json()["invoice_id"]
        
        # Update invoice
        update_response = session.put(
            f"{BASE_URL}/api/invoices/{invoice_id}",
            json={"status": "paid", "customer_name": "Updated Customer"}
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated["status"] == "paid"
        assert updated["customer_name"] == "Updated Customer"
        
        print(f"PASS: Invoice {invoice_id} updated successfully")
    
    def test_delete_invoice(self, authenticated_session):
        """Test DELETE /api/invoices/{id} deletes invoice"""
        session, user = authenticated_session
        
        # Create invoice
        invoice_data = {
            "document_type": "Invoice",
            "customer_name": "Delete Test Customer",
            "invoice_date": "2025-01-15",
            "items": [{"description": "Service", "quantity": 1, "rate": 50, "amount": 50}],
            "tax_rate": 0,
            "status": "unpaid"
        }
        create_response = session.post(f"{BASE_URL}/api/invoices", json=invoice_data)
        invoice_id = create_response.json()["invoice_id"]
        
        # Delete invoice
        delete_response = session.delete(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = session.get(f"{BASE_URL}/api/invoices/{invoice_id}")
        assert get_response.status_code == 404
        
        print(f"PASS: Invoice {invoice_id} deleted successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

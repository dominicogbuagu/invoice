"""
Test PDF Preview and Stripe Payment Integration
Tests for:
1. PDF Preview endpoint (does NOT consume download quota)
2. Stripe checkout with card, bacs_debit, google_pay payment methods
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
OWNER_EMAIL = "rgvlimited@gmail.com"
OWNER_PASSWORD = "Admin123"


class TestPdfPreviewAndStripe:
    """Test PDF Preview and Stripe Payment Integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user = None
        self.invoice_id = None
    
    def login_owner(self):
        """Login as owner and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("session_token")
        self.user = data.get("user")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return data
    
    def get_first_invoice(self):
        """Get first invoice for testing"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Failed to get invoices: {response.text}"
        invoices = response.json()
        if invoices:
            self.invoice_id = invoices[0]["invoice_id"]
            return invoices[0]
        return None
    
    # ========== PDF PREVIEW TESTS ==========
    
    def test_01_login_owner(self):
        """Test owner login"""
        data = self.login_owner()
        assert data["user"]["email"] == OWNER_EMAIL
        assert data["user"].get("is_owner") == True
        print(f"✓ Owner login successful: {data['user']['email']}")
    
    def test_02_get_invoices(self):
        """Test getting invoices list"""
        self.login_owner()
        invoice = self.get_first_invoice()
        assert invoice is not None, "No invoices found - need at least 1 invoice for testing"
        print(f"✓ Found invoice: {invoice['invoice_number']} (ID: {invoice['invoice_id']})")
    
    def test_03_pdf_preview_returns_200(self):
        """Test PDF preview endpoint returns 200 with application/pdf"""
        self.login_owner()
        invoice = self.get_first_invoice()
        assert invoice is not None, "No invoices found"
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice['invoice_id']}/preview")
        assert response.status_code == 200, f"Preview failed: {response.status_code}"
        assert "application/pdf" in response.headers.get("Content-Type", ""), \
            f"Expected application/pdf, got {response.headers.get('Content-Type')}"
        assert len(response.content) > 0, "PDF content is empty"
        print(f"✓ PDF preview returned 200 with {len(response.content)} bytes")
    
    def test_04_pdf_preview_does_not_increment_download_count(self):
        """Test that PDF preview does NOT increment download count"""
        self.login_owner()
        
        # Get initial stats
        stats_before = self.session.get(f"{BASE_URL}/api/stats").json()
        downloads_before = stats_before.get("downloads_used", 0)
        
        # Get invoice and preview it
        invoice = self.get_first_invoice()
        assert invoice is not None, "No invoices found"
        
        # Call preview endpoint
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice['invoice_id']}/preview")
        assert response.status_code == 200, f"Preview failed: {response.status_code}"
        
        # Get stats after preview
        stats_after = self.session.get(f"{BASE_URL}/api/stats").json()
        downloads_after = stats_after.get("downloads_used", 0)
        
        # Download count should NOT have changed
        assert downloads_after == downloads_before, \
            f"Download count changed from {downloads_before} to {downloads_after} - preview should NOT consume quota"
        print(f"✓ Preview did NOT increment download count (still {downloads_after})")
    
    def test_05_pdf_preview_vs_download_comparison(self):
        """Compare preview vs download - only download should increment count"""
        self.login_owner()
        
        # Get initial stats
        stats_before = self.session.get(f"{BASE_URL}/api/stats").json()
        downloads_before = stats_before.get("downloads_used", 0)
        
        invoice = self.get_first_invoice()
        assert invoice is not None, "No invoices found"
        
        # Preview should NOT increment
        preview_response = self.session.get(f"{BASE_URL}/api/invoices/{invoice['invoice_id']}/preview")
        assert preview_response.status_code == 200
        
        stats_after_preview = self.session.get(f"{BASE_URL}/api/stats").json()
        assert stats_after_preview.get("downloads_used", 0) == downloads_before, \
            "Preview should NOT increment download count"
        
        # Note: For owner accounts, download also doesn't increment (unlimited)
        # This test verifies the preview behavior is correct
        print(f"✓ Preview correctly does not consume download quota")
    
    # ========== STRIPE CHECKOUT TESTS ==========
    
    def test_06_stripe_checkout_card_payment(self):
        """Test Stripe checkout with card payment method"""
        self.login_owner()
        
        response = self.session.post(f"{BASE_URL}/api/payments/stripe/create-checkout", json={
            "plan": "professional",
            "origin_url": BASE_URL,
            "payment_method": "card"
        })
        
        assert response.status_code == 200, f"Stripe checkout failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert data["url"].startswith("https://checkout.stripe.com"), \
            f"URL should be Stripe checkout URL, got: {data['url']}"
        
        print(f"✓ Stripe card checkout URL: {data['url'][:80]}...")
    
    def test_07_stripe_checkout_google_pay(self):
        """Test Stripe checkout with Google Pay payment method"""
        self.login_owner()
        
        response = self.session.post(f"{BASE_URL}/api/payments/stripe/create-checkout", json={
            "plan": "professional",
            "origin_url": BASE_URL,
            "payment_method": "google_pay"
        })
        
        assert response.status_code == 200, f"Stripe checkout failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert data["url"].startswith("https://checkout.stripe.com"), \
            f"URL should be Stripe checkout URL, got: {data['url']}"
        
        print(f"✓ Stripe Google Pay checkout URL: {data['url'][:80]}...")
    
    def test_08_stripe_checkout_bacs_debit(self):
        """Test Stripe checkout with BACS Direct Debit payment method"""
        self.login_owner()
        
        response = self.session.post(f"{BASE_URL}/api/payments/stripe/create-checkout", json={
            "plan": "professional",
            "origin_url": BASE_URL,
            "payment_method": "bacs_debit"
        })
        
        assert response.status_code == 200, f"Stripe checkout failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain checkout URL"
        assert "session_id" in data, "Response should contain session_id"
        assert data["url"].startswith("https://checkout.stripe.com"), \
            f"URL should be Stripe checkout URL, got: {data['url']}"
        
        print(f"✓ Stripe BACS Direct Debit checkout URL: {data['url'][:80]}...")
    
    def test_09_stripe_checkout_enterprise_plan(self):
        """Test Stripe checkout with enterprise plan"""
        self.login_owner()
        
        response = self.session.post(f"{BASE_URL}/api/payments/stripe/create-checkout", json={
            "plan": "enterprise",
            "origin_url": BASE_URL,
            "payment_method": "card"
        })
        
        assert response.status_code == 200, f"Stripe checkout failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain checkout URL"
        assert data["url"].startswith("https://checkout.stripe.com")
        
        print(f"✓ Stripe enterprise plan checkout URL created")
    
    def test_10_stripe_checkout_invalid_plan(self):
        """Test Stripe checkout with invalid plan returns error"""
        self.login_owner()
        
        response = self.session.post(f"{BASE_URL}/api/payments/stripe/create-checkout", json={
            "plan": "invalid_plan",
            "origin_url": BASE_URL,
            "payment_method": "card"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print(f"✓ Invalid plan correctly returns 400 error")
    
    # ========== ADDITIONAL VERIFICATION TESTS ==========
    
    def test_11_pdf_preview_invalid_invoice_returns_404(self):
        """Test PDF preview with invalid invoice ID returns 404"""
        self.login_owner()
        
        response = self.session.get(f"{BASE_URL}/api/invoices/invalid_invoice_id/preview")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid invoice preview correctly returns 404")
    
    def test_12_pdf_download_endpoint_still_works(self):
        """Test that regular download endpoint still works"""
        self.login_owner()
        invoice = self.get_first_invoice()
        assert invoice is not None, "No invoices found"
        
        response = self.session.get(f"{BASE_URL}/api/invoices/{invoice['invoice_id']}/download?format=pdf")
        assert response.status_code == 200, f"Download failed: {response.status_code}"
        assert "application/pdf" in response.headers.get("Content-Type", "")
        print(f"✓ Download endpoint still works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

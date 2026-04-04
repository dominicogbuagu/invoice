from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch, cm
from reportlab.pdfgen import canvas
import json
import base64
import asyncio
import resend
import hashlib
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'realtouch_invoice_jwt_secret_key')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
OWNER_EMAIL = os.environ.get('OWNER_EMAIL', '')  # Product owner email - gets unlimited access
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        salt, hashed = stored_hash.split('$')
        return hashlib.sha256((password + salt).encode()).hexdigest() == hashed
    except:
        return False

def is_owner(user: dict) -> bool:
    """Check if user is the product owner (unlimited access)"""
    if not OWNER_EMAIL:
        return False
    return user.get('email', '').lower() == OWNER_EMAIL.lower() or user.get('role') == 'owner'

def get_effective_plan(user: dict) -> str:
    """Get effective plan - owners always have enterprise access"""
    if is_owner(user):
        return 'owner'  # Owner plan = unlimited everything
    return user.get('plan', 'starter')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========== MODELS ==========

class CompanyDetails(BaseModel):
    name: str = "Realtouch Global Ventures Ltd"
    trading_name: Optional[str] = None
    registration_number: str = "16578193"
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    tagline: Optional[str] = None

class UserCreate(BaseModel):
    name: str
    email: str
    picture: Optional[str] = None

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    name: str
    email: str
    picture: Optional[str] = None
    plan: str = "starter"
    company_details: Optional[CompanyDetails] = None
    company_logo: Optional[str] = None  # Base64 encoded logo
    download_count: int = 0
    email_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceItem(BaseModel):
    description: str
    quantity: float
    rate: float
    amount: float

class RecurringConfig(BaseModel):
    enabled: bool = False
    frequency: str = "monthly"  # weekly, monthly, quarterly, yearly
    next_date: Optional[str] = None
    end_date: Optional[str] = None

class InvoiceCreate(BaseModel):
    document_type: str = "Invoice"
    customer_name: str
    customer_address: Optional[str] = None
    customer_email: Optional[str] = None
    invoice_date: str
    due_date: Optional[str] = None
    items: List[InvoiceItem]
    tax_rate: float = 0.0
    notes: Optional[str] = None
    status: str = "unpaid"
    terms_conditions: Optional[str] = None
    # From section (company details override)
    from_company_name: Optional[str] = None
    from_trading_name: Optional[str] = None
    from_registration_number: Optional[str] = None
    from_address: Optional[str] = None
    from_email: Optional[str] = None
    from_phone: Optional[str] = None
    from_tagline: Optional[str] = None
    # Recurring
    recurring: Optional[RecurringConfig] = None

class InvoiceUpdate(BaseModel):
    document_type: Optional[str] = None
    customer_name: Optional[str] = None
    customer_address: Optional[str] = None
    customer_email: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    tax_rate: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    terms_conditions: Optional[str] = None
    from_company_name: Optional[str] = None
    from_trading_name: Optional[str] = None
    from_registration_number: Optional[str] = None
    from_address: Optional[str] = None
    from_email: Optional[str] = None
    from_phone: Optional[str] = None
    from_tagline: Optional[str] = None
    recurring: Optional[RecurringConfig] = None

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str
    user_id: str
    invoice_number: str
    document_type: str
    customer_name: str
    customer_address: Optional[str] = None
    customer_email: Optional[str] = None
    invoice_date: str
    due_date: Optional[str] = None
    items: List[InvoiceItem]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    status: str
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    from_company_name: Optional[str] = None
    from_trading_name: Optional[str] = None
    from_registration_number: Optional[str] = None
    from_address: Optional[str] = None
    from_email: Optional[str] = None
    from_phone: Optional[str] = None
    from_tagline: Optional[str] = None
    recurring: Optional[RecurringConfig] = None
    created_at: datetime
    updated_at: datetime

class CustomerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    customer_id: str
    user_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

class SubscriptionPaymentRequest(BaseModel):
    plan: str
    origin_url: str
    payment_method: str = "card"  # card, bacs_debit, google_pay

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    company_details: Optional[CompanyDetails] = None
    company_logo: Optional[str] = None

class EmailInvoiceRequest(BaseModel):
    invoice_id: str
    recipient_email: EmailStr
    subject: Optional[str] = None
    message: Optional[str] = None

# ========== AUTHENTICATION ==========

async def get_current_user(request: Request) -> dict:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user_doc

# ========== EMAIL FUNCTIONS ==========

async def send_email(to_email: str, subject: str, html_content: str, attachments: list = None):
    """Send email using Resend API"""
    if not RESEND_API_KEY or RESEND_API_KEY == 're_demo_key':
        logger.warning("Resend API key not configured - email not sent")
        return {"status": "skipped", "message": "Email service not configured"}
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        if attachments:
            params["attachments"] = attachments
        
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}")
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return {"status": "error", "message": str(e)}

async def send_verification_email(user_email: str, user_name: str):
    """Send verification email to new user"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 40px; text-align: center; border-radius: 12px 12px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 28px; }}
            .content {{ background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            .welcome {{ font-size: 24px; color: #0f172a; margin-bottom: 20px; }}
            .message {{ color: #475569; line-height: 1.6; }}
            .button {{ display: inline-block; background: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; padding: 20px; color: #94a3b8; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Realtouch Invoice!</h1>
            </div>
            <div class="content">
                <p class="welcome">Hi {user_name},</p>
                <p class="message">
                    Thank you for signing up for Realtouch Invoice! Your account has been successfully created.
                </p>
                <p class="message">
                    You can now start creating professional invoices, managing customers, and streamlining your business finances.
                </p>
                <p class="message">
                    <strong>Your free plan includes:</strong><br>
                    • 5 downloads total<br>
                    • All document types<br>
                    • Customer management<br>
                    • PDF exports
                </p>
                <p class="message">
                    Need more? Upgrade to Professional for unlimited downloads and payment integration!
                </p>
            </div>
            <div class="footer">
                <p>Realtouch Global Ventures Ltd | Company No. 16578193</p>
                <p>© 2025 All rights reserved</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(user_email, "Welcome to Realtouch Invoice! 🎉", html_content)

async def send_invoice_email(invoice: dict, recipient_email: str, pdf_bytes: bytes, subject: str = None, message: str = None):
    """Send invoice via email with PDF attachment"""
    subject = subject or f"Invoice {invoice['invoice_number']} from Realtouch Invoice"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 24px; }}
            .content {{ background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            .invoice-info {{ background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .amount {{ font-size: 28px; color: #0066cc; font-weight: bold; }}
            .footer {{ text-align: center; padding: 20px; color: #94a3b8; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{invoice['document_type']} #{invoice['invoice_number']}</h1>
            </div>
            <div class="content">
                <p>Dear {invoice['customer_name']},</p>
                <p>{message or 'Please find attached your invoice. We appreciate your business!'}</p>
                
                <div class="invoice-info">
                    <p><strong>Invoice Number:</strong> {invoice['invoice_number']}</p>
                    <p><strong>Date:</strong> {invoice['invoice_date']}</p>
                    <p><strong>Due Date:</strong> {invoice.get('due_date', 'Upon Receipt')}</p>
                    <p class="amount">Total: £{invoice['total']:.2f}</p>
                </div>
                
                <p>The full invoice is attached to this email as a PDF.</p>
                <p>Thank you for your business!</p>
            </div>
            <div class="footer">
                <p>Realtouch Global Ventures Ltd | Company No. 16578193</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    attachments = [{
        "filename": f"{invoice['invoice_number']}.pdf",
        "content": base64.b64encode(pdf_bytes).decode('utf-8')
    }]
    
    return await send_email(recipient_email, subject, html_content, attachments)

# ========== PDF GENERATION ==========

def generate_invoice_pdf(invoice: dict, user: dict = None) -> BytesIO:
    """Generate professional PDF with customizable template colors and user logo"""
    from reportlab.lib.utils import ImageReader
    
    buffer = BytesIO()
    
    # Get template colors
    template_id = (user or {}).get("pdf_template", "classic")
    template = PDF_TEMPLATES.get(template_id, PDF_TEMPLATES["classic"])
    header_color = colors.HexColor(template["header_color"])
    accent_color = colors.HexColor(template["accent_color"])
    
    # Create PDF with custom canvas
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header bar at top
    c.setFillColor(header_color)
    c.rect(0, height - 60, width, 60, fill=True, stroke=False)
    
    # Footer bar at bottom
    c.setFillColor(header_color)
    c.rect(0, 0, width, 30, fill=True, stroke=False)
    
    # Company logo (if available) - positioned in top right
    logo_x = width - 120
    logo_y = height - 140
    logo_drawn = False
    
    if user and user.get('company_logo'):
        try:
            logo_data_str = user['company_logo']
            # Handle both data URL and raw base64
            if ',' in logo_data_str:
                logo_base64 = logo_data_str.split(',')[-1]
            else:
                logo_base64 = logo_data_str
            
            logo_data = base64.b64decode(logo_base64)
            logo_buffer = BytesIO(logo_data)
            logo_image = ImageReader(logo_buffer)
            c.drawImage(logo_image, logo_x, logo_y, width=70, height=70, preserveAspectRatio=True, mask='auto')
            logger.info("Logo successfully added to PDF")
        except Exception as e:
            logger.error(f"Failed to add logo to PDF: {str(e)}")
    
    # Company details (From section)
    y_pos = height - 100
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 14)
    
    company_name = invoice.get('from_company_name') or (user and user.get('company_details', {}).get('name')) or "Realtouch Global Ventures Ltd"
    trading_name = invoice.get('from_trading_name') or (user and user.get('company_details', {}).get('trading_name'))
    reg_number = invoice.get('from_registration_number') or (user and user.get('company_details', {}).get('registration_number')) or "16578193"
    from_address = invoice.get('from_address') or (user and user.get('company_details', {}).get('address'))
    tagline = invoice.get('from_tagline') or (user and user.get('company_details', {}).get('tagline'))
    
    # Main company name
    if trading_name:
        c.drawString(50, y_pos, trading_name)
        y_pos -= 18
        c.setFont("Helvetica", 10)
        c.drawString(50, y_pos, f"is a trading name of {company_name},")
        y_pos -= 14
        c.drawString(50, y_pos, f"registered in England and Wales, Company No. {reg_number}.")
    else:
        c.drawString(50, y_pos, company_name)
        y_pos -= 18
        c.setFont("Helvetica", 10)
        c.drawString(50, y_pos, f"Company No. {reg_number}")
    
    if from_address:
        y_pos -= 14
        c.drawString(50, y_pos, from_address)
    
    if tagline:
        y_pos -= 18
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColor(accent_color)
        c.drawString(50, y_pos, tagline)
    
    # Horizontal line
    y_pos -= 25
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.setLineWidth(1)
    c.line(50, y_pos, width - 50, y_pos)
    
    # Bill To section
    y_pos -= 30
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y_pos, "BILL TO")
    
    # Invoice details on right
    c.drawString(350, y_pos, "INVOICE #")
    c.setFont("Helvetica", 11)
    c.drawString(450, y_pos, invoice['invoice_number'])
    
    y_pos -= 18
    c.setFont("Helvetica-Bold", 11)
    c.drawString(350, y_pos, "INVOICE DATE")
    c.setFont("Helvetica", 11)
    c.drawString(450, y_pos, invoice['invoice_date'])
    
    if invoice.get('due_date'):
        y_pos -= 18
        c.setFont("Helvetica-Bold", 11)
        c.drawString(350, y_pos, "DUE DATE")
        c.setFont("Helvetica", 11)
        c.drawString(450, y_pos, invoice['due_date'])
    
    # Customer info
    y_pos += 18 if invoice.get('due_date') else 0
    y_pos -= 18
    c.setFont("Helvetica", 11)
    c.drawString(50, y_pos, invoice['customer_name'])
    if invoice.get('customer_address'):
        for line in invoice['customer_address'].split('\n')[:3]:
            y_pos -= 14
            c.drawString(50, y_pos, line)
    
    # Invoice Total box
    y_pos -= 50
    c.setStrokeColor(colors.black)
    c.setLineWidth(2)
    c.line(50, y_pos, width - 50, y_pos)
    
    y_pos -= 40
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y_pos, "Invoice Total")
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(accent_color)
    c.drawRightString(width - 50, y_pos, f"£{invoice['total']:.2f}")
    
    y_pos -= 25
    c.setStrokeColor(colors.black)
    c.setLineWidth(2)
    c.line(50, y_pos, width - 50, y_pos)
    
    # Items table
    y_pos -= 40
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y_pos, "DESCRIPTION")
    c.drawRightString(width - 50, y_pos, "AMOUNT")
    
    y_pos -= 15
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.setLineWidth(0.5)
    c.line(50, y_pos, width - 50, y_pos)
    
    # Items
    c.setFont("Helvetica", 10)
    for item in invoice.get('items', []):
        y_pos -= 25
        c.drawString(50, y_pos, item['description'])
        if item.get('quantity') and item['quantity'] != 1:
            c.drawString(300, y_pos, f"x{item['quantity']}")
        c.drawRightString(width - 50, y_pos, f"£{item['amount']:.2f}")
    
    # Totals
    y_pos -= 40
    c.setStrokeColor(colors.HexColor('#e2e8f0'))
    c.line(300, y_pos, width - 50, y_pos)
    
    y_pos -= 20
    c.setFont("Helvetica", 10)
    c.drawString(300, y_pos, "Subtotal")
    c.drawRightString(width - 50, y_pos, f"£{invoice['subtotal']:.2f}")
    
    if invoice.get('tax_rate', 0) > 0:
        y_pos -= 18
        c.drawString(300, y_pos, f"Tax ({invoice['tax_rate']}%)")
        c.drawRightString(width - 50, y_pos, f"£{invoice['tax_amount']:.2f}")
    
    y_pos -= 25
    c.setFont("Helvetica-Bold", 12)
    c.drawString(300, y_pos, "TOTAL")
    c.drawRightString(width - 50, y_pos, f"£{invoice['total']:.2f}")
    
    # Notes / Terms
    if invoice.get('notes') or invoice.get('terms_conditions'):
        y_pos -= 50
        c.setFont("Helvetica-Bold", 10)
        c.drawString(50, y_pos, "Notes / Terms:")
        c.setFont("Helvetica", 9)
        if invoice.get('notes'):
            y_pos -= 15
            c.drawString(50, y_pos, invoice['notes'][:100])
        if invoice.get('terms_conditions'):
            y_pos -= 15
            c.drawString(50, y_pos, invoice['terms_conditions'][:100])
    
    # Status badge
    status = invoice.get('status', 'unpaid').upper()
    status_color = colors.HexColor('#10b981') if status == 'PAID' else colors.HexColor('#f59e0b')
    y_pos = 50
    c.setFillColor(status_color)
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 50, y_pos, status)
    
    c.save()
    buffer.seek(0)
    return buffer

# ========== AUTH ENDPOINTS ==========

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id from Emergent Auth for session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    async with httpx.AsyncClient() as client_http:
        try:
            auth_response = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            auth_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    user_doc = await db.users.find_one(
        {"email": auth_data["email"]},
        {"_id": 0}
    )
    
    is_new_user = False
    if user_doc:
        await db.users.update_one(
            {"email": auth_data["email"]},
            {"$set": {
                "name": auth_data.get("name", user_doc.get("name")),
                "picture": auth_data.get("picture", user_doc.get("picture"))
            }}
        )
        user_id = user_doc["user_id"]
    else:
        is_new_user = True
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data.get("name", "User"),
            "picture": auth_data.get("picture"),
            "plan": "starter",
            "download_count": 0,
            "email_verified": True,
            "company_details": {
                "name": "Realtouch Global Ventures Ltd",
                "trading_name": None,
                "registration_number": "16578193",
                "address": None,
                "tagline": None
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    session_token = auth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Add owner status to response
    user_doc["is_owner"] = is_owner(user_doc)
    user_doc["effective_plan"] = get_effective_plan(user_doc)
    
    # Send verification email for new users
    if is_new_user:
        asyncio.create_task(send_verification_email(auth_data["email"], auth_data.get("name", "User")))
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    # Add owner status
    user["is_owner"] = is_owner(user)
    user["effective_plan"] = get_effective_plan(user)
    return user

# ========== CUSTOM GOOGLE OAUTH ENDPOINT ==========
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

class GoogleCredentialRequest(BaseModel):
    credential: str

@api_router.post("/auth/google")
async def google_oauth_login(request_body: GoogleCredentialRequest, response: Response):
    """Verify Google ID token and create/login user"""
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    try:
        idinfo = id_token.verify_oauth2_token(
            request_body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = idinfo.get('email', '').lower()
        name = idinfo.get('name', 'User')
        picture = idinfo.get('picture')

        if not email:
            raise HTTPException(status_code=400, detail="No email in Google token")

    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    # Check if user exists
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})

    is_new_user = False
    if user_doc:
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "name": name,
                "picture": picture
            }}
        )
        user_id = user_doc["user_id"]
    else:
        is_new_user = True
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "plan": "starter",
            "download_count": 0,
            "email_verified": True,
            "auth_provider": "google",
            "company_details": {
                "name": "Realtouch Global Ventures Ltd",
                "trading_name": None,
                "registration_number": "16578193",
                "address": None,
                "tagline": None
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)

    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    user_doc["is_owner"] = is_owner(user_doc)
    user_doc["effective_plan"] = get_effective_plan(user_doc)

    if is_new_user:
        asyncio.create_task(send_verification_email(email, name))

    return {"user": user_doc, "session_token": session_token}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ========== EMAIL/PASSWORD AUTH ENDPOINTS ==========

@api_router.post("/auth/signup")
async def signup(user_data: UserSignup, response: Response):
    """Sign up with email and password"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user_data.email.lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")
    
    # Create new user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = hash_password(user_data.password)
    
    new_user = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "name": user_data.name,
        "picture": None,
        "plan": "starter",
        "download_count": 0,
        "email_verified": False,
        "password_hash": password_hash,
        "auth_provider": "email",
        "company_details": {
            "name": "Realtouch Global Ventures Ltd",
            "trading_name": None,
            "registration_number": "16578193",
            "address": None,
            "tagline": None
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Fetch user without _id and password_hash
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    user_doc["is_owner"] = is_owner(user_doc)
    user_doc["effective_plan"] = get_effective_plan(user_doc)
    
    # Send verification email
    asyncio.create_task(send_verification_email(user_data.email, user_data.name))
    
    return {"user": user_doc, "session_token": session_token}

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    """Login with email and password"""
    user = await db.users.find_one({"email": user_data.email.lower()}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user was created via Google OAuth (no password)
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="This account uses Google Sign-In. Please use Google to login.")
    
    # Verify password
    if not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Remove old sessions
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Remove sensitive data from response
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    user_response["is_owner"] = is_owner(user_response)
    user_response["effective_plan"] = get_effective_plan(user_response)
    
    return {"user": user_response, "session_token": session_token}

# ========== USER ENDPOINTS ==========

@api_router.get("/user/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user

@api_router.put("/user/profile")
async def update_profile(
    profile: ProfileUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {}
    
    if profile.name is not None:
        update_data["name"] = profile.name
    if profile.company_details is not None:
        update_data["company_details"] = profile.company_details.model_dump()
    if profile.company_logo is not None:
        update_data["company_logo"] = profile.company_logo
    
    if update_data:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    return updated_user

@api_router.post("/user/upload-logo")
async def upload_logo(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload company logo"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")
    
    base64_logo = f"data:{file.content_type};base64,{base64.b64encode(contents).decode('utf-8')}"
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"company_logo": base64_logo}}
    )
    
    return {"message": "Logo uploaded successfully", "logo": base64_logo}

@api_router.delete("/user/logo")
async def delete_logo(user: dict = Depends(get_current_user)):
    """Delete company logo"""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"company_logo": None}}
    )
    return {"message": "Logo deleted"}

# ========== INVOICE ENDPOINTS ==========

async def generate_invoice_number(user_id: str) -> str:
    count = await db.invoices.count_documents({"user_id": user_id})
    return f"INV-{count + 1:05d}"

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    status: Optional[str] = None,
    document_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {"user_id": user["user_id"]}
    
    if status and status != "all":
        query["status"] = status
    if document_type and document_type != "all":
        query["document_type"] = document_type
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    user: dict = Depends(get_current_user)
):
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@api_router.post("/invoices")
async def create_invoice(
    invoice_data: InvoiceCreate,
    user: dict = Depends(get_current_user)
):
    subtotal = sum(item.amount for item in invoice_data.items)
    tax_amount = subtotal * (invoice_data.tax_rate / 100)
    total = subtotal + tax_amount
    
    invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
    invoice_number = await generate_invoice_number(user["user_id"])
    
    # Get default company details from user profile
    company_details = user.get('company_details', {})
    
    invoice = {
        "invoice_id": invoice_id,
        "user_id": user["user_id"],
        "invoice_number": invoice_number,
        "document_type": invoice_data.document_type,
        "customer_name": invoice_data.customer_name,
        "customer_address": invoice_data.customer_address,
        "customer_email": invoice_data.customer_email,
        "invoice_date": invoice_data.invoice_date,
        "due_date": invoice_data.due_date,
        "items": [item.model_dump() for item in invoice_data.items],
        "subtotal": subtotal,
        "tax_rate": invoice_data.tax_rate,
        "tax_amount": tax_amount,
        "total": total,
        "status": invoice_data.status,
        "notes": invoice_data.notes,
        "terms_conditions": invoice_data.terms_conditions,
        # From section - use provided or default from user profile
        "from_company_name": invoice_data.from_company_name or company_details.get('name'),
        "from_trading_name": invoice_data.from_trading_name or company_details.get('trading_name'),
        "from_registration_number": invoice_data.from_registration_number or company_details.get('registration_number'),
        "from_address": invoice_data.from_address or company_details.get('address'),
        "from_email": invoice_data.from_email or company_details.get('email'),
        "from_phone": invoice_data.from_phone or company_details.get('phone'),
        "from_tagline": invoice_data.from_tagline or company_details.get('tagline'),
        # Recurring
        "recurring": invoice_data.recurring.model_dump() if invoice_data.recurring else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.invoices.insert_one(invoice)
    
    if "_id" in invoice:
        del invoice["_id"]
    return invoice

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    invoice_data: InvoiceUpdate,
    user: dict = Depends(get_current_user)
):
    existing = await db.invoices.find_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {k: v for k, v in invoice_data.model_dump().items() if v is not None}
    
    if "items" in update_data:
        update_data["items"] = [item.model_dump() if hasattr(item, 'model_dump') else item for item in update_data["items"]]
        subtotal = sum(item["amount"] for item in update_data["items"])
        update_data["subtotal"] = subtotal
        tax_rate = update_data.get("tax_rate", existing.get("tax_rate", 0))
        update_data["tax_amount"] = subtotal * (tax_rate / 100)
        update_data["total"] = subtotal + update_data["tax_amount"]
    elif "tax_rate" in update_data:
        subtotal = existing.get("subtotal", 0)
        update_data["tax_amount"] = subtotal * (update_data["tax_rate"] / 100)
        update_data["total"] = subtotal + update_data["tax_amount"]
    
    if "recurring" in update_data and update_data["recurring"]:
        update_data["recurring"] = update_data["recurring"].model_dump() if hasattr(update_data["recurring"], 'model_dump') else update_data["recurring"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    updated = await db.invoices.find_one(
        {"invoice_id": invoice_id},
        {"_id": 0}
    )
    return updated

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    user: dict = Depends(get_current_user)
):
    result = await db.invoices.delete_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice deleted"}

# ========== DOWNLOAD & EMAIL ENDPOINTS ==========

@api_router.get("/invoices/{invoice_id}/download")
async def download_invoice(
    invoice_id: str,
    format: str = "pdf",
    user: dict = Depends(get_current_user)
):
    """Download invoice as PDF with PERMANENT limit enforcement (bypassed for owners)"""
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    # Check if user is owner - owners have unlimited access
    user_is_owner = is_owner(user_doc)
    effective_plan = get_effective_plan(user_doc)
    
    # ENFORCE PERMANENT DOWNLOAD LIMIT (skip for owners and paid plans)
    if not user_is_owner and user_doc["plan"] == "starter" and user_doc["download_count"] >= 5:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "Download limit reached. You have used all 5 free downloads. Upgrade to continue.",
                "download_count": user_doc["download_count"],
                "limit": 5,
                "requires_upgrade": True
            }
        )
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate PDF
    buffer = generate_invoice_pdf(invoice, user_doc)
    
    # INCREMENT DOWNLOAD COUNT (only for starter plan, not owners)
    if not user_is_owner and user_doc["plan"] == "starter":
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"download_count": 1}}
        )
    
    # Log download
    await db.downloads.insert_one({
        "download_id": f"dl_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "invoice_id": invoice_id,
        "format": format,
        "downloaded_at": datetime.now(timezone.utc).isoformat()
    })
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={invoice['invoice_number']}.pdf"
        }
    )

@api_router.post("/invoices/{invoice_id}/send-email")
async def send_invoice_via_email(
    invoice_id: str,
    request: EmailInvoiceRequest,
    user: dict = Depends(get_current_user)
):
    """Send invoice via email to customer"""
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0}
    )
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate PDF
    buffer = generate_invoice_pdf(invoice, user_doc)
    pdf_bytes = buffer.getvalue()
    
    # Send email
    result = await send_invoice_email(
        invoice, 
        request.recipient_email,
        pdf_bytes,
        request.subject,
        request.message
    )
    
    # Log email sent
    await db.invoice_emails.insert_one({
        "email_id": f"em_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "invoice_id": invoice_id,
        "recipient_email": request.recipient_email,
        "status": result.get("status"),
        "sent_at": datetime.now(timezone.utc).isoformat()
    })
    
    return result

# ========== CUSTOMER ENDPOINTS ==========

@api_router.get("/customers")
async def get_customers(user: dict = Depends(get_current_user)):
    customers = await db.customers.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    return customers

@api_router.post("/customers")
async def create_customer(
    customer_data: CustomerCreate,
    user: dict = Depends(get_current_user)
):
    customer_id = f"cust_{uuid.uuid4().hex[:12]}"
    
    customer = {
        "customer_id": customer_id,
        "user_id": user["user_id"],
        "name": customer_data.name,
        "email": customer_data.email,
        "phone": customer_data.phone,
        "address": customer_data.address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.customers.insert_one(customer)
    if "_id" in customer:
        del customer["_id"]
    return customer

@api_router.put("/customers/{customer_id}")
async def update_customer(
    customer_id: str,
    customer_data: CustomerCreate,
    user: dict = Depends(get_current_user)
):
    result = await db.customers.update_one(
        {"customer_id": customer_id, "user_id": user["user_id"]},
        {"$set": customer_data.model_dump()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    updated = await db.customers.find_one(
        {"customer_id": customer_id},
        {"_id": 0}
    )
    return updated

@api_router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: str,
    user: dict = Depends(get_current_user)
):
    result = await db.customers.delete_one(
        {"customer_id": customer_id, "user_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"message": "Customer deleted"}

# ========== PAYMENT ENDPOINTS ==========

PAYMENT_PACKAGES = {
    "professional": 5.00,
    "enterprise": 49.90
}

@api_router.post("/payments/stripe/create-checkout")
async def create_stripe_checkout(
    payment: SubscriptionPaymentRequest,
    user: dict = Depends(get_current_user)
):
    """Create Stripe checkout session with multiple payment methods including Direct Debit"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    if payment.plan not in PAYMENT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    amount = PAYMENT_PACKAGES[payment.plan]
    
    success_url = f"{payment.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payment.origin_url}/dashboard"
    
    host_url = str(payment.origin_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Payment methods based on user selection
    payment_methods = ["card"]
    if payment.payment_method == "bacs_debit":
        payment_methods = ["bacs_debit"]
    elif payment.payment_method == "google_pay":
        payment_methods = ["card"]  # Google Pay works through card method
    
    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="gbp",
        success_url=success_url,
        cancel_url=cancel_url,
        payment_methods=payment_methods,
        metadata={
            "user_id": user["user_id"],
            "plan": payment.plan,
            "user_email": user.get("email", ""),
            "payment_method": payment.payment_method,
            "subscription_type": "monthly"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "session_id": session.session_id,
        "plan": payment.plan,
        "amount": amount,
        "currency": "gbp",
        "payment_method": payment.payment_method,
        "payment_status": "pending",
        "subscription_type": "monthly",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_payment_status(
    session_id: str,
    user: dict = Depends(get_current_user)
):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if transaction and status.payment_status == "paid" and transaction.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        plan = status.metadata.get("plan", transaction.get("plan", "professional"))
        subscription_start = datetime.now(timezone.utc).isoformat()
        subscription_end = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "plan": plan,
                "download_count": 0,
                "subscription_start": subscription_start,
                "subscription_end": subscription_end,
                "subscription_status": "active"
            }}
        )
        
        # Send upgrade confirmation email
        asyncio.create_task(send_email(
            user["email"],
            "🎉 Upgrade Successful - Realtouch Invoice",
            f"""
            <html>
            <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">Upgrade Complete! 🎉</h1>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p>Hi {user.get('name', 'there')},</p>
                    <p>Your account has been upgraded to <strong>{plan.title()}</strong>!</p>
                    <p>You now have:</p>
                    <ul>
                        <li>Unlimited downloads</li>
                        <li>Payment integration</li>
                        <li>Custom branding</li>
                        <li>Priority support</li>
                    </ul>
                    <p>Thank you for choosing Realtouch Invoice!</p>
                </div>
            </body>
            </html>
            """
        ))
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, sig)
        
        if webhook_response.event_type == "checkout.session.completed":
            if webhook_response.payment_status == "paid":
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                
                user_id = webhook_response.metadata.get("user_id")
                plan = webhook_response.metadata.get("plan", "professional")
                
                if user_id:
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "plan": plan,
                            "download_count": 0
                        }}
                    )
        
        return {"received": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"received": True}

# ========== RECURRING INVOICES ==========

@api_router.get("/recurring-invoices")
async def get_recurring_invoices(user: dict = Depends(get_current_user)):
    """Get all recurring invoices"""
    invoices = await db.invoices.find(
        {"user_id": user["user_id"], "recurring.enabled": True},
        {"_id": 0}
    ).to_list(1000)
    return invoices

@api_router.post("/invoices/{invoice_id}/set-recurring")
async def set_invoice_recurring(
    invoice_id: str,
    recurring: RecurringConfig,
    user: dict = Depends(get_current_user)
):
    """Set invoice as recurring"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Calculate next date based on frequency
    from datetime import datetime
    today = datetime.now(timezone.utc)
    
    if recurring.frequency == "weekly":
        next_date = today + timedelta(weeks=1)
    elif recurring.frequency == "monthly":
        next_date = today + timedelta(days=30)
    elif recurring.frequency == "quarterly":
        next_date = today + timedelta(days=90)
    elif recurring.frequency == "yearly":
        next_date = today + timedelta(days=365)
    else:
        next_date = today + timedelta(days=30)
    
    recurring_data = recurring.model_dump()
    recurring_data["next_date"] = next_date.strftime("%Y-%m-%d")
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"recurring": recurring_data}}
    )
    
    updated = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    return updated

# ========== STATS ENDPOINTS ==========

@api_router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    invoices = await db.invoices.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    total_revenue = sum(inv["total"] for inv in invoices if inv["status"] == "paid")
    total_unpaid = sum(inv["total"] for inv in invoices if inv["status"] != "paid")
    
    now = datetime.now(timezone.utc)
    this_month_invoices = [
        inv for inv in invoices 
        if inv["invoice_date"].startswith(f"{now.year}-{now.month:02d}")
    ]
    this_month_revenue = sum(inv["total"] for inv in this_month_invoices if inv["status"] == "paid")
    
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    recurring_count = len([inv for inv in invoices if (inv.get("recurring") or {}).get("enabled")])
    
    # Check if owner
    user_is_owner = is_owner(user_doc)
    effective_plan = get_effective_plan(user_doc)
    
    return {
        "total_revenue": total_revenue,
        "total_unpaid": total_unpaid,
        "this_month_revenue": this_month_revenue,
        "invoice_count": len(invoices),
        "downloads_used": user_doc.get("download_count", 0),
        "downloads_limit": -1 if user_is_owner or user_doc.get("plan") != "starter" else 5,  # -1 = unlimited
        "plan": effective_plan,
        "is_owner": user_is_owner,
        "recurring_invoices": recurring_count
    }

# ========== PDF TEMPLATE CUSTOMIZATION ==========

PDF_TEMPLATES = {
    "classic": {
        "name": "Classic Blue",
        "header_color": "#0066cc",
        "accent_color": "#0052a3",
        "text_color": "#000000"
    },
    "modern": {
        "name": "Modern Dark",
        "header_color": "#1e293b",
        "accent_color": "#3b82f6",
        "text_color": "#1e293b"
    },
    "minimal": {
        "name": "Minimal Grey",
        "header_color": "#64748b",
        "accent_color": "#475569",
        "text_color": "#334155"
    },
    "emerald": {
        "name": "Emerald Green",
        "header_color": "#059669",
        "accent_color": "#047857",
        "text_color": "#064e3b"
    },
    "crimson": {
        "name": "Crimson Red",
        "header_color": "#dc2626",
        "accent_color": "#b91c1c",
        "text_color": "#7f1d1d"
    }
}

@api_router.get("/pdf-templates")
async def get_pdf_templates():
    """Get available PDF templates"""
    return PDF_TEMPLATES

class TemplatePreference(BaseModel):
    template_id: str

@api_router.put("/user/pdf-template")
async def set_pdf_template(
    pref: TemplatePreference,
    user: dict = Depends(get_current_user)
):
    """Set user's preferred PDF template"""
    if pref.template_id not in PDF_TEMPLATES:
        raise HTTPException(status_code=400, detail="Invalid template")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"pdf_template": pref.template_id}}
    )
    return {"message": "Template updated", "template_id": pref.template_id}

# ========== RECURRING INVOICE PROCESSING ==========

@api_router.post("/recurring/process")
async def process_recurring_invoices(user: dict = Depends(get_current_user)):
    """Manually trigger processing of recurring invoices for the current user"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    recurring_invoices = await db.invoices.find(
        {
            "user_id": user["user_id"],
            "recurring.enabled": True,
            "recurring.next_date": {"$lte": today}
        },
        {"_id": 0}
    ).to_list(100)
    
    created_invoices = []
    for inv in recurring_invoices:
        # Create a new invoice from the recurring template
        new_invoice_id = f"inv_{uuid.uuid4().hex[:12]}"
        new_invoice_number = await generate_invoice_number(user["user_id"])
        
        new_invoice = {
            "invoice_id": new_invoice_id,
            "user_id": user["user_id"],
            "invoice_number": new_invoice_number,
            "document_type": inv["document_type"],
            "customer_name": inv["customer_name"],
            "customer_address": inv.get("customer_address"),
            "customer_email": inv.get("customer_email"),
            "invoice_date": today,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d"),
            "items": inv["items"],
            "subtotal": inv["subtotal"],
            "tax_rate": inv.get("tax_rate", 0),
            "tax_amount": inv.get("tax_amount", 0),
            "total": inv["total"],
            "status": "unpaid",
            "notes": inv.get("notes"),
            "terms_conditions": inv.get("terms_conditions"),
            "from_company_name": inv.get("from_company_name"),
            "from_trading_name": inv.get("from_trading_name"),
            "from_registration_number": inv.get("from_registration_number"),
            "from_address": inv.get("from_address"),
            "from_email": inv.get("from_email"),
            "from_phone": inv.get("from_phone"),
            "from_tagline": inv.get("from_tagline"),
            "recurring": None,  # Generated invoices are not recurring themselves
            "parent_recurring_id": inv["invoice_id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.invoices.insert_one(new_invoice)
        if "_id" in new_invoice:
            del new_invoice["_id"]
        created_invoices.append(new_invoice)
        
        # Calculate next date based on frequency
        recurring = inv.get("recurring", {})
        frequency = recurring.get("frequency", "monthly")
        
        if frequency == "weekly":
            next_date = datetime.now(timezone.utc) + timedelta(weeks=1)
        elif frequency == "monthly":
            next_date = datetime.now(timezone.utc) + timedelta(days=30)
        elif frequency == "quarterly":
            next_date = datetime.now(timezone.utc) + timedelta(days=90)
        elif frequency == "yearly":
            next_date = datetime.now(timezone.utc) + timedelta(days=365)
        else:
            next_date = datetime.now(timezone.utc) + timedelta(days=30)
        
        # Check if end_date is reached
        end_date = recurring.get("end_date")
        if end_date and next_date.strftime("%Y-%m-%d") > end_date:
            # Disable recurring
            await db.invoices.update_one(
                {"invoice_id": inv["invoice_id"]},
                {"$set": {"recurring.enabled": False}}
            )
        else:
            # Update next_date
            await db.invoices.update_one(
                {"invoice_id": inv["invoice_id"]},
                {"$set": {"recurring.next_date": next_date.strftime("%Y-%m-%d")}}
            )
    
    return {
        "processed": len(created_invoices),
        "invoices": created_invoices
    }

# ========== HEALTH CHECK ==========

@api_router.get("/")
async def root():
    return {"message": "Realtouch Invoice API", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

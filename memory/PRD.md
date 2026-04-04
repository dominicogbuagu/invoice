# Realtouch Invoice - Product Requirements Document

## Original Problem Statement
Build a full-stack SaaS invoicing platform called "Realtouch Invoice" with:
- High-converting landing page
- Dashboard for invoice management (CRUD)
- Customizable tax rates, editable 'From' section, logo upload for PDFs
- 5 permanent download limit for free starter plan users (unlimited for paid/owners)
- Stripe, PayPal, Google Pay payment integration
- Email/Password + Google OAuth authentication
- Owner admin role bypassing all restrictions
- GitHub sync

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Shadcn UI, @react-oauth/google
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Auth**: Custom JWT (Email/Password) + Custom Google OAuth
- **PDF Generation**: ReportLab
- **Payments**: Stripe (card, BACS Direct Debit, Google Pay)
- **Emails**: Resend API

## Pricing
- Starter: Free (5 permanent downloads)
- Professional: £5/month
- Enterprise: £49.90/month

## Completed Features
- [x] Landing page with pricing
- [x] Dashboard with invoice CRUD
- [x] Customer management
- [x] Email/Password signup & login
- [x] Custom Google OAuth (user-controlled branding)
- [x] PDF generation with user logos & template colors
- [x] 5-download permanent limit for free users
- [x] Owner bypass (rgvlimited@gmail.com)
- [x] Stripe checkout (card, BACS Direct Debit, Google Pay)
- [x] PDF Template Customization (5 themes: Classic Blue, Modern Dark, Minimal Grey, Emerald Green, Crimson Red)
- [x] Recurring invoice processing endpoint
- [x] Settings page with logo upload, company details, template selector
- [x] Email invoices via Resend
- [x] Payment success page

## Completed This Session (Feb 4, 2026)
- Updated pricing: Professional £5/month, Enterprise £49.90/month
- Replaced Emergent-managed OAuth with Custom Google OAuth (user's own credentials)
- Added BACS Direct Debit payment method in Stripe checkout
- Added PDF Template Customization (5 color themes with preview swatches)
- Added recurring invoice processing endpoint (/api/recurring/process)
- Fixed lint issues and backend syntax errors

## Upcoming Tasks (P1)
- [ ] Recurring Invoices UI - Frontend tab/page for managing recurring invoice schedules
- [ ] Background cron job for auto-generating recurring invoices
- [ ] PDF Template Customization - Preview before download
- [ ] PayPal integration for plan upgrades

## Future Tasks (P2)
- [ ] Multi-user access for Enterprise plan
- [ ] API access for Enterprise plan
- [ ] Advanced analytics dashboard
- [ ] Dedicated account manager assignment
- [ ] Subscription management page (view/cancel/change plan)

## Key API Endpoints
- POST /api/auth/signup - Email/Password registration
- POST /api/auth/login - Email/Password login
- POST /api/auth/google - Custom Google OAuth login
- GET /api/auth/me - Current user info
- CRUD /api/invoices - Invoice management
- CRUD /api/customers - Customer management
- GET /api/invoices/{id}/download - PDF download with limits
- POST /api/payments/stripe/create-checkout - Stripe checkout (card/bacs_debit/google_pay)
- GET /api/pdf-templates - Available PDF themes
- PUT /api/user/pdf-template - Set user's preferred theme
- POST /api/recurring/process - Process due recurring invoices

## DB Schema
- users: {user_id, email, name, password_hash, picture, plan, download_count, is_owner, pdf_template, company_details, subscription_start, subscription_end, subscription_status}
- invoices: {invoice_id, user_id, invoice_number, document_type, customer_name, items, subtotal, tax_rate, tax_amount, total, status, recurring, parent_recurring_id}
- customers: {customer_id, user_id, name, email, phone, address}
- downloads: {user_id, invoice_id, format, downloaded_at}
- payment_transactions: {transaction_id, user_id, session_id, plan, amount, currency, payment_method, payment_status, subscription_type}

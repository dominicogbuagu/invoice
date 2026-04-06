# Realtouch Invoice - Product Requirements Document

## Original Problem Statement
Build a full-stack SaaS invoicing platform called "Realtouch Invoice" with landing page, dashboard for invoice management (CRUD), customizable tax rates, editable 'From' section, logo upload for PDFs, 5 permanent download limit for free users, Stripe/PayPal/Google Pay payments, Email/Password + Google OAuth auth, owner admin role, GitHub sync, and a backend admin management portal.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Shadcn UI, @react-oauth/google
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Auth**: Custom JWT (Email/Password) + Custom Google OAuth
- **PDF Generation**: ReportLab (5 color templates)
- **Payments**: Stripe (card, BACS Direct Debit, Google Pay)
- **Emails**: Resend API
- **Domain**: https://www.invoice.realtouch.com

## Pricing
- Starter: Free (5 permanent downloads)
- Professional: £5/month
- Enterprise: £49.90/month

## Completed Features
- [x] Landing page with pricing
- [x] Dashboard with invoice CRUD
- [x] Customer management
- [x] Email/Password signup & login
- [x] Forgot Password / Reset Password flow
- [x] Custom Google OAuth (user-controlled branding)
- [x] PDF generation with user logos & template colors (5 themes)
- [x] 5-download permanent limit for free users
- [x] Owner bypass (rgvlimited@gmail.com)
- [x] Stripe checkout (card, BACS Direct Debit, Google Pay)
- [x] PDF Template Customization in Settings
- [x] Recurring invoice processing endpoint
- [x] Settings page with logo upload, company details, template selector
- [x] Email invoices via Resend
- [x] Payment success page
- [x] **Admin Management Portal** (/admin route):
  - System Overview (users, invoices, revenue, downloads, plan distribution)
  - User Management (view, search, upgrade/downgrade plans, enable/disable, delete)
  - Payment Transactions list
  - Feature Controls (toggle features, set download limits, manage pricing)
  - PDF Template Management (add/edit/delete templates)
  - Maintenance Mode toggle
- [x] Removed Production Deployment Guide from public Settings page
- [x] New users get blank company details (not Realtouch)
- [x] All API calls use XMLHttpRequest (bypass Emergent script)

## Upcoming Tasks (P1)
- [ ] Recurring Invoices management UI
- [ ] Background cron for auto-generating recurring invoices
- [ ] PDF preview before download
- [ ] PayPal integration

## Future Tasks (P2)
- [ ] Multi-user access for Enterprise
- [ ] API access for Enterprise
- [ ] Advanced analytics dashboard
- [ ] Subscription management page

## Key API Endpoints
### Auth
- POST /api/auth/signup, /api/auth/login, /api/auth/google
- POST /api/auth/forgot-password, /api/auth/reset-password
- GET /api/auth/me, POST /api/auth/logout

### Admin (owner only)
- GET /api/admin/stats, /api/admin/users, /api/admin/transactions, /api/admin/settings
- PUT /api/admin/users/{id}, /api/admin/settings
- POST /api/admin/templates, DELETE /api/admin/templates/{id}
- DELETE /api/admin/users/{id}

### Business
- CRUD /api/invoices, /api/customers
- GET /api/invoices/{id}/download
- POST /api/payments/stripe/create-checkout
- GET /api/pdf-templates, PUT /api/user/pdf-template

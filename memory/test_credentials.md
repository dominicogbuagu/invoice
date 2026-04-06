# Test Credentials

## Email/Password Auth
- **Owner/Admin**: `rgvlimited@gmail.com` / `Admin123` — is_owner: True, unlimited access, admin portal access
- **Test User**: `visitsombeauty@gmail.com` / `1988chisom?` (Sombeauty London Ltd)
- **Test User**: `realtouchacademy@gmail.com` (Realtouch Academy - password unknown)

## Google OAuth
- Uses custom Google OAuth (Client ID: 142683158913-...)
- Domain for Origins: https://www.invoice.realtouch.com
- Preview Origins: https://invoice-dashboard-49.preview.emergentagent.com

## Backend API
- Base URL: https://invoice-dashboard-49.preview.emergentagent.com
- Auth: Bearer token via `Authorization: Bearer <session_token>` header
- Admin endpoints require owner account

## Admin Portal
- URL: /admin (owner-only access)
- Features: Overview, Users, Transactions, Feature Controls, PDF Templates

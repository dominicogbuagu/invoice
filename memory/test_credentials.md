# Test Credentials

## Email/Password Auth
- **Owner/Admin**: `rgvlimited@gmail.com` / `Admin123` — is_owner: True, unlimited access, admin portal access
- **Test User**: `visitsombeauty@gmail.com` / `1988chisom?` (Sombeauty London Ltd)
- **Test User**: `realtouchacademy@gmail.com` (Realtouch Academy - password unknown)

## Google OAuth
- Uses custom Google OAuth (Client ID: 142683158913-...)
- Domain for Origins: https://www.invoice.realtouch.com
- Preview Origins: https://stripe-invoice-test.preview.emergentagent.com

## Backend API
- Base URL: https://stripe-invoice-test.preview.emergentagent.com
- Auth: Bearer token via `Authorization: Bearer <session_token>` header
- Admin endpoints require owner account

## Admin Portal
- URL: /admin (owner-only access)
- Features: Overview, Users, Transactions, Feature Controls, PDF Templates

## Stripe
- Publishable Key: pk_test_51Sgsqa4GoxwhVGQ6OJnzVeqYKGfgeGTAGbgXk3LhgN6H9OldqLtIwBFc6j3Etj1zgmyZ2CCpP4cI1PQepGO8JMBr00tfKQgOVf
- Secret Key: sk_test_51Sgsqa4GoxwhVGQ6... (stored in backend/.env)
- Payment methods: Card, BACS Direct Debit, Google Pay

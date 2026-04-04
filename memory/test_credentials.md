# Test Credentials

## Email/Password Auth
- **Standard Test User**: Sign up via the UI (any email/password, min 6 chars)
- **Owner Account**: Use email `rgvlimited@gmail.com` (or set `owner@realtouch.com`) — triggers `is_owner: True` with unlimited access

## Google OAuth
- Uses custom Google OAuth (Client ID configured in env)
- Any Google account can authenticate

## Backend API
- Base URL: https://invoice-dashboard-49.preview.emergentagent.com
- Auth: Session cookie (`session_token`) set on login

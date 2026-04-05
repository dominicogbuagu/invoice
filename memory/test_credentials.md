# Test Credentials

## Email/Password Auth
- **Standard Test User**: Sign up via the UI (any email/password, min 6 chars)
- **Owner Account**: Use email `rgvlimited@gmail.com` — triggers `is_owner: True` with unlimited access
- **Existing User**: `visitsombeauty@gmail.com` / `testpassword123` (Sombeauty London Ltd)

## Google OAuth
- Uses custom Google OAuth (Client ID: 142683158913-...)
- Requires Authorized JavaScript Origins in Google Cloud Console
- Any Google account can authenticate

## Backend API
- Base URL: https://invoice-dashboard-49.preview.emergentagent.com
- Auth: Bearer token via `Authorization: Bearer <session_token>` header
- Session token stored in localStorage after login

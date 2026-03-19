# OAuth2 Implementation Guide - DependoZoho

## Overview

The application now supports **two authentication methods**:

1. **Direct Token Authentication** - Manually provide OAuth token
2. **OAuth2 Authorization Code Flow** - Get token directly from Zoho Accounts

---

## OAuth2 Authorization Code Flow (Recommended)

### What is OAuth2?

OAuth2 is a secure authorization protocol that allows users to grant applications access to their Zoho account without sharing passwords.

**Benefits:**
- More secure (tokens have expiration dates)
- Can be refreshed without user interaction
- Complies with OAuth2 standards
- Better audit trail

---

## Step-by-Step OAuth2 Authentication

### Prerequisites

Before you can use OAuth2, you need:

1. **Zoho Developer Account** - Create at https://developer.zoho.com
2. **Registered OAuth Application** with:
   - Client ID
   - Client Secret
   - Redirect URI (e.g., `http://localhost:5173`)

---

### Step 1: Register Your Application with Zoho

1. Go to [Zoho Developer Console](https://developer.zoho.com)
2. Create a new OAuth application:
   - Name: "DependoZoho" (or your app name)
   - Client type: "Web-based"
   - Redirect URI: `http://localhost:5173` (or your frontend URL)

3. Save your credentials:
   - **Client ID** (public)
   - **Client Secret** (keep secure!)
   - **Redirect URI** (must match exactly)

4. Define scopes needed:
   ```
   Desk.tickets.ALL
   Desk.contacts.ALL
   Desk.accounts.ALL
   Desk.departments.ALL
   ```

---

### Step 2: Get Authorization Code (In the App)

In the DependoZoho application:

1. Go to **"Step 1: Zoho Authentication"**
2. Click the **"OAuth Flow"** tab
3. Expand **"Step 1: Get Authorization Code"**
4. Enter:
   - **Client ID** - From Zoho Developer Console
   - **Redirect URI** - Must match exactly (default: `http://localhost:5173`)
   - **Domain** - Choose your Zoho region (US, EU, India, etc.)

5. Click **"🔗 Open Authorization URL"** button

---

### Step 3: Authorize the Application

In the browser that opens:

1. Log in with your Zoho account credentials
2. Review the permissions requested
3. Click **"Authorize"** to grant access
4. You'll be redirected back with the authorization code in the URL

The URL will look like:
```
http://localhost:5173?code=ABC123XYZ...&state=security_token
```

Copy the **`code=ABC123XYZ...`** part

---

### Step 4: Exchange Code for Access Token

Back in the app:

1. Still in **OAuth Flow** tab
2. Expand **"Step 2: Exchange Code for Token"**
3. Paste the authorization code you copied
4. Enter your **Client Secret**
5. Click **"🔄 Exchange Code for Token"**

**Success:** You'll see a message with your access token

---

### Step 5: Complete Authentication

1. Go to **"Direct Token"** tab
2. You'll see the access token is already filled in
3. Enter your **Org ID** (find in Zoho Desk Settings → General)
4. Domain is already set
5. Click **"Authenticate"**

✅ **You're now authenticated!**

---

## Direct Token Authentication

If you already have an access token:

1. Go to **"Step 1: Zoho Authentication"**
2. Click **"Direct Token"** tab
3. Enter:
   - **Org ID** - From Zoho Desk Settings
   - **Access Token** - Your OAuth token
   - **Domain** - Your Zoho region

4. Click **"Authenticate"**

---

## Getting Your Org ID

Your Org ID is required for all API calls.

**To find it:**

1. Log in to [Zoho Desk](https://desk.zoho.com)
2. Go to **Settings → General**
3. Look for **"Organization ID"** or **"Org ID"**
4. Copy this value

---

## Zoho Domains

Choose the correct domain for your Zoho account:

| Region | Domain | URL |
|--------|--------|-----|
| United States | **com** | https://accounts.zoho.com |
| Europe | **eu** | https://accounts.zoho.eu |
| India | **in** | https://accounts.zoho.in |
| Australia | **au** | https://accounts.zoho.au |
| China | **cn** | https://accounts.zoho.cn |
| Saudi Arabia | **sa** | https://accounts.zoho.sa |

---

## OAuth2 Endpoint Reference

### 1. Get Authorization Code

```
GET https://accounts.zoho.{domain}/oauth/v2/auth?
  scope=Desk.tickets.ALL&
  client_id={YOUR_CLIENT_ID}&
  response_type=code&
  redirect_uri={YOUR_REDIRECT_URI}&
  state=security_token
```

**Parameters:**
- `scope` - Permissions requested (space-separated if multiple)
- `client_id` - From Zoho Developer Console
- `response_type` - Always "code"
- `redirect_uri` - Must match registered value (URL-encoded)
- `state` - CSRF protection (any value)

**Response:**
```
{redirect_uri}?code=ABC123XYZ&state=security_token
```

---

### 2. Exchange Code for Token

**Backend Endpoint:**
```
POST /auth/exchange-token
```

**Request:**
```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "redirectUri": "http://localhost:5173",
  "domain": "com"
}
```

**Response:**
```json
{
  "access_token": "abc123xyz...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_abc123...",
  "api_domain": "https://desk.zoho.com"
}
```

---

### 3. Authenticate with Token

**Endpoint:**
```
POST /auth
```

**Request:**
```json
{
  "orgId": "YOUR_ORG_ID",
  "accessToken": "abc123xyz...",
  "domain": "com"
}
```

**Response:**
```json
{
  "message": "✓ Authenticated successfully!",
  "status": "authenticated",
  "domain": "com",
  "orgId": "YOUR_ORG_ID"
}
```

---

### 4. Check Auth Status

**Endpoint:**
```
GET /auth/status
```

**Response:**
```json
{
  "authenticated": true,
  "status": "✓ Authenticated",
  "orgId": "YOUR_ORG_ID",
  "domain": "com"
}
```

---

### 5. Refresh Token

**Endpoint:**
```
POST /auth/refresh-token?
  refreshToken={TOKEN}&
  clientId={CLIENT_ID}&
  clientSecret={CLIENT_SECRET}&
  domain=com
```

**Response:**
```json
{
  "message": "✓ Token refreshed successfully",
  "access_token": "new_token_xyz...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## Token Management

### Access Token Lifespan

- **Validity:** Typically 1 hour (3600 seconds)
- **Storage:** Kept in backend memory (session-based)
- **Expiration:** May occur during long operations

### Refresh Token

- **Purpose:** Get new access tokens without re-authentication
- **Validity:** Typically long-lived (days/months)
- **Storage:** Keep secure on backend
- **Usage:** When access token expires

### Implementation in Frontend

The frontend handles token exchange automatically:

```javascript
// OAuth Code Exchange
const response = await exchangeOAuthCode({
  clientId: "YOUR_ID",
  clientSecret: "YOUR_SECRET",
  code: authorizationCode,
  redirectUri: "http://localhost:5173",
  domain: "com"
})

// Access token is returned
const accessToken = response.data.access_token

// Complete authentication
await authenticate(orgId, accessToken, "com")
```

---

## Security Best Practices

### ✅ DO

- Store Client Secret securely (env variables, vault)
- Use HTTPS in production (not HTTP)
- Validate `state` parameter to prevent CSRF attacks
- Implement token refresh before expiration
- Use short-lived access tokens
- Audit access token usage

### ❌ DON'T

- Commit secrets to version control
- Expose Client Secret in frontend code
- Use hardcoded credentials
- Reuse authorization codes
- Store tokens in localStorage (use httpOnly cookies)
- Trust unvalidated redirects

---

## Troubleshooting

### Issue: "Invalid client_id"

**Solution:** Verify Client ID from Zoho Developer Console

### Issue: "Invalid redirect_uri"

**Solution:** Redirect URI must match exactly (including http/https)

### Issue: "Scope not allowed"

**Solution:** Ensure scopes are defined in Zoho app settings:
- Go to Developer Console
- Edit OAuth app
- Add required scopes

### Issue: "Authorization code expired"

**Solution:** Authorization codes expire after ~10 minutes. Get a new one.

### Issue: "Token invalid or expired"

**Solutions:**
1. Refresh token using `/auth/refresh-token`
2. Re-authenticate with new authorization code
3. Check if domain is correct

### Issue: Backend can't reach Zoho Accounts

**Solution:** Check:
- Network connectivity
- Firewall rules
- Proxy settings
- Domain spelling (com vs eu vs in)

---

## API Scopes Reference

Available scopes for Zoho Desk:

```
Desk.tickets.ALL        - Full access to tickets
Desk.contacts.ALL       - Full access to contacts
Desk.accounts.ALL       - Full access to accounts
Desk.departments.ALL    - Full access to departments
Desk.layouts.ALL        - Full access to layouts
Desk.settings.ALL       - Full access to settings
Desk.search.READ        - Search functionality
Desk.basic.READ         - Basic read access
```

---

## Complete Example Workflow

### Frontend Component Integration

```javascript
// Step 1: User clicks "Open Authorization URL"
const authUrl = getAuthorizationUrl()
window.open(authUrl, "_blank")

// Step 2: User authorizes and gets code from URL
// (User pastes code in app)

// Step 3: Exchange code for token
const tokenResponse = await exchangeOAuthCode({
  clientId: state.clientId,
  clientSecret: state.clientSecret,
  code: state.authCode,
  redirectUri: state.redirectUri,
  domain: state.domain
})

const { access_token } = tokenResponse.data

// Step 4: Complete authentication
const authResponse = await authenticate(
  orgId,
  access_token,
  domain
)

// Step 5: Use authenticated API
const departments = await fetchDepartments()
```

---

## Advanced: Custom OAuth Implementation

If you need custom OAuth handling:

### Backend (FastAPI)

```python
@app.post("/custom-oauth")
def custom_oauth(request: OAuthCustomRequest):
    # Your custom OAuth logic
    pass
```

### Frontend (React)

```javascript
const [tokens, setTokens] = useState({
  accessToken: null,
  refreshToken: null,
  expiresAt: null
})

useEffect(() => {
  // Check if token is about to expire
  if (tokens.expiresAt && Date.now() > tokens.expiresAt - 300000) {
    refreshToken()
  }
}, [tokens])
```

---

## References

- [Zoho Accounts OAuth Documentation](https://www.zoho.com/accounts/protocol/oauth/authorize.html)
- [Zoho Desk API Documentation](https://desk.zoho.com/api/v1/)
- [OAuth2 RFC 6749](https://tools.ietf.org/html/rfc6749)

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Zoho API documentation
3. Check browser console for error messages
4. Verify all credentials and domains

---

**Last Updated:** 2024  
**Status:** Production Ready

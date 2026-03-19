# OAuth2 Quick Start - DependoZoho

## 30-Second Overview

**OAuth2 Authorization Code Flow = Safe token generation**

1. ✅ Register app in Zoho Developer Console (get Client ID & Secret)
2. ✅ Click "Open Authorization URL" in app
3. ✅ Grant permission in Zoho (get Authorization Code)
4. ✅ Exchange code for Access Token
5. ✅ Complete authentication in app

**Done!** App now authenticated with Zoho Desk.

---

## Prerequisites Checklist

- [ ] Zoho Developer Account (free at https://developer.zoho.com)
- [ ] OAuth Application registered with:
  - [ ] Client ID (copy-paste ready)
  - [ ] Client Secret (keep secure)
  - [ ] Redirect URI: `http://localhost:5173`
- [ ] Your Zoho Org ID (from Desk Settings → General)
- [ ] Choose your Zoho domain (US/EU/India/etc)

---

## Authentication Flow (Step-by-Step)

### In Your Browser

1. **Zoho Developer Console** (https://developer.zoho.com)
   - Create OAuth app
   - Copy: Client ID, Client Secret
   - Set Redirect URI: `http://localhost:5173`

### In DependoZoho App

2. **Step 1: Get Authorization Code**
   - Tab: "OAuth Flow"
   - Section: "Step 1: Get Authorization Code"
   - Paste: Client ID
   - Paste: Redirect URI
   - Select: Your Zoho Domain
   - Click: "🔗 Open Authorization URL"

3. **In Browser (Zoho)** - Zoho will ask you to authorize
   - Log in with your Zoho account
   - Click "Authorize"
   - You'll get redirected with `code=ABC123...` in URL
   - Copy the code

4. **Back in App: Exchange Code**
   - Section: "Step 2: Exchange Code for Token"
   - Paste: Authorization Code
   - Paste: Client Secret
   - Click: "🔄 Exchange Code for Token"
   - ✅ Get Access Token!

5. **Complete Authentication**
   - Click: "Go to Direct Auth & Complete"
   - OR go to "Direct Token" tab
   - Paste: Access Token (auto-filled)
   - Paste: Org ID (from Zoho Desk Settings)
   - Click: "Authenticate"

✅ **Done!** You're now authenticated.

---

## Finding Your Information

### Client ID & Secret
- Go to: https://developer.zoho.com
- Your Apps → Select DependoZoho
- Client ID is visible
- Client Secret (click to reveal)

### Org ID
- Log in to: https://desk.zoho.com
- Settings → General
- Find "Organization ID"
- Copy it

### Redirect URI
- For local testing: `http://localhost:5173`
- For production: `https://yourdomain.com`
- Must match exactly (including http/https)

### Zoho Domain
- Check your Desk URL:
  - `desk.zoho.com` → **com** (US)
  - `desk.zoho.eu` → **eu** (Europe)
  - `desk.zoho.in` → **in** (India)
  - `desk.zoho.au` → **au** (Australia)

---

## API Endpoints

### Exchange Authorization Code
```
POST /auth/exchange-token
{
  "clientId": "...",
  "clientSecret": "...",
  "code": "...",
  "redirectUri": "...",
  "domain": "com"
}
```

### Authenticate with Token
```
POST /auth
{
  "orgId": "...",
  "accessToken": "...",
  "domain": "com"
}
```

### Check Status
```
GET /auth/status
```

### Logout
```
POST /auth/logout
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Invalid client_id" | Copy Client ID correctly from Developer Console |
| "redirect_uri mismatch" | Must match EXACTLY (case-sensitive, http/https) |
| "Invalid authorization code" | Code expires after ~10 minutes, get a new one |
| "Invalid access token" | Token may have expired, exchange new code |
| "Org ID not found" | Check Zoho Desk Settings → General |
| Can't open Zoho URL | Check firewall/network, try different browser |

---

## Token Lifetime

| Token | Valid For | What To Do |
|-------|-----------|-----------|
| Authorization Code | ~10 minutes | Exchange immediately for access token |
| Access Token | ~1 hour | Refresh using refresh_token before expiry |
| Refresh Token | 6 months+ | Keep secure, use to get new access tokens |

---

## Direct Token Method (Alternative)

Already have an access token? Skip the OAuth flow:

1. Go to "Step 1: Zoho Authentication"
2. Tab: "Direct Token"
3. Paste:
   - Org ID
   - Access Token
   - Select Domain
4. Click "Authenticate"

---

## After Authentication

You can now:
✅ View Departments (Step 2)
✅ Select Layouts (Step 3)
✅ Map Fields (Step 4)
✅ Upload Excel (Step 5)

---

## Security Notes

🔐 **Client Secret** - Keep this private!
- Never share in chat/emails
- Never commit to GitHub
- Never expose in frontend

🔐 **Access Token** - Temporary & limited
- Expires in ~1 hour
- Gets a new scope (limited permissions)
- Much safer than password

🔐 **Redirect URI** - Must be trusted
- Only you control `localhost:5173`
- In production, use your real domain
- Prevents malicious code interception

---

## Still Need Help?

1. **Zoho OAuth Docs**: https://www.zoho.com/accounts/protocol/oauth/authorize.html
2. **Zoho Desk API**: https://desk.zoho.com/api/v1/
3. **This App Docs**: See `OAUTH_IMPLEMENTATION_GUIDE.md`

---

**Status**: Ready to use  
**Last Updated**: 2024

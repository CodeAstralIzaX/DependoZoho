# app/main.py - FastAPI for Zoho Dependency Mapping Tool
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import requests
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html

from app import upload
from app.config import CREDENTIALS, get_zoho_base_url, DEFAULT_ZOHO_DOMAIN, ZOHO_DOMAINS

# =====================================================
# FastAPI app
# =====================================================
app = FastAPI(
    title="Zoho Dependency Mapping API",
    version="PI - 0.1.2",
    description="Developed by Prem IzaX",
    contact={"name": "Prem IzaX", "url": "https://instagram.com/_izax._.prem_"}
)

# =====================================================
# CORS Middleware
# =====================================================
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://dependozoho-frontend.onrender.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# =====================================================
# OpenAPI override
# =====================================================
@app.get("/openapi.json", include_in_schema=False)
async def custom_openapi():
    openapi_data: Dict[str, Any] = app.openapi()
    openapi_data.pop("openapi", None)
    return JSONResponse(content=openapi_data)

# =====================================================
# Zoho headers helper
# =====================================================
def get_zoho_headers():
    """Get Zoho API headers with validation"""
    try:
        if not CREDENTIALS["orgId"] or not CREDENTIALS["accessToken"]:
            raise HTTPException(
                status_code=400,
                detail="Zoho credentials not configured. Use /auth endpoint first."
            )
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        return {
            "orgId": CREDENTIALS["orgId"],
            "Authorization": f"Zoho-oauthtoken {CREDENTIALS['accessToken']}",
            "Content-Type": "application/json",
            "BASE_URL": zoho_base_url
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error preparing API headers: {str(e)}"
        )

# =====================================================
# Token validation helper
# =====================================================
def validate_token(orgId: str, accessToken: str, domain: str):
    """Validate OAuth token by making a test API call"""
    if not orgId or not accessToken:
        raise HTTPException(
            status_code=400,
            detail="Org ID and access token are required"
        )
    
    try:
        zoho_base_url = get_zoho_base_url(domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    headers = {
        "orgId": orgId,
        "Authorization": f"Zoho-oauthtoken {accessToken}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(
            f"{zoho_base_url}/users", 
            headers=headers, 
            timeout=10
        )
        if response.status_code == 401:
            raise HTTPException(
                status_code=401, 
                detail="OAuth Token is invalid or expired."
            )
        elif response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API error: {response.text}"
            )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Timeout connecting to Zoho. Please try again."
        )
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Unable to connect to Zoho. Please check your internet connection."
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error connecting to Zoho for token validation: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during token validation: {str(e)}"
        )

# =====================================================
# Auth Endpoints - OAuth2 Token Management
# =====================================================

class AuthRequest(BaseModel):
    """Direct OAuth token authentication"""
    orgId: str
    accessToken: str
    domain: Optional[str] = None

class OAuthTokenRequest(BaseModel):
    """OAuth authorization code exchange"""
    clientId: str
    clientSecret: str
    code: str
    redirectUri: str
    domain: Optional[str] = None

@app.post("/auth")
def set_credentials(auth: AuthRequest):
    """
    Authenticate and store Zoho OAuth credentials.
    
    This endpoint accepts an OAuth access token obtained from Zoho Accounts.
    
    Steps to get the token:
    1. Go to: https://accounts.zoho.{domain}/oauth/v2/auth
    2. Parameters:
       - scope=Desk.tickets.ALL
       - client_id={YOUR_CLIENT_ID}
       - response_type=code
       - redirect_uri={YOUR_REDIRECT_URI}
    3. Authorize the application
    4. You'll receive an authorization code
    5. Exchange code for token using /auth/exchange-token
    6. Or directly provide an access token here
    """
    try:
        # Validate domain
        domain = auth.domain.lower() if auth.domain else DEFAULT_ZOHO_DOMAIN
        if domain not in ZOHO_DOMAINS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported Zoho domain '{domain}'. Supported: {ZOHO_DOMAINS}"
            )
        
        # Validate credentials format
        if not auth.orgId or not auth.accessToken:
            raise HTTPException(
                status_code=400,
                detail="Org ID and access token are required"
            )
        
        # Test token validity
        validate_token(auth.orgId, auth.accessToken, domain)

        # Store credentials
        CREDENTIALS["orgId"] = auth.orgId
        CREDENTIALS["accessToken"] = auth.accessToken
        CREDENTIALS["domain"] = domain

        return {
            "message": f"✓ Authenticated successfully! Connected to Zoho Desk ({domain.upper()})",
            "domain": domain,
            "orgId": auth.orgId,
            "status": "authenticated"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication failed: {str(e)}"
        )

@app.post("/auth/exchange-token")
def exchange_oauth_code(oauth: OAuthTokenRequest):
    """
    Exchange OAuth authorization code for access token.
    
    This follows the OAuth2 authorization code flow.
    
    Required parameters:
    - clientId: Your Zoho OAuth Client ID
    - clientSecret: Your Zoho OAuth Client Secret
    - code: Authorization code from Zoho Accounts
    - redirectUri: Must match the redirect URI registered with Zoho
    - domain: Zoho domain (com, eu, in, au, cn, sa)
    """
    try:
        domain = oauth.domain.lower() if oauth.domain else DEFAULT_ZOHO_DOMAIN
        if domain not in ZOHO_DOMAINS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported Zoho domain '{domain}'. Supported: {ZOHO_DOMAINS}"
            )
        
        # Validate inputs
        if not oauth.clientId or not oauth.clientSecret or not oauth.code:
            raise HTTPException(
                status_code=400,
                detail="clientId, clientSecret, and code are required"
            )
        
        # Exchange code for token
        token_url = f"https://accounts.zoho.{domain}/oauth/v2/token"
        
        payload = {
            "grant_type": "authorization_code",
            "client_id": oauth.clientId,
            "client_secret": oauth.clientSecret,
            "code": oauth.code,
            "redirect_uri": oauth.redirectUri
        }
        
        response = requests.post(token_url, data=payload, timeout=15)
        
        if response.status_code != 200:
            error_detail = response.json() if response.text else response.text
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Token exchange failed: {error_detail}"
            )
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="No access token in response"
            )
        
        return {
            "message": "✓ Token exchanged successfully",
            "access_token": access_token,
            "token_type": token_data.get("token_type", "Bearer"),
            "expires_in": token_data.get("expires_in"),
            "refresh_token": token_data.get("refresh_token"),
            "api_domain": token_data.get("api_domain"),
            "next_steps": "Use the access_token in /auth endpoint with your Org ID"
        }
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Timeout connecting to Zoho Accounts. Please try again."
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Connection error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token exchange failed: {str(e)}"
        )

@app.post("/auth/refresh-token")
def refresh_access_token(
    refreshToken: str = Query(...),
    clientId: str = Query(...),
    clientSecret: str = Query(...),
    domain: Optional[str] = Query(None)
):
    """
    Refresh an expired OAuth access token.
    
    Use this to get a new access token when the current one expires.
    """
    try:
        domain = domain.lower() if domain else DEFAULT_ZOHO_DOMAIN
        if domain not in ZOHO_DOMAINS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported Zoho domain '{domain}'"
            )
        
        refresh_url = f"https://accounts.zoho.{domain}/oauth/v2/token"
        
        payload = {
            "grant_type": "refresh_token",
            "client_id": clientId,
            "client_secret": clientSecret,
            "refresh_token": refreshToken
        }
        
        response = requests.post(refresh_url, data=payload, timeout=15)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Token refresh failed: {response.json()}"
            )
        
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if access_token:
            # Update stored credentials if Org ID is available
            if CREDENTIALS.get("orgId"):
                CREDENTIALS["accessToken"] = access_token
        
        return {
            "message": "✓ Token refreshed successfully",
            "access_token": access_token,
            "token_type": token_data.get("token_type", "Bearer"),
            "expires_in": token_data.get("expires_in")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token refresh failed: {str(e)}"
        )

@app.get("/auth/status")
def auth_status():
    """Check current authentication status"""
    is_authenticated = bool(CREDENTIALS.get("orgId") and CREDENTIALS.get("accessToken"))
    
    return {
        "authenticated": is_authenticated,
        "status": "✓ Authenticated" if is_authenticated else "✗ Not Authenticated",
        "orgId": CREDENTIALS.get("orgId"),
        "domain": CREDENTIALS.get("domain", DEFAULT_ZOHO_DOMAIN),
        "message": "Credentials are configured and valid" if is_authenticated else "Use /auth endpoint to authenticate"
    }

@app.post("/auth/logout")
def logout():
    """Clear stored credentials"""
    CREDENTIALS["orgId"] = None
    CREDENTIALS["accessToken"] = None
    CREDENTIALS["domain"] = DEFAULT_ZOHO_DOMAIN
    
    return {
        "message": "✓ Logged out successfully",
        "status": "Not Authenticated"
    }

# =====================================================
# OAuth Flow Guide
# =====================================================

@app.get("/auth/guide")
def oauth_guide(domain: str = Query("com")):
    """
    Get step-by-step OAuth authentication guide.
    
    Complete OAuth2 authorization code flow:
    """
    return {
        "title": "Zoho OAuth2 Authentication Guide",
        "domain": domain,
        "steps": [
            {
                "step": 1,
                "title": "Get Authorization Code",
                "url": f"https://accounts.zoho.{domain}/oauth/v2/auth",
                "parameters": {
                    "scope": "Desk.tickets.ALL,Desk.contacts.ALL,Desk.accounts.ALL,Desk.departments.ALL",
                    "client_id": "YOUR_CLIENT_ID",
                    "response_type": "code",
                    "redirect_uri": "YOUR_REDIRECT_URI",
                    "state": "security_token"
                },
                "description": "Navigate to this URL to authorize the application"
            },
            {
                "step": 2,
                "title": "User Authorizes App",
                "description": "User logs into Zoho and grants permission"
            },
            {
                "step": 3,
                "title": "Receive Authorization Code",
                "description": "You'll be redirected with: ?code=YOUR_AUTH_CODE&state=security_token"
            },
            {
                "step": 4,
                "title": "Exchange Code for Token",
                "endpoint": "/auth/exchange-token",
                "method": "POST",
                "body": {
                    "clientId": "YOUR_CLIENT_ID",
                    "clientSecret": "YOUR_CLIENT_SECRET",
                    "code": "AUTHORIZATION_CODE_FROM_STEP_3",
                    "redirectUri": "YOUR_REDIRECT_URI",
                    "domain": domain
                }
            },
            {
                "step": 5,
                "title": "Store Access Token",
                "endpoint": "/auth",
                "method": "POST",
                "body": {
                    "orgId": "YOUR_ORG_ID",
                    "accessToken": "ACCESS_TOKEN_FROM_STEP_4",
                    "domain": domain
                }
            },
            {
                "step": 6,
                "title": "Ready to Use API",
                "description": "All endpoints now work with your Zoho credentials"
            }
        ],
        "useful_links": {
            "zoho_accounts": f"https://accounts.zoho.{domain}",
            "zoho_desk": f"https://desk.zoho.{domain}",
            "api_documentation": "https://desk.zoho.com/api/v1/",
            "oauth_documentation": "https://www.zoho.com/accounts/protocol/oauth/authorize.html"
        },
        "note": "Store your refresh_token securely for token refresh without re-authentication"
    }

# =====================================================
# Custom Swagger UI
# =====================================================
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    swagger_ui = get_swagger_ui_html(openapi_url=app.openapi_url, title=app.title + " - PI")
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      {swagger_ui.body.decode('utf-8').split('<body>')[0]}
    </head>
    <body>
      {swagger_ui.body.decode('utf-8').split('<body>')[1].split('</body>')[0]}
      <footer style="
        text-align:center; 
        padding:10px; 
        background:#f0f0f0; 
        font-size:14px; 
        position: fixed; 
        bottom: 0; 
        width: 100%;">
        Developed by Prem IzaX
      </footer>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# =====================================================
# Health check
# =====================================================
@app.get("/")
def health():
    return {"status": "Zoho Dependency Mapping Tool Running"}

# =====================================================
# Dependency Mapping Endpoints
# =====================================================
@app.get("/mappings")
def list_mappings(layoutId: Optional[str] = Query(None)):
    """List dependency mappings for a layout"""
    try:
        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/dependencyMappings"
        if layoutId and layoutId.strip():
            url += f"?layoutId={layoutId}"
        
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Zoho API error: {response.text}"
            )
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing mappings: {str(e)}")

@app.get("/available-fields")
def available_fields(layoutId: str = Query(...)):
    """Get available fields for dependency mapping"""
    try:
        if not layoutId or not layoutId.strip():
            raise HTTPException(status_code=400, detail="Layout ID is required")
        
        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/availableDependencyMappings?layoutId={layoutId}"
        
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Zoho API error: {response.text}"
            )
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching available fields: {str(e)}")

@app.patch("/mappings/{mapping_id}")
def update_mapping(mapping_id: str, mappings: dict):
    """Update an existing dependency mapping"""
    try:
        if not mapping_id or not mapping_id.strip():
            raise HTTPException(status_code=400, detail="Mapping ID is required")
        if not mappings:
            raise HTTPException(status_code=400, detail="Mappings cannot be empty")
        
        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/dependencyMappings/{mapping_id}"
        
        response = requests.patch(
            url, 
            headers=headers, 
            json={"mappings": mappings},
            timeout=15
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Zoho API error: {response.text}"
            )
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating mapping: {str(e)}")

# =====================================================
# Create dependency mapping
# =====================================================
class MappingRequest(BaseModel):
    layoutId: str
    parentId: str
    childId: str
    mappings: dict

@app.get("/mappings/{mapping_id}")
def get_mapping(mapping_id: str):
    """Get a specific dependency mapping"""
    try:
        if not mapping_id or not mapping_id.strip():
            raise HTTPException(status_code=400, detail="Mapping ID is required")

        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/dependencyMappings/{mapping_id}"

        response = requests.get(url, headers=headers, timeout=15)

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API error: {response.text}"
            )

        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching mapping: {str(e)}")


@app.post("/mappings")
def create_mapping(mapping: MappingRequest):
    """Create a new dependency mapping"""
    try:
        # Validate input
        if not mapping.layoutId or not mapping.layoutId.strip():
            raise HTTPException(status_code=400, detail="Layout ID is required")
        if not mapping.parentId or not mapping.parentId.strip():
            raise HTTPException(status_code=400, detail="Parent ID is required")
        if not mapping.childId or not mapping.childId.strip():
            raise HTTPException(status_code=400, detail="Child ID is required")
        if not mapping.mappings:
            raise HTTPException(status_code=400, detail="Mappings cannot be empty")
        if mapping.parentId == mapping.childId:
            raise HTTPException(status_code=400, detail="Parent and child IDs must be different")

        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/dependencyMappings"
        
        payload = {
            "layoutId": mapping.layoutId,
            "parentId": mapping.parentId,
            "childId": mapping.childId,
            "mappings": mapping.mappings
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        
        if response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Zoho API error: {response.text}"
            )
        
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating mapping: {str(e)}")

@app.delete("/mappings/{mapping_id}")
def delete_mapping(mapping_id: str):
    """Delete a dependency mapping"""
    try:
        if not mapping_id or not mapping_id.strip():
            raise HTTPException(status_code=400, detail="Mapping ID is required")

        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/dependencyMappings/{mapping_id}"
        
        response = requests.delete(url, headers=headers, timeout=15)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Zoho API error: {response.text}"
            )
        
        return {"message": "Dependency Mapping Deleted Successfully", "id": mapping_id}
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting mapping: {str(e)}")

# =====================================================
# ROUTING COMPLETE - See endpoints below for Departments and Layouts
# =====================================================

# =====================================================
# Department Endpoints
# =====================================================

@app.get("/departments")
def list_departments(
    isEnabled: Optional[str] = Query(None),
    limit: int = Query(200),
    from_index: int = Query(0)
):
    """List departments"""
    try:
        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        
        url = f"{zoho_base_url}/departments?limit={limit}&from={from_index}"
        if isEnabled:
            # Convert string "true"/"false" to boolean
            enabled_bool = isEnabled.lower() == 'true'
            url += f"&isEnabled={str(enabled_bool).lower()}"
        
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API error: {response.text}"
            )
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing departments: {str(e)}")

@app.get("/departments/{department_id}")
def get_department(department_id: str):
    """Get a specific department"""
    try:
        if not department_id or not department_id.strip():
            raise HTTPException(status_code=400, detail="Department ID is required")
        
        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/departments/{department_id}"
        
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API error: {response.text}"
            )
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching department: {str(e)}")

# =====================================================
# Layout Endpoints
# =====================================================

@app.get("/layouts")
def list_layouts(
    module: str = Query("tickets"),
    departmentId: Optional[str] = Query(None),
    status: str = Query("active"),
    limit: int = Query(200),
    from_index: int = Query(0)
):
    """List layouts for a module"""
    try:
        if not module or not module.strip():
            raise HTTPException(status_code=400, detail="Module is required")
        
        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        
        url = f"{zoho_base_url}/layouts?module={module}&status={status}&limit={limit}&from={from_index}"
        if departmentId:
            url += f"&departmentId={departmentId}"
        
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API error: {response.text}"
            )
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing layouts: {str(e)}")

@app.get("/layouts/{layout_id}")
def get_layout(layout_id: str):
    """Get a specific layout with all fields"""
    try:
        if not layout_id or not layout_id.strip():
            raise HTTPException(status_code=400, detail="Layout ID is required")
        
        headers = get_zoho_headers()
        zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
        url = f"{zoho_base_url}/layouts/{layout_id}"
        
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API error: {response.text}"
            )
        return response.json()
    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Request timeout. Please try again.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Connection error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching layout: {str(e)}")

# =====================================================
# Include Excel upload router
# =====================================================
app.include_router(upload.router, prefix="/dependency", tags=["Excel Upload"])
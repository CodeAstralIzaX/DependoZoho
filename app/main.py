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
    "http://127.0.0.1:5173"
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

# =====================================================
# Token validation helper
# =====================================================
def validate_token(orgId: str, accessToken: str, domain: str):
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
        response = requests.get(f"{zoho_base_url}/users", headers=headers, timeout=10)
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="OAuth Token is invalid or expired.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to Zoho for token validation: {str(e)}")

# =====================================================
# Auth Endpoints
# =====================================================
class AuthRequest(BaseModel):
    orgId: str
    accessToken: str
    domain: Optional[str] = None

@app.post("/auth")
def set_credentials(auth: AuthRequest):
    domain = auth.domain.lower() if auth.domain else DEFAULT_ZOHO_DOMAIN
    if domain not in ZOHO_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported Zoho domain '{domain}'. Supported: {ZOHO_DOMAINS}"
        )

    validate_token(auth.orgId, auth.accessToken, domain)

    CREDENTIALS["orgId"] = auth.orgId
    CREDENTIALS["accessToken"] = auth.accessToken
    CREDENTIALS["domain"] = domain

    return {"message": f"Credentials stored successfully for Zoho domain '{domain}'. Token is valid."}

@app.get("/auth/status")
def auth_status():
    return {
        "status": "Credentials configured" if CREDENTIALS["orgId"] else "Credentials NOT configured",
        "domain": CREDENTIALS.get("domain")
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
    headers = get_zoho_headers()
    zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
    url = f"{zoho_base_url}/dependencyMappings"
    if layoutId:
        url += f"?layoutId={layoutId}"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

@app.get("/available-fields")
def available_fields(layoutId: str = Query(...)):
    headers = get_zoho_headers()
    zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
    url = f"{zoho_base_url}/availableDependencyMappings?layoutId={layoutId}"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

@app.patch("/mappings/{mapping_id}")
def update_mapping(mapping_id: str, mappings: dict):
    headers = get_zoho_headers()
    zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
    url = f"{zoho_base_url}/dependencyMappings/{mapping_id}"
    response = requests.patch(url, headers=headers, json={"mappings": mappings})
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

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

    headers = get_zoho_headers()
    zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))

    url = f"{zoho_base_url}/dependencyMappings/{mapping_id}"

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    return response.json()


@app.post("/mappings")
def create_mapping(mapping: MappingRequest):
    headers = get_zoho_headers()
    zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
    url = f"{zoho_base_url}/dependencyMappings"
    payload = {
        "layoutId": mapping.layoutId,
        "parentId": mapping.parentId,
        "childId": mapping.childId,
        "mappings": mapping.mappings
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

@app.delete("/mappings/{mapping_id}")
def delete_mapping(mapping_id: str):
    headers = get_zoho_headers()
    zoho_base_url = get_zoho_base_url(CREDENTIALS.get("domain"))
    url = f"{zoho_base_url}/dependencyMappings/{mapping_id}"
    response = requests.delete(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return {"message": "Dependency Mapping Deleted Successfully"}

# =====================================================
# Include Excel upload router
# =====================================================
app.include_router(upload.router, prefix="/dependency", tags=["Excel Upload"])
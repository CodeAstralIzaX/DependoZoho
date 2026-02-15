from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import requests
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse

from app import upload
from app.config import CREDENTIALS, ZOHO_BASE_URL

app = FastAPI(title="Zoho Dependency Mapping Tool")


# =====================================================
# Zoho headers helper
# =====================================================
def get_zoho_headers():
    if not CREDENTIALS["orgId"] or not CREDENTIALS["accessToken"]:
        raise HTTPException(
            status_code=400,
            detail="Zoho credentials not configured. Use /auth endpoint first."
        )
    return {
        "orgId": CREDENTIALS["orgId"],
        "Authorization": f"Zoho-oauthtoken {CREDENTIALS['accessToken']}",
        "Content-Type": "application/json"
    }


def validate_token(orgId: str, accessToken: str):
    """
    Validate Zoho OAuth token immediately by calling a minimal Zoho endpoint.
    Raises HTTPException if invalid or expired.
    """
    headers = {
        "orgId": orgId,
        "Authorization": f"Zoho-oauthtoken {accessToken}",
        "Content-Type": "application/json"
    }
    try:
        response = requests.get(f"{ZOHO_BASE_URL}/users", headers=headers, timeout=10)
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


@app.post("/auth")
def set_credentials(auth: AuthRequest):
    # Validate token before storing
    validate_token(auth.orgId, auth.accessToken)

    # Store credentials only if token is valid
    CREDENTIALS["orgId"] = auth.orgId
    CREDENTIALS["accessToken"] = auth.accessToken
    return {"message": "Credentials stored successfully. Token is valid and will work until it expires."}


@app.get("/auth/status")
def auth_status():
    return {"status": "Credentials configured" if CREDENTIALS["orgId"] else "Credentials NOT configured"}


# =====================================================
# Custom Swagger UI with footer
# =====================================================
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    swagger_ui = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI"
    )
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
        Developed with ❤️ by Prem
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
# Dependency Mappings Endpoints
# =====================================================
@app.get("/mappings")
def list_mappings(layoutId: Optional[str] = Query(None)):
    headers = get_zoho_headers()
    url = f"{ZOHO_BASE_URL}/dependencyMappings"
    if layoutId:
        url += f"?layoutId={layoutId}"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.get("/available-fields")
def available_fields(layoutId: str = Query(...)):
    headers = get_zoho_headers()
    url = f"{ZOHO_BASE_URL}/availableDependencyMappings?layoutId={layoutId}"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.patch("/mappings/{mapping_id}")
def update_mapping(mapping_id: str, mappings: dict):
    headers = get_zoho_headers()
    url = f"{ZOHO_BASE_URL}/dependencyMappings/{mapping_id}"
    response = requests.patch(url, headers=headers, json={"mappings": mappings})
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()


@app.delete("/mappings/{mapping_id}")
def delete_mapping(mapping_id: str):
    headers = get_zoho_headers()
    url = f"{ZOHO_BASE_URL}/dependencyMappings/{mapping_id}"
    response = requests.delete(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return {"message": "Dependency Mapping Deleted Successfully"}


# =====================================================
# Include Excel-only upload router
# =====================================================
app.include_router(upload.router, prefix="/dependency", tags=["Excel Upload"])

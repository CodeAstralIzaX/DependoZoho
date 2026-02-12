from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
import pandas as pd
import requests
import time
from io import BytesIO
from typing import Optional

app = FastAPI(title="Field Dependence Mapping Tool")

# =====================================================
# GLOBAL VARIABLES
# =====================================================
ZOHO_ORG_ID: Optional[str] = None
OAUTH_CLIENT_ID: Optional[str] = None
OAUTH_CLIENT_SECRET: Optional[str] = None
REDIRECT_URI: Optional[str] = None
REFRESH_TOKEN: Optional[str] = None
TOKENS = {}  # {"access_token": str, "expires_at": float, "authorization_code": str}

# =====================================================
# HELPER FUNCTION TO GET ACCESS TOKEN
# =====================================================
def get_access_token():
    if not TOKENS.get("access_token") or time.time() > TOKENS.get("expires_at", 0):
        if REFRESH_TOKEN:
            # Use refresh token to get a new access token
            token_url = "https://accounts.zoho.com/oauth/v2/token"
            params = {
                "refresh_token": REFRESH_TOKEN,
                "client_id": OAUTH_CLIENT_ID,
                "client_secret": OAUTH_CLIENT_SECRET,
                "grant_type": "refresh_token"
            }
            r = requests.post(token_url, params=params)
            if r.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Failed to get access token: {r.text}")
            data = r.json()
            TOKENS["access_token"] = data["access_token"]
            TOKENS["expires_at"] = time.time() + data["expires_in"] - 60
        else:
            raise HTTPException(status_code=400, detail="No refresh token available, generate tokens first")
    return TOKENS["access_token"]

def get_headers():
    token = get_access_token()
    return {
        "orgId": ZOHO_ORG_ID,
        "Authorization": f"Zoho-oauthtoken {token}",
        "Content-Type": "application/json"
    }

# =====================================================
# CUSTOM SWAGGER UI WITH FOOTER
# =====================================================
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    swagger_ui = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI"
    )
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
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
        width: 100%;
      ">
        Developed with ❤️ by Prem
      </footer>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

# =====================================================
# SET CREDENTIALS FORM (Org + Client Info)
# =====================================================
@app.get("/set_credentials", include_in_schema=False)
def set_credentials_form():
    html_content = """
    <html>
      <body>
        <h2>Enter Zoho Credentials</h2>
        <form action="/set_credentials" method="post">
          <label>Org ID:</label>
          <input type="text" name="org_id" required><br><br>
          <label>Client ID:</label>
          <input type="text" name="client_id" required><br><br>
          <label>Client Secret:</label>
          <input type="text" name="client_secret" required><br><br>
          <label>Redirect URI:</label>
          <input type="text" name="redirect_uri" required><br><br>
          <input type="submit" value="Submit">
        </form>
      </body>
    </html>
    """
    return HTMLResponse(content=html_content)

@app.post("/set_credentials")
def set_credentials(
    org_id: str = Form(...),
    client_id: str = Form(...),
    client_secret: str = Form(...),
    redirect_uri: str = Form(...)
):
    global ZOHO_ORG_ID, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, REDIRECT_URI
    ZOHO_ORG_ID = org_id
    OAUTH_CLIENT_ID = client_id
    OAUTH_CLIENT_SECRET = client_secret
    REDIRECT_URI = redirect_uri

    # Provide a link to start OAuth Authorization
    auth_url = (
        f"https://accounts.zoho.com/oauth/v2/auth"
        f"?scope=Desk.tickets.READ,Desk.basic.READ&client_id={client_id}"
        f"&response_type=code&redirect_uri={redirect_uri}&access_type=offline"
    )
    return HTMLResponse(f"""
    <html>
      <body>
        <h2>Credentials Saved!</h2>
        <p>Click the link below to authorize and generate tokens:</p>
        <a href="{auth_url}" target="_blank">Authorize Zoho</a>
      </body>
    </html>
    """)

# =====================================================
# OAUTH CALLBACK
# =====================================================
@app.get("/oauth_callback")
def oauth_callback(request: Request, code: Optional[str] = None, error: Optional[str] = None):
    global REFRESH_TOKEN, TOKENS
    if error:
        return {"error": error}
    if not code:
        return {"error": "Authorization code not received"}

    # Exchange authorization code for tokens
    token_url = "https://accounts.zoho.com/oauth/v2/token"
    params = {
        "code": code,
        "client_id": OAUTH_CLIENT_ID,
        "client_secret": OAUTH_CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    r = requests.post(token_url, params=params)
    if r.status_code != 200:
        return {"error": "Failed to get tokens", "details": r.text}

    data = r.json()
    TOKENS["access_token"] = data["access_token"]
    TOKENS["expires_at"] = time.time() + data["expires_in"] - 60
    REFRESH_TOKEN = data.get("refresh_token")

    return HTMLResponse(f"""
    <html>
      <body>
        <h2>Tokens Generated Successfully!</h2>
        <p>Access Token: {TOKENS['access_token']}</p>
        <p>Refresh Token: {REFRESH_TOKEN}</p>
        <p>You can now use the app endpoints with these tokens.</p>
      </body>
    </html>
    """)

# =====================================================
# HEALTH CHECK
# =====================================================
@app.get("/")
def health():
    return {"status": "Zoho Dependency Mapping Tool Running"}

# =====================================================
# LIST EXISTING DEPENDENCY MAPPINGS
# =====================================================
@app.get("/mappings")
def list_mappings(layoutId: Optional[str] = Query(None)):
    url = "https://desk.zoho.com/api/v1/dependencyMappings"
    if layoutId:
        url += f"?layoutId={layoutId}"
    response = requests.get(url, headers=get_headers())
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

# =====================================================
# GET AVAILABLE PARENT/CHILD FIELDS
# =====================================================
@app.get("/available-fields")
def available_fields(layoutId: str = Query(...)):
    url = f"https://desk.zoho.com/api/v1/availableDependencyMappings?layoutId={layoutId}"
    response = requests.get(url, headers=get_headers())
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

# =====================================================
# CREATE DEPENDENCY MAPPING (Excel or JSON)
# =====================================================
@app.post("/upload")
async def upload_dependency(
    layoutId: str = Query(...),
    parentId: Optional[str] = Query(None),
    childId: Optional[str] = Query(None),
    file: Optional[UploadFile] = File(None),
    json_data: Optional[str] = Form(None),
):
    dependency_map = {}

    # ---------- Parse JSON ----------
    if json_data:
        import json as js
        try:
            dependency_map = js.loads(json_data)
            if not isinstance(dependency_map, dict):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="json_data must be a valid JSON object")
        if not parentId:
            parentId = "Parent"
        if not childId:
            childId = "Child"

    # ---------- Parse Excel ----------
    elif file:
        try:
            contents = await file.read()
            df = pd.read_excel(BytesIO(contents))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Excel file")

        if df.shape[1] < 2:
            raise HTTPException(status_code=400, detail="Excel must have at least two columns for parent/child")

        parent_column = df.columns[0] if not parentId else parentId
        child_column = df.columns[1] if not childId else childId

        for _, row in df.iterrows():
            parent_value = str(row[parent_column]).strip()
            child_value = str(row[child_column]).strip()
            if parent_value not in dependency_map:
                dependency_map[parent_value] = []
            if child_value not in dependency_map[parent_value]:
                dependency_map[parent_value].append(child_value)

        if not parentId:
            parentId = parent_column
        if not childId:
            childId = child_column
    else:
        raise HTTPException(status_code=400, detail="Provide either Excel file or JSON data")

    if not dependency_map:
        raise HTTPException(status_code=400, detail="No mappings found in input")

    payload = {
        "layoutId": layoutId,
        "parentId": parentId,
        "childId": childId,
        "mappings": dependency_map
    }

    response = requests.post("https://desk.zoho.com/api/v1/dependencyMappings", headers=get_headers(), json=payload)
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return {
        "message": "Dependency Mapping Created Successfully",
        "zoho_response": response.json()
    }

# =====================================================
# UPDATE DEPENDENCY MAPPING
# =====================================================
@app.patch("/mappings/{mapping_id}")
def update_mapping(mapping_id: str, mappings: dict):
    url = f"https://desk.zoho.com/api/v1/dependencyMappings/{mapping_id}"
    response = requests.patch(url, headers=get_headers(), json={"mappings": mappings})
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

# =====================================================
# DELETE DEPENDENCY MAPPING
# =====================================================
@app.delete("/mappings/{mapping_id}")
def delete_mapping(mapping_id: str):
    url = f"https://desk.zoho.com/api/v1/dependencyMappings/{mapping_id}"
    response = requests.delete(url, headers=get_headers())
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return {"message": "Dependency Mapping Deleted Successfully"}

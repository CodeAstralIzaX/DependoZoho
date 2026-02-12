from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form
import pandas as pd
import requests
import os
import json
from io import BytesIO
from typing import Optional
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse

app = FastAPI(title="Zoho Dependency Mapping Tool")

# =====================================================
# CONFIGURATION
# =====================================================

ZOHO_BASE_URL = "https://desk.zoho.com/api/v1"
ZOHO_ORG_ID = os.getenv("ZOHO_ORG_ID")
ZOHO_ACCESS_TOKEN = os.getenv("ZOHO_ACCESS_TOKEN")

if not ZOHO_ORG_ID or not ZOHO_ACCESS_TOKEN:
    raise Exception(
        "Environment variables ZOHO_ORG_ID and ZOHO_ACCESS_TOKEN must be set."
    )

HEADERS = {
    "orgId": ZOHO_ORG_ID,
    "Authorization": f"Zoho-oauthtoken {ZOHO_ACCESS_TOKEN}",
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
    url = f"{ZOHO_BASE_URL}/dependencyMappings"
    if layoutId:
        url += f"?layoutId={layoutId}"

    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

# =====================================================
# GET AVAILABLE PARENT/CHILD FIELDS
# =====================================================

@app.get("/available-fields")
def available_fields(layoutId: str = Query(...)):
    url = f"{ZOHO_BASE_URL}/availableDependencyMappings?layoutId={layoutId}"
    response = requests.get(url, headers=HEADERS)
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
        try:
            dependency_map = json.loads(json_data)
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

    response = requests.post(f"{ZOHO_BASE_URL}/dependencyMappings", headers=HEADERS, json=payload)
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
    url = f"{ZOHO_BASE_URL}/dependencyMappings/{mapping_id}"
    response = requests.patch(url, headers=HEADERS, json={"mappings": mappings})
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return response.json()

# =====================================================
# DELETE DEPENDENCY MAPPING
# =====================================================

@app.delete("/mappings/{mapping_id}")
def delete_mapping(mapping_id: str):
    url = f"{ZOHO_BASE_URL}/dependencyMappings/{mapping_id}"
    response = requests.delete(url, headers=HEADERS)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    return {"message": "Dependency Mapping Deleted Successfully"}

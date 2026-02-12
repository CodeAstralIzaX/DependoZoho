from fastapi import FastAPI, UploadFile, File, HTTPException, Query
import requests
import pandas as pd
import os
from io import BytesIO

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
# HEALTH CHECK
# =====================================================

@app.get("/")
def health():
    return {"status": "Zoho Dependency Mapping Tool Running"}

# =====================================================
# LIST EXISTING DEPENDENCY MAPPINGS
# =====================================================

@app.get("/mappings")
def list_mappings(layoutId: str = Query(None)):

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
# CREATE DEPENDENCY MAPPING FROM EXCEL
# =====================================================

@app.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    layoutId: str = Query(...),
    parentId: str = Query(...),
    childId: str = Query(...)
):

    # ---------- Read Excel ----------
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Excel file")

    # ---------- Validate Columns ----------
    required_columns = {"Category", "Subcategory"}

    if not required_columns.issubset(set(df.columns)):
        raise HTTPException(
            status_code=400,
            detail=f"Excel must contain columns: {required_columns}"
        )

    # ---------- Build Mapping Dictionary ----------
    dependency_map = {}

    for _, row in df.iterrows():
        parent_value = str(row["Category"]).strip()
        child_value = str(row["Subcategory"]).strip()

        if parent_value not in dependency_map:
            dependency_map[parent_value] = []

        if child_value not in dependency_map[parent_value]:
            dependency_map[parent_value].append(child_value)

    if not dependency_map:
        raise HTTPException(status_code=400, detail="Excel file is empty")

    # ---------- Prepare Correct Zoho Payload ----------
    payload = {
        "layoutId": layoutId,
        "parentId": parentId,
        "childId": childId,
        "mappings": dependency_map
    }

    url = f"{ZOHO_BASE_URL}/dependencyMappings"

    response = requests.post(
        url,
        headers=HEADERS,
        json=payload
    )

    if response.status_code not in [200, 201]:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

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

    response = requests.patch(
        url,
        headers=HEADERS,
        json={"mappings": mappings}
    )

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

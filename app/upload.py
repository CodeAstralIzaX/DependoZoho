from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Body, Form
from pydantic import BaseModel
from typing import Dict, List, Optional
import pandas as pd
import requests
import os
from io import BytesIO
import json

router = APIRouter()

# ==============================
# CONFIG
# ==============================
ZOHO_BASE_URL = "https://desk.zoho.com/api/v1"
ZOHO_ORG_ID = os.getenv("ZOHO_ORG_ID")
ZOHO_ACCESS_TOKEN = os.getenv("ZOHO_ACCESS_TOKEN")

if not ZOHO_ORG_ID or not ZOHO_ACCESS_TOKEN:
    raise Exception("ZOHO_ORG_ID and ZOHO_ACCESS_TOKEN must be set.")

HEADERS = {
    "orgId": ZOHO_ORG_ID,
    "Authorization": f"Zoho-oauthtoken {ZOHO_ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# ==============================
# Pydantic Model for JSON Upload
# ==============================
class UploadJSONRequest(BaseModel):
    layoutId: str
    parentId: str
    childId: str
    mappings: Dict[str, List[str]]

# ==============================
# FLEXIBLE UPLOAD ENDPOINT
# ==============================
@router.post("/upload")
async def upload_dependency_mapping(
    file: Optional[UploadFile] = File(None, description="Excel file containing Category & Subcategory"),
    layoutId: Optional[str] = Query(None, description="Layout ID (required for Excel)"),
    parentId: Optional[str] = Query(None, description="Parent Field ID (required for Excel)"),
    childId: Optional[str] = Query(None, description="Child Field ID (required for Excel)"),
    json_data: Optional[str] = Form(None, description="JSON payload as string instead of Excel"),
    json_body: Optional[UploadJSONRequest] = Body(None, description="JSON payload instead of Excel")
):
    """
    Upload dependency mapping via Excel or JSON.
    - Provide either **file** (Excel) or **json_data/json_body** (JSON)  
    - Excel must have columns: Category, Subcategory
    """
    payload = {}

    # ---------------- Excel Upload ----------------
    if file:
        if not (layoutId and parentId and childId):
            raise HTTPException(status_code=400, detail="layoutId, parentId, and childId are required for Excel upload")
        try:
            contents = await file.read()
            df = pd.read_excel(BytesIO(contents))
            df.columns = [c.strip().title() for c in df.columns]
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Excel file")

        required_columns = {"Category", "Subcategory"}
        if not required_columns.issubset(set(df.columns)):
            raise HTTPException(
                status_code=400,
                detail=f"Excel must contain columns: {required_columns}"
            )

        dependency_map: Dict[str, List[str]] = {}
        for _, row in df.iterrows():
            parent_value = str(row["Category"]).strip()
            child_value = str(row["Subcategory"]).strip()
            if parent_value not in dependency_map:
                dependency_map[parent_value] = []
            if child_value not in dependency_map[parent_value]:
                dependency_map[parent_value].append(child_value)

        if not dependency_map:
            raise HTTPException(status_code=400, detail="Excel file is empty")

        payload = {
            "layoutId": layoutId,
            "parentId": parentId,
            "childId": childId,
            "mappings": dependency_map
        }

    # ---------------- JSON Upload via Form ----------------
    elif json_data:
        try:
            json_dict = json.loads(json_data)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON string in 'json_data'")
        if not json_dict.get("mappings"):
            raise HTTPException(status_code=400, detail="Mappings cannot be empty in JSON")
        payload = {
            "layoutId": json_dict["layoutId"],
            "parentId": json_dict["parentId"],
            "childId": json_dict["childId"],
            "mappings": json_dict["mappings"]
        }

    # ---------------- JSON Upload via Body ----------------
    elif json_body:
        if not json_body.mappings:
            raise HTTPException(status_code=400, detail="Mappings cannot be empty in JSON")
        payload = {
            "layoutId": json_body.layoutId,
            "parentId": json_body.parentId,
            "childId": json_body.childId,
            "mappings": json_body.mappings
        }

    else:
        raise HTTPException(status_code=400, detail="Provide either an Excel file or JSON payload")

    # ---------- Send to Zoho ----------
    url = f"{ZOHO_BASE_URL}/dependencyMappings"
    response = requests.post(url, headers=HEADERS, json=payload)

    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return {
        "message": "Dependency Mapping Created Successfully",
        "zoho_response": response.json()
    }

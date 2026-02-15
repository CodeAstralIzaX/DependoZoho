from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Dict, List, Optional
import pandas as pd
import requests
from io import BytesIO
from app.config import CREDENTIALS, ZOHO_BASE_URL

router = APIRouter(tags=["Excel Upload"])


def get_zoho_headers() -> Dict[str, str]:
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


def validate_token():
    """Validate OAuth token by calling Zoho /users API (safe minimal endpoint)"""
    headers = get_zoho_headers()
    try:
        response = requests.get(f"{ZOHO_BASE_URL}/users", headers=headers, timeout=10)
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="OAuth Token is invalid or expired. Please set /auth with a valid token.")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to Zoho for token validation: {str(e)}")


@router.post(
    "/upload",
    summary="Upload Excel for Dependency Mapping",
    description="Upload an Excel file containing at least two columns (Parent & Child) to create dependency mappings in Zoho Desk."
)
async def upload_excel(
    layoutId: str = Query(..., description="Zoho Layout ID"),
    parentId: Optional[str] = Query(None, description="Parent Field ID (Optional)"),
    childId: Optional[str] = Query(None, description="Child Field ID (Optional)"),
    file: UploadFile = File(..., description="Excel file with Parent and Child values")
):
    # ---------- Validate token ----------
    validate_token()

    headers = get_zoho_headers()

    # ---------- Read Excel ----------
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")

    if df.shape[1] < 2:
        raise HTTPException(status_code=400, detail="Excel must contain at least 2 columns")

    parent_column = df.columns[0].strip()
    child_column = df.columns[1].strip()

    df = df.dropna(subset=[parent_column, child_column])
    if df.empty:
        raise HTTPException(status_code=400, detail="Excel contains no valid rows")

    dependency_map: Dict[str, List[str]] = {}
    records_processed = 0
    for _, row in df.iterrows():
        parent_value = str(row[parent_column]).strip()
        child_value = str(row[child_column]).strip()
        if parent_value and child_value:
            dependency_map.setdefault(parent_value, [])
            if child_value not in dependency_map[parent_value]:
                dependency_map[parent_value].append(child_value)
                records_processed += 1

    parentId = parentId or parent_column
    childId = childId or child_column

    payload = {
        "layoutId": layoutId,
        "parentId": parentId,
        "childId": childId,
        "mappings": dependency_map
    }

    # ---------- Send to Zoho ----------
    try:
        response = requests.post(
            f"{ZOHO_BASE_URL}/dependencyMappings",
            headers=headers,
            json=payload,
            timeout=30
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to Zoho: {str(e)}")

    if response.status_code not in [200, 201]:
        raise HTTPException(
            status_code=response.status_code,
            detail={
                "zoho_status": response.status_code,
                "zoho_error": response.text,
                "payload_sent": payload
            }
        )

    return {
        "status": "success",
        "records_processed": records_processed,
        "parent_categories": len(dependency_map),
        "zoho_response": response.json()
    }

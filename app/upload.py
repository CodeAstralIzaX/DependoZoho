#app/upload.py - FastAPI router for handling Excel uploads to create dependency mappings in Zoho Desk
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Dict, List, Optional
import pandas as pd
import requests
from io import BytesIO
from app.config import CREDENTIALS, get_zoho_base_url

router = APIRouter(tags=["Excel Upload"])

# =====================================================
# Constants
# =====================================================
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

# =====================================================
# Helper Functions
# =====================================================

def get_zoho_headers() -> Dict[str, str]:
    """Get Zoho API headers with validation"""
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


def validate_file(filename: str) -> str:
    """Validate file extension"""
    if not filename:
        raise HTTPException(status_code=400, detail="File name is required")
    
    file_ext = filename.rsplit('.', 1)[-1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return file_ext


def validate_token():
    """Validate OAuth token by calling Zoho /users API (safe minimal endpoint)"""
    try:
        headers = get_zoho_headers()
        domain = CREDENTIALS.get("domain", "com")  # Default to .com if not set
        zoho_base_url = get_zoho_base_url(domain)
        
        response = requests.get(f"{zoho_base_url}/users", headers=headers, timeout=10)
        if response.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="OAuth Token is invalid or expired. Please set /auth with a valid token."
            )
        elif response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Zoho API error: {response.text}"
            )
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Token validation timeout. Please try again.")
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
            detail=f"Token validation failed: {str(e)}"
        )


def validate_dataframe(df: pd.DataFrame, parent_col: str, child_col: str):
    """Validate DataFrame structure and data"""
    if df.empty:
        raise HTTPException(status_code=400, detail="Excel file is empty")
    
    if parent_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Parent column '{parent_col}' not found")
    
    if child_col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Child column '{child_col}' not found")


# =====================================================
# Excel Upload Endpoint
# =====================================================

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
    """
    Upload an Excel file to create dependency mappings.
    
    - **layoutId**: Required. The Zoho layout ID
    - **parentId**: Optional. Parent field ID (defaults to first column name)
    - **childId**: Optional. Child field ID (defaults to second column name)
    - **file**: Required. Excel/CSV file with at least 2 columns
    """
    
    try:
        # ========== Validate Input ==========
        if not layoutId or not layoutId.strip():
            raise HTTPException(status_code=400, detail="Layout ID is required")
        
        if not file:
            raise HTTPException(status_code=400, detail="File is required")
        
        # Validate file extension
        validate_file(file.filename)
        
        # ---------- Validate token ----------
        validate_token()

        headers = get_zoho_headers()
        domain = CREDENTIALS.get("domain", "com")
        zoho_base_url = get_zoho_base_url(domain)

        # ========== Read Excel ==========
        try:
            contents = await file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413, 
                    detail=f"File too large. Max size: {MAX_FILE_SIZE / (1024*1024):.1f} MB"
                )
            df = pd.read_excel(BytesIO(contents))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid Excel file: {str(e)}")

        if df.shape[1] < 2:
            raise HTTPException(status_code=400, detail="Excel must contain at least 2 columns (Parent and Child)")

        # Get column names
        parent_column = df.columns[0].strip()
        child_column = df.columns[1].strip()

        # Validate DataFrame structure
        validate_dataframe(df, parent_column, child_column)

        # ========== Process Excel Data (Vectorized) ==========
        try:
            # Drop rows with missing values
            df_clean = df[[parent_column, child_column]].dropna()
            
            # Convert to string and strip whitespace
            df_clean[parent_column] = df_clean[parent_column].astype(str).str.strip()
            df_clean[child_column] = df_clean[child_column].astype(str).str.strip()
            
            # Remove empty strings
            df_clean = df_clean[(df_clean[parent_column] != '') & (df_clean[child_column] != '')]
            
            if df_clean.empty:
                raise HTTPException(status_code=400, detail="Excel contains no valid rows (non-empty parent and child pairs)")

            # Vectorized groupby operation - Much faster than iterrows()
            dependency_map: Dict[str, List[str]] = {}
            grouped = df_clean.groupby(parent_column)[child_column].apply(list).to_dict()
            
            for parent_val, child_values in grouped.items():
                # Remove duplicates within each parent
                unique_children = list(dict.fromkeys(child_values))  # Preserve order while removing duplicates
                dependency_map[parent_val] = unique_children
            
            records_processed = df_clean.shape[0]

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing Excel data: {str(e)}")

        parentId = parentId or parent_column
        childId = childId or child_column

        # Validate processed data
        if not dependency_map:
            raise HTTPException(status_code=400, detail="No valid mappings extracted from file")

        payload = {
            "layoutId": layoutId,
            "parentId": parentId,
            "childId": childId,
            "mappings": dependency_map
        }

        # ========== Send to Zoho ==========
        try:
            response = requests.post(
                f"{zoho_base_url}/dependencyMappings",
                headers=headers,
                json=payload,
                timeout=30
            )
        except requests.exceptions.Timeout:
            raise HTTPException(status_code=504, detail="Timeout sending data to Zoho. Please try again.")
        except requests.exceptions.RequestException as e:
            raise HTTPException(status_code=503, detail=f"Error connecting to Zoho: {str(e)}")

        if response.status_code not in [200, 201]:
            raise HTTPException(
                status_code=response.status_code,
                detail={
                    "error": "Zoho API Error",
                    "zoho_status": response.status_code,
                    "zoho_error": response.text,
                    "payload_sent": payload
                }
            )

        return {
            "status": "success",
            "message": "Dependency mapping created successfully",
            "records_processed": records_processed,
            "parent_categories": len(dependency_map),
            "total_child_mappings": sum(len(children) for children in dependency_map.values()),
            "zoho_response": response.json()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
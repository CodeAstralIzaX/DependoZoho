* * *

Zoho Dependency Mapping API – Full Internal Documentation (with Code)
=====================================================================

**Version:** PI - 0.1.2  
**Base URL:** `http://127.0.0.1:8000`  
**Developed by:** [Prem IzaX](https://instagram.com/_izax._.prem_)

* * *

Table of Contents
-----------------

1.  API Overview
    
2.  Project Structure & Files
    
3.  main.py Overview
    
4.  upload.py Overview
    
5.  config.py Overview
    
6.  Endpoints & Usage
    
7.  Example Workflow
    
8.  Security Considerations
    

* * *

1\. API Overview
----------------

The Zoho Dependency Mapping API provides functionality to:

*   Authenticate with Zoho Desk and manage credentials
    
*   Validate OAuth tokens
    
*   List, update, delete dependency mappings
    
*   Upload Excel files for bulk dependency mapping
    
*   Check system health and authentication status
    

This API is built using **FastAPI** and exposes endpoints with **JSON** responses, and also supports **multipart/form-data** for Excel uploads.

* * *

2\. Project Structure & Files
-----------------------------

    MappingTool/
    │
    ├─ app/
    │  ├─ main.py          # FastAPI backend entry point with routes & Swagger customization
    │  ├─ upload.py        # Router for Excel-based uploads
    │  ├─ config.py        # Zoho domain config & in-memory credentials
    │
    ├─ venv/               # Virtual environment folder
    ├─ requirements.txt    # Python dependencies
    └─ README.md           # Internal documentation
    

> `requirements.txt` must include:

    fastapi
    uvicorn
    requests
    pandas
    openpyxl
    python-multipart
    

* * *

3\. main.py Overview
--------------------

### Key Features:

*   **FastAPI app creation** with custom title, version, description, and contact
    
*   **Custom OpenAPI JSON endpoint** (removes default "openapi" key)
    
*   **Zoho headers helper** (`get_zoho_headers`) for authenticated requests
    
*   **Token validation helper** (`validate_token`) via Zoho /users endpoint
    
*   **Auth endpoints:**
    
    *   `POST /auth` → Set credentials
        
    *   `GET /auth/status` → Check if credentials are configured
        
*   **Health endpoint:** `GET /` → Verify server is running
    
*   **Dependency mappings endpoints:**
    
    *   `GET /mappings` → List mappings
        
    *   `GET /available-fields` → Fetch available fields for layout
        
    *   `PATCH /mappings/{mapping_id}` → Update a mapping
        
    *   `DELETE /mappings/{mapping_id}` → Delete a mapping
        
*   **Custom Swagger UI** with footer showing "Developed by Prem IzaX"
    
*   **Router inclusion:** Excel uploads routed under `/dependency`
    

### Code Snippets:

**Custom OpenAPI:**

    @app.get("/openapi.json", include_in_schema=False)
    async def custom_openapi():
        openapi_data = app.openapi()
        openapi_data.pop("openapi", None)
        return JSONResponse(content=openapi_data)
    

**Auth Endpoint:**

    @app.post("/auth")
    def set_credentials(auth: AuthRequest):
        validate_token(auth.orgId, auth.accessToken, domain)
        CREDENTIALS.update({"orgId": auth.orgId, "accessToken": auth.accessToken, "domain": domain})
        return {"message": "Credentials stored successfully."}
    

* * *

4\. upload.py Overview
----------------------

### Features:

*   Excel upload endpoint: `POST /dependency/upload`
    
*   Reads Excel using **pandas**
    
*   Validates at least two columns (`Parent` & `Child`)
    
*   Builds a **dependency map** to send to Zoho Desk
    
*   Handles errors for invalid Excel files, missing data, or token issues
    

**Key Functions:**

    def get_zoho_headers() -> Dict[str, str]:
        ...
    
    def validate_token():
        ...
    

**Excel Upload Endpoint:**

    @router.post("/upload")
    async def upload_excel(layoutId: str, parentId: Optional[str], childId: Optional[str], file: UploadFile):
        validate_token()
        df = pd.read_excel(BytesIO(await file.read()))
        dependency_map = ...
        payload = {"layoutId": layoutId, "parentId": parentId, "childId": childId, "mappings": dependency_map}
        response = requests.post(f"{zoho_base_url}/dependencyMappings", headers=headers, json=payload)
        return {"status": "success", "records_processed": records_processed, "zoho_response": response.json()}
    

* * *

5\. config.py Overview
----------------------

### Purpose:

*   Store **in-memory credentials**
    
*   Define **default Zoho domain** and supported domains
    
*   Construct **Zoho API base URL** dynamically
    

### Code:

    DEFAULT_ZOHO_DOMAIN = "com"
    ZOHO_DOMAINS = ["com", "in", "eu", "sa", "cn", "au"]
    CREDENTIALS = {"orgId": None, "accessToken": None, "domain": DEFAULT_ZOHO_DOMAIN}
    
    def get_zoho_base_url(domain: str = None) -> str:
        domain = domain or DEFAULT_ZOHO_DOMAIN
        if domain not in ZOHO_DOMAINS:
            raise ValueError("Unsupported Zoho domain")
        return f"https://desk.zoho.{domain}/api/v1"
    

* * *

6\. Endpoints & Usage
---------------------

Endpoint

Method

Description

`/auth`

POST

Set Zoho credentials (orgId, accessToken, domain)

`/auth/status`

GET

Check if credentials are configured

`/`

GET

Health check

`/mappings`

GET

List dependency mappings; optional `layoutId` query

`/available-fields`

GET

List fields for layout (`layoutId` required)

`/mappings/{mapping_id}`

PATCH

Update a mapping

`/mappings/{mapping_id}`

DELETE

Delete a mapping

`/dependency/upload`

POST

Upload Excel file for bulk dependency mappings

* * *

7\. Example Workflow
--------------------

1.  Set credentials via `/auth`
    
2.  Verify credentials via `/auth/status`
    
3.  Fetch available fields `/available-fields?layoutId=`
    
4.  Upload Excel `/dependency/upload`
    
5.  List mappings `/mappings?layoutId=`
    
6.  Update or delete mappings if needed
    

**Example cURL for Excel Upload:**

    curl -X POST "http://127.0.0.1:8000/dependency/upload?layoutId=12345&parentId=Parent&childId=Child" \
    -F "file=@mapping.xlsx"
    

**Example cURL for JSON Upload:**

    curl -X POST "http://127.0.0.1:8000/dependency/upload" \
    -F 'json_data={"layoutId":"123456","parentId":"Parent","childId":"Child","mappings":{"Parent1":["Child1","Child2"]}}'
    

* * *

8\. Security Considerations
---------------------------

*   OAuth tokens must be valid before making requests
    
*   Do not expose access tokens in logs or front-end
    
*   Use HTTPS for production
    
*   Validate all Excel inputs before sending to Zoho
    
*   Limit file upload size to prevent abuse
    

* * *

**From thought to code, with ❤️, by [Prem IzaX](https://instagram.com/_izax._.prem_)**

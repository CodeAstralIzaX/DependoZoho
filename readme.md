# Zoho Dependency Mapping Tool

**Version:** 0.1.0  
**Backend Only**  
**FastAPI + Uvicorn + Pandas + Requests**

A backend API tool to manage dependency mappings in Zoho Desk via Excel or JSON uploads. Includes endpoints for listing, creating, updating, and deleting dependency mappings.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [API Endpoints](#api-endpoints)
- [Uploading Mappings](#uploading-mappings)
- [Notes](#notes)

---

## Features

- Health check endpoint
- List existing dependency mappings
- Retrieve available parent/child fields
- Upload dependency mappings via Excel or JSON
- Update or delete existing mappings
- Swagger UI with custom footer

---

## Prerequisites

- Python 3.9+  
- Virtual environment recommended
- Zoho Desk **Org ID** and **Access Token**

---

## Project Structure

```
MappingTool/
│
├─ app/
│  ├─ __init__.py
│  └─ main.py        # FastAPI backend code with endpoints
│
├─ venv/             # Virtual environment folder
├─ requirements.txt  # Python dependencies
└─ README.md         # This file
```

> `main.py` contains all routes and Swagger customization.  
> `requirements.txt` lists all dependencies, including `python-multipart` for form uploads.

---

## Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd MappingTool
```

2. Create and activate a virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate   # Linux/Mac
# OR
venv\Scripts\activate      # Windows
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

> Make sure your `requirements.txt` includes:

```
fastapi
uvicorn
requests
pandas
openpyxl
python-multipart
```

---

## Environment Variables

Set your Zoho credentials before running the server:

```bash
export ZOHO_ORG_ID=<your_zoho_org_id>
export ZOHO_ACCESS_TOKEN=<your_zoho_access_token>
```

> On Windows (PowerShell):

```powershell
setx ZOHO_ORG_ID "<your_zoho_org_id>"
setx ZOHO_ACCESS_TOKEN "<your_zoho_access_token>"
```

---

## Running the Server

Run the FastAPI backend with Uvicorn:

```bash
uvicorn app.main:app --reload
```

* The server will start at: `http://127.0.0.1:8000`
* Swagger UI is available at: `http://127.0.0.1:8000/docs` (with custom footer)

---

## API Endpoints

| Method | Endpoint                 | Description                                              |
| ------ | ------------------------ | -------------------------------------------------------- |
| GET    | `/`                      | Health check                                             |
| GET    | `/mappings`              | List all dependency mappings (optional `layoutId` query) |
| GET    | `/available-fields`      | Get available parent/child fields (`layoutId` required)  |
| POST   | `/upload`                | Upload dependency mappings via Excel or JSON             |
| PATCH  | `/mappings/{mapping_id}` | Update existing mapping                                  |
| DELETE | `/mappings/{mapping_id}` | Delete mapping                                           |

---

## Uploading Mappings

### Excel File Upload

* Excel must have **at least 2 columns** (Parent/Child or Category/Subcategory)
* Required query parameters for Excel upload: `layoutId`, `parentId`, `childId`
* Example using `curl`:

```bash
curl -X POST "http://127.0.0.1:8000/upload?layoutId=<LAYOUT_ID>&parentId=<PARENT_FIELD>&childId=<CHILD_FIELD>" \
-F "file=@mapping.xlsx"
```

### JSON Upload

* Provide JSON in `json_data` form field:

```json
{
  "layoutId": "123456",
  "parentId": "Parent",
  "childId": "Child",
  "mappings": {
    "Parent1": ["Child1", "Child2"],
    "Parent2": ["Child3"]
  }
}
```

* Example using `curl`:

```bash
curl -X POST "http://127.0.0.1:8000/upload" \
-F 'json_data={"layoutId":"123456","parentId":"Parent","childId":"Child","mappings":{"Parent1":["Child1","Child2"]}}'
```

---

## Notes

* Make sure `python-multipart` is installed for form uploads.
* Make sure `openpyxl` is installed for Excel uploads.
* Swagger UI includes a custom footer showing "Developed with ❤️ by Prem".
* If port `8000` is in use, you can run on another port:

```bash
uvicorn app.main:app --reload --port 8080
```

---

**From thought to code, with ❤️, by Prem IzaX**

# 🎯 Global Department & Layout Selection Flow

## Overview

The application now implements a **global state management system** using React Context. Once you select a Department and Layout, these selections persist across **all actions** (Create, Edit, Delete mappings) without needing to re-enter them.

## Architecture

### 1. **Global Context** (`frontend/src/context/AppContext.jsx`)

Manages application-wide state:
- `selectedDepartment` - Currently selected department
- `selectedLayout` - Currently selected layout  
- `authStatus` - Authentication status
- `departments` - List of available departments
- `layouts` - List of available layouts

**Actions Available:**
- `selectDepartment(dept)` - Set current department
- `selectLayout(layout)` - Set current layout
- `setAuthenticated(status)` - Update auth status
- `updateDepartments(depts)` - Update departments list
- `updateLayouts(layouts)` - Update layouts list

### 2. **AppProvider Wrapper**

Wraps the entire app in `main.jsx` to make context available everywhere:

```jsx
<AppProvider>
  <App />
</AppProvider>
```

### 3. **useAppContext Hook**

Access global state in any component:

```jsx
const { selectedLayout, selectLayout } = useAppContext()
```

---

## User Workflow

### **Step 1️⃣: Authentication**

**File:** `frontend/src/components/AuthPanel.jsx`

- Enter Organization ID
- Enter Access Token  
- Select Domain (US, EU, IN, AU)
- Click "Authenticate"
- Once authenticated, fields are disabled and status shows ✓

**Backend:** `POST /authenticate`

---

### **Step 2️⃣: Select Department & Layout**

**File:** `frontend/src/components/DepartmentLayoutSelector.jsx`

This is the **NEW central selector** that manages global selections.

#### Features:
- ✅ Auto-loads departments on mount
- ✅ Automatically loads layouts when department changes  
- ✅ Shows selected department & layout status
- ✅ Displays layout status (default/custom)
- ✅ localStorage persistence (auto-save/load)
- ✅ Refresh buttons for manual reload

#### Endpoints Used:
- `GET /departments?isEnabled=true&limit=200` - List departments
- `GET /layouts?module=tickets&departmentId={id}&limit=200` - List layouts

**Once selected, these values flow to all other components automatically!**

---

### **Step 3️⃣: Create Mappings (Excel Upload)**

**File:** `frontend/src/components/ExcelUploader.jsx`

- Upload Excel file with parent-child-value mappings
- No need to enter layout ID manually - uses global `selectedLayout`
- No need to enter department - uses global `selectedDepartment`

---

### **Step 4️⃣: Edit Mappings**

**File:** `frontend/src/components/MappingViewer.jsx`

- Click "Fetch Mappings" button - automatically uses selected layout
- See all mappings for that layout
- Click "Edit" on any mapping
- Make changes
- Click "Save" - automatically uses selected layout

**Key Change:** Removed manual Layout ID input field. Now shows selected layout status.

---

### **Step 5️⃣: Create/Edit Mappings (Builder)**

**File:** `frontend/src/components/AvailableFields.jsx`

- Step 1: Load Schema (auto-uses selected layout)
- Step 2: Select Parent Field  
- Step 3: Select Child Field
- Step 4: Map values

**Key Change:** Removed manual Layout ID input field. Now shows selected layout status.

---

## Component Integration

### Flow Diagram

```
AppContext (Global State)
    ↓
    ├─→ AuthPanel 
    │    └─→ setAuthenticated() [updates auth status]
    │
    ├─→ DepartmentLayoutSelector ⭐ (NEW)
    │    ├─→ selectDepartment()
    │    └─→ selectLayout()
    │
    ├─→ ExcelUploader
    │    └─→ Uses selectedLayout from context
    │
    ├─→ MappingViewer (Edit)
    │    ├─→ Uses selectedLayout automatically
    │    └─→ Loads mappings for that layout
    │
    └─→ AvailableFields (Create/Edit)
         ├─→ Uses selectedLayout automatically
         └─→ Loads schema for that layout
```

---

## Implementation Details

### DepartmentLayoutSelector Component

```jsx
function DepartmentLayoutSelector() {
  const {
    selectedDepartment,
    selectedLayout,
    selectDepartment,
    selectLayout,
    departments,
    layouts
  } = useAppContext()

  // Automatically loads departments on mount
  // Automatically loads layouts when department changes
}
```

### Using Context in Other Components

**Before (Manual Entry):**
```jsx
const [layoutId, setLayoutId] = useState("")

// User had to type layout ID manually
<Input 
  value={layoutId}
  onChange={e => setLayoutId(e.target.value)}
/>
```

**After (Global Context):**
```jsx
const { selectedLayout } = useAppContext()

// No input needed - already selected globally!
<Alert message={`Layout: ${selectedLayout.layoutName}`} />
```

---

## State Management Flow

### Authentication State

```
AuthPanel
  ↓ (user clicks Authenticate)
  ↓ API call succeeds
  ↓
  setAuthenticated(true)
  ↓
  AppContext.authStatus = true
  ↓
  All components notified of auth status
```

### Department Selection

```
DepartmentLayoutSelector
  ↓ (user selects department from dropdown)
  ↓ selectDepartment(dept)
  ↓
  AppContext.selectedDepartment = dept
  ↓ (automatically triggers layout fetch)
  ↓
  fetchLayouts(dept.id)
  ↓
  All components using selectedLayout get fresh value
```

### Layout Selection

```
DepartmentLayoutSelector
  ↓ (user selects layout from dropdown)
  ↓ selectLayout(layout)
  ↓
  AppContext.selectedLayout = layout
  ↓
  MappingViewer re-renders with selected layout
  AvailableFields re-renders with selected layout
```

---

## Backend Endpoints

### Authentication
- **POST** `/authenticate` - Authenticate with Zoho
- **POST** `/revoke` - Revoke tokens

### Departments
- **GET** `/departments` - List all departments
  - Query: `?isEnabled=true&limit=200`
- **GET** `/departments/{department_id}` - Get specific department

### Layouts
- **GET** `/layouts` - List layouts for module
  - Query: `?module=tickets&departmentId={id}&status=active&limit=200`
- **GET** `/layouts/{layout_id}` - Get specific layout with all fields

### Mappings
- **GET** `/mappings` - List all mappings
- **GET** `/mappings/{id}` - Get mapping details
- **POST** `/mappings` - Create new mapping
  - Body: `{layoutId, parentId, childId, mappings: {}}`
- **PATCH** `/mappings/{id}` - Update mapping
- **DELETE** `/mappings/{id}` - Delete mapping

### Layout Fields
- **GET** `/layout/{layoutId}/fields` - Get parent and child fields

### Excel Upload
- **POST** `/dependency/upload` - Upload Excel file
  - Query: `?layoutId={id}&parentId={id}&childId={id}`

---

## Key Features

### ✅ Global Persistence
Department and Layout selections remain active across:
- Navigation between different sections
- Switching between mapping operations
- Page refreshes (via localStorage)

### ✅ Cascading Selection
- Select Department → Layouts auto-populate
- Select Layout → All operations use this layout
- All cascading happens automatically

### ✅ No Manual Entry
Removed manual layout ID input fields from:
- MappingViewer (edit mappings)
- AvailableFields (create/edit mappings)
- ExcelUploader (create mappings)

### ✅ Clear Visual Feedback
- Selected values displayed prominently
- Status indicators (✓ Selected)
- Department & Layout shown in detail cards
- Color-coded alerts (success/warning)

### ✅ Smart Defaults
- Layout list auto-filters by selected department
- All operations default to selected values
- Can switch department/layout anytime
- Automatic reset of dependent selections

---

## Error Handling

### Department Load Fails
→ Alert shown: "Failed to load departments"  
→ User cannot proceed to layout selection  
→ Can click "Refresh Departments" to retry

### Layout Load Fails
→ Alert shown: "Failed to load layouts"  
→ User can retry with "Refresh Layouts"

### Operations Without Selection
→ Alert: "Select a layout first from the Department & Layout selector"  
→ Buttons disabled until selection made  
→ Clear guidance on what to do

---

## Testing the Flow

### Manual Test Steps

1. **Start Auth**
   - [ ] Open Dashboard
   - [ ] Enter Zoho credentials
   - [ ] Click "Authenticate"
   - [ ] Verify ✓ Authenticated shown

2. **Select Department & Layout**
   - [ ] Navigate to "Select Department & Layout" section
   - [ ] Select a department from dropdown
   - [ ] Verify layouts auto-populate
   - [ ] Select a layout
   - [ ] Verify "Ready to Proceed" message shows

3. **Create Mapping via Excel**
   - [ ] Navigate to "Create Mappings" section
   - [ ] Upload Excel file
   - [ ] Verify it uses selected layout/department
   - [ ] Check success message

4. **View Mappings**
   - [ ] Navigate to "Edit Mappings" section
   - [ ] Click "Fetch Mappings"
   - [ ] Verify shows mappings for selected layout
   - [ ] Department shown in detail section

5. **Edit Mapping**
   - [ ] Click "Edit" on a mapping
   - [ ] Make changes to mapping values
   - [ ] Click "Save"
   - [ ] Verify successful update message

6. **Create via Builder**
   - [ ] Navigate to "Dependency Mapping Builder"
   - [ ] Click "Load Schema"
   - [ ] Verify parent/child fields populated
   - [ ] Select parent field, child field
   - [ ] Map values
   - [ ] Click "Save"
   - [ ] Verify successful creation message

7. **Switch Department**
   - [ ] Go back to "Select Department & Layout"
   - [ ] Select different department
   - [ ] Verify layout list changes
   - [ ] Select new layout
   - [ ] Verify all operations now use new layout

---

## Sidebar Navigation Order

```
1. Authentication          ← Login here first
2. Select Department & Layout ← Choose what to manage
3. Create Mappings         ← Upload Excel
4. Edit Mappings           ← Modify existing mappings
5. API Console             ← Advanced debugging
6. Layout Field Fetcher    ← View available fields
7. Dependency Builder      ← Create/edit single mappings
```

---

## Files Changed

### New Files Created
- `frontend/src/context/AppContext.jsx` - Global state context
- `frontend/src/components/DepartmentLayoutSelector.jsx` - Department/Layout selector

### Modified Files
- `frontend/src/main.jsx` - Added AppProvider wrapper
- `frontend/src/pages/Dashboard.jsx` - Replaced old selector with new one
- `frontend/src/components/AuthPanel.jsx` - Added context integration
- `frontend/src/components/MappingViewer.jsx` - Uses context, removed manual input
- `frontend/src/components/AvailableFields.jsx` - Uses context, removed manual input
- `frontend/src/components/Sidebar.jsx` - Reordered menu items
- `frontend/src/services/zohoApi.js` - Added department/layout functions
- `app/main.py` - Added department/layout endpoints

---

## Summary

✨ **The application now works in a clean, logical order:**

1. Authenticate with Zoho
2. Select which Department to work with
3. Select which Layout within that Department
4. Perform any operation (create, edit, delete) mappings
5. Results automatically use selected Department & Layout
6. Switch Department/Layout anytime to work with different data

**No more manual layout ID entry. Everything flows naturally from selections!**

---

## Support

For questions about:
- **Context behavior**: See `frontend/src/context/AppContext.jsx`
- **Department/Layout selector**: See `frontend/src/components/DepartmentLayoutSelector.jsx`
- **Using context in components**: Check any modified component for `useAppContext()` usage
- **Backend endpoints**: See `app/main.py` routes


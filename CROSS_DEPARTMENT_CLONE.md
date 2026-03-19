# Cross-Department & Layout Clone Feature

## Overview
The Clone Mapping feature now allows you to **clone mappings across different departments and layouts**.

## How It Works

### Step 1: Select Source Mapping
In the Mapping Viewer table, click the **Clone** button on any mapping.

### Step 2: Select Target Department
The clone modal opens with a 2-step process:
- **Step 1: Select Target Department** - Choose any department (same or different)
  - Example: Clone from "Sales" to "Operations"
  - Shows all available departments

### Step 3: Select Target Layout
Once department is selected:
- **Step 2: Select Target Layout** - Choose a layout in the target department
  - Shows only layouts from the selected department
  - Excludes current layout if cloning within same department
  
### Step 4: Review Source Mapping
Shows what's being cloned:
- Source parent field (e.g., "Priority")
- Source child field (e.g., "Status")
- All mapping values (e.g., "High" → "Urgent", "Low" → "Low Priority")

### Step 5: Clone
- Click **Clone** button
- Mapping is created in the target layout with:
  - **Same parent and child fields** from the source
  - **Exact same mapping values** copied without modification
  - Target department and layout applied

## Key Features

✅ **Cross-Department Support**
- Clone to any department in your organization
- Same or different departments

✅ **Cross-Layout Support**
- Clone to any layout within the target department
- Current layout automatically excluded when cloning within same department

✅ **Field Consistency**
- Target parent/child fields must exist in target layout
- Same field names and IDs used for consistency
- System validates field compatibility

✅ **Smart Validation**
- Clone button disabled until both department and layout selected
- Clear error messages if fields don't exist in target
- Prevents cloning to same layout in same department

✅ **Session State Management**
- Mapping draft stays in session (not localStorage)
- Cleared on page refresh
- Only persistent auth data retained

## Implementation Details

### New State Variables
```javascript
const [cloneTargetDepartment, setCloneTargetDepartment] = useState("")
const [cloneTargetLayout, setCloneTargetLayout] = useState("")
const [cloneTargetLayouts, setCloneTargetLayouts] = useState([])
```

### Updated cloneMapping()
```javascript
const cloneMapping = async () => {
  // Now validates both department and layout
  // Uses target department + layout for cloning
  const payload = {
    layoutId: cloneTargetLayout,     // Target layout
    parentId: cloneSourceMapping.parent.id,  // Same parent field
    childId: cloneSourceMapping.child.id,    // Same child field
    mappings: cloneSourceMapping.mappings    // Same values
  }
}
```

## User Workflow

```
1. Browse Mapping Table in Department A
   ↓
2. Click Clone button on any mapping
   ↓
3. Select Target Department (e.g., Department B)
   ↓
4. Select Target Layout in Department B
   ↓
5. Review Source Mapping Details
   ↓
6. Click "Clone" Button
   ↓
7. ✅ Mapping created in Department B with same fields and values
```

## Example Scenarios

### Scenario 1: Same Department, Different Layout
- Source: Department "Sales", Layout "Deals" (Priority → Status)
- Mappings: High→Urgent, Medium→Normal, Low→Minor
- Target: Department "Sales", Layout "Opportunities" (Priority → Status)
- Result: "Opportunities" layout gets same mappings

### Scenario 2: Different Departments
- Source: Department "Operations", Layout "Tasks" (Level → Action)
- Mappings: High→Execute, Normal→Consider, Low→Ignore
- Target: Department "Projects", Layout "Activities" (Level → Action)
- Result: "Projects" can reuse standardized level mappings

### Scenario 3: Cross-Org Standardization
- Source: Department "HQ", Layout "Master" (Status → Resolution)
- Mappings: Open→InProgress, Closed→Done, Pending→Waiting
- Target: Any Branch Department Layout with same fields
- Result: Consistent mappings across entire organization

## Benefits

1. **Organization-Wide Consistency** - Standardize mappings across departments
2. **Faster Setup** - Reuse proven mappings across the organization
3. **Reduced Errors** - Copy exact mappings instead of recreating
4. **Flexible Cloning** - Works across any department and layout combination
5. **Session Safety** - Drafts cleared on refresh, only persistent data retained

## Limitations & Future Improvements

⚠️ **Current Limitations:**
- Target layouts must have the same parent/child field names
- Field IDs must match or cloning will fail
- Single-step cloning (department → layout both required)

✨ **Future Improvements:**
- Fetch layouts from API for departments (currently uses local state for same dept)
- Field mapping UI for different field names in target
- Bulk clone multiple mappings at once
- Clone history and audit trail
- One-click "Clone to All Layouts" feature

# Clone Mapping to Different Layout - Updated Feature

## Overview
The Clone Mapping feature now allows you to **clone an existing mapping to a completely different layout** (not just different fields in the same layout).

## How It Works

### Step 1: Locate a Mapping to Clone
In the Mapping Viewer table, find any mapping and click the **Clone** button (copy icon).

### Step 2: Select Target Layout
The clone modal will open with:
- **Step 1: Select Target Layout** - Choose a different layout from the dropdown
  - Note: Current layout is excluded from the list
  - Selected layout shows confirmation below
  
### Step 3: View Source Mapping
Shows what's being cloned:
- Source parent field (e.g., "Priority")
- Source child field (e.g., "Status")
- All mapping values (e.g., "High" → "Urgent", "Low" → "Low Priority")

### Step 4: Map to Target Layout Fields
Once you select the target layout:
- **Step 2: Map to Target Layout Fields** appears
- **New Parent Field** - Select a parent field in the target layout
- **New Child Field** - Select a child field in the target layout
- The selected fields **don't need to match the source fields**

### Step 5: Clone
- Click **Clone** button
- Mapping is created in the target layout with:
  - New parent and child fields
  - **Exact same mapping values** from the source
  - All values copied without modification

## Key Features

✅ **Different Layout Support**
- Clone to any other layout in the department
- Current layout automatically excluded

✅ **Field Flexibility**
- Target parent/child fields don't need to match source field names
- Example: Clone "Priority→Status" to "Level→Category"
- Values stay the same: "High"→"Urgent" mapping preserved

✅ **Smart Validation**
- Clone button disabled until all required fields selected
- Parent and child must be different
- Clear error messages for validation

✅ **Session State Management**
- Mapping draft stays in session (not localStorage)
- Cleared on page refresh
- Clean separation from persistent auth data

## Implementation Details

### New State Variables
```javascript
const [cloneTargetLayout, setCloneTargetLayout] = useState("")
const [cloneTargetParents, setCloneTargetParents] = useState([])
const [cloneTargetChildren, setCloneTargetChildren] = useState([])
```

### New Function: fetchLayoutFieldsForClone()
```javascript
const fetchLayoutFieldsForClone = useCallback(async (targetLayout) => {
  // Fetches parent/child fields from the selected target layout
  // Updates state with available fields for that layout
}, [selectedDepartment.id])
```

### Updated cloneMapping()
- Now uses `cloneTargetLayout` instead of `selectedLayout.id`
- Clones to target layout, not current layout
- Fetches and displays fields from target layout

## User Workflow

```
1. Browse Mapping Table
   ↓
2. Click Clone button on any mapping
   ↓
3. Select Target Layout (different from current)
   ↓
4. View Source Mapping Details
   ↓
5. Select Parent Field in Target Layout
   ↓
6. Select Child Field in Target Layout
   ↓
7. Click "Clone" Button
   ↓
8. ✅ Mapping created in target layout with same values
```

## Validation Rules

- ❌ Cannot clone to same layout (current layout excluded)
- ❌ Parent and child fields must be different
- ❌ Both parent and child must be selected
- ✅ Fields can be from different hierarchies
- ✅ Values are preserved exactly as-is

## Example Scenarios

### Scenario 1: Reuse Priority Mapping
- Source: Department A, Layout "Issues" (Priority → Severity)
- Mappings: High→Critical, Medium→Normal, Low→Minor
- Target: Department A, Layout "Tasks" (Level → Priority)
- Result: Level field gets High→Critical, Medium→Normal, Low→Minor mappings

### Scenario 2: Cross-Layout Standardization
- Source: "Status" → "Action" (Open→Proceed, Closed→Stop)
- Target: "Phase" → "State" (different fields, same concept)
- Result: Standardized mappings applied to different field pair

## Benefits

1. **Faster Mapping Creation** - Reuse complex mappings across layouts
2. **Consistency** - Same values applied across different layouts
3. **Flexibility** - Works with different field types and names
4. **Error Prevention** - Validation prevents invalid combinations
5. **Session Safety** - Drafts cleared on refresh, only persistent data retained

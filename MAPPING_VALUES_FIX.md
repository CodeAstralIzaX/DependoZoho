# Mapping Display & Values Fix - March 15, 2026

## Issues Fixed

### 1. **Child Field ID Showing Instead of Display Label - FIXED** ✅

**Problem:**
In the "Selected Fields" section, the child field was showing the ID (e.g., `1057335000000000401`) instead of its display label.

**Root Cause:**
The `childFieldLabel` was looking up the field in the filtered `displayChildren` list, but when editing a mapping, that field might not be in the filtered list if it wasn't from the current layout's fields.

**Solution:**
Changed the lookup to search in the full `children` list instead:

```javascript
// Before ❌
const childFieldLabel = getFieldDisplayLabel(selectedChildField, displayChildren)

// After ✅
const childFieldLabel = getFieldDisplayLabel(selectedChildField, children)
```

Also updated parent field lookup for consistency:

```javascript
// Before ❌
const parentFieldLabel = getFieldDisplayLabel(selectedParentField, displayParents)

// After ✅
const parentFieldLabel = getFieldDisplayLabel(selectedParentField, parents)
```

**Result:** Child field now displays its proper display label (e.g., "Status" instead of "1057335000000000401")

---

### 2. **Mapping Values List Showing "-None-" Instead of Data - FIXED** ✅

**Problem:**
When editing a mapping, the Step 2 section showed "-None-" or no parent values, even though the mapping had existing values saved.

**Root Cause:**
The mapping values are displayed based on `parentObj.allowedValues`, which comes from the API response. However:
1. When editing, the `mappingValues` state is populated with existing mappings
2. But if those parent values aren't in the fresh `parentObj.allowedValues` list, they won't display
3. This creates a situation where saved mappings are invisible

**Solution:**
Changed the mapping display to show **both** allowed values AND existing mapping values:

```javascript
// Get all parent values: from allowedValues + existing mappings
const allParentValues = new Set([
  ...parentObj.allowedValues,
  ...Object.keys(mappingValues)
])

// Then map over allParentValues instead of just parentObj.allowedValues
Array.from(allParentValues).map(parentVal => (
  // render mapping for each value
))
```

This ensures:
- ✅ All parent values from schema are shown
- ✅ All existing mapped values are shown (even if not in latest schema)
- ✅ User can edit, add, or remove mappings
- ✅ No data loss when values change

**Result:** Mapping values now properly display both schema values and existing mappings

---

## Files Modified

### `frontend/src/components/MappingViewer.jsx`

**Changes:**
1. Line ~140-145: Updated `parentFieldLabel` and `childFieldLabel` to use full lists instead of filtered lists
2. Line ~427-460: Updated mapping values display logic to combine allowed values with existing mappings

---

## How It Works Now

### Displaying Selected Fields
```
User edits mapping with:
  - Parent Field ID: "1057335000013022001"
  - Child Field ID: "1057335000000000401"

Lookup in full lists:
  - Find parent in parents[] → "Priority"
  - Find child in children[] → "Status"

Display:
  Selected Fields
  Parent Field: Priority ✓
  Child Field: Status ✓
```

### Displaying Mapping Values
```
When editing a mapping:
  
1. parentObj.allowedValues = ["High", "Medium", "Low"]  (from API)
2. mappingValues = {
     "High": ["Urgent"],
     "Critical": ["Blocker"]  (existing but not in allowed values)
   }

3. Create union:
   allParentValues = ["High", "Medium", "Low", "Critical"]

4. Display all in form:
   - High [Urgent, ...] ✓
   - Medium [...] ✓
   - Low [...] ✓
   - Critical [Blocker, ...] ✓ (Previously would be hidden!)
```

---

## Testing Checklist

- [ ] Edit a mapping
- [ ] Verify child field shows display label, not ID
- [ ] Verify parent field shows display label, not ID
- [ ] Verify "Selected Fields" section shows correct labels
- [ ] Verify Step 2 shows parent values from schema
- [ ] Verify Step 2 shows existing mapping values
- [ ] Verify combined list shows all parent values
- [ ] Add new mapping value
- [ ] Modify existing mapping value
- [ ] Save mapping successfully
- [ ] Verify mapping persists with all values

---

## Edge Cases Handled

1. **Field not in lookup list** → Returns the ID as fallback
2. **Empty allowed values** → Shows existing mappings only
3. **New values added to schema** → Shows new values immediately
4. **Values removed from schema** → Existing mappings still visible for editing

---

## Summary

✅ **Child field label now displays correctly** - Shows "Status" instead of ID  
✅ **Parent field label displays correctly** - Shows proper display name  
✅ **Mapping values no longer hidden** - All values displayed (schema + existing)  
✅ **Better user experience** - Clear visibility of what's being mapped  
✅ **No data loss** - Existing mappings remain visible and editable  

**Status:** Ready for testing ✨

---

**Related Documentation:**
- FIELD_DISPLAY_FIX.md - Field label display improvements
- MAPPING_UPDATE_FIX.md - Content-Type and field filtering fixes
- AUTO_LOADING_FIX.md - Auto-loading of departments and layouts

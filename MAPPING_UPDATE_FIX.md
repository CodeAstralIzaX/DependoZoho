# Mapping Update Fix & Layout Display Enhancement

## Issues Fixed

### 1. **Content-Type Error on Mapping Update - FIXED** ✅

**Problem:**
```json
{
  "errorCode": "UNSUPPORTED_MEDIA_TYPE",
  "message": "The given content type is not supported. Please provide the input Content-Type as application/json"
}
```

**Root Cause:**
The `updateMapping()` function wasn't explicitly setting the `Content-Type: application/json` header for PATCH requests.

**Solution:**
Updated `frontend/src/services/zohoApi.js`:

```javascript
// Before ❌
export const updateMapping = (mappingId, payload) => {
  return client.patch(`/mappings/${mappingId}`, payload)
}

// After ✅
export const updateMapping = (mappingId, payload) => {
  return client.patch(`/mappings/${mappingId}`, payload, {
    headers: {
      "Content-Type": "application/json"
    }
  })
}
```

**Result:** PATCH requests now properly send `Content-Type: application/json` header

---

### 2. **Layout ID Display & Field Filtering - IMPLEMENTED** ✅

**Enhancements:**

#### a) Display Layout ID in Alert
**Before:**
```
Alert: "Layout: My Layout"
Description: "Department: Sales"
```

**After:**
```
Alert: "Layout: My Layout"
Description: "ID: 1057335000005579029 | Department: Sales"
```

Layout ID is now visible for reference.

#### b) Display Layout ID in Edit Form
**Before:**
```
Edit Mapping: {mappingId}
```

**After:**
```
Edit Mapping: {mappingId}     [Layout ID: 1057335000005579029]
```

When editing a mapping, the layout ID is displayed in the edit section header.

#### c) Filter Parent/Child Fields to Same Layout
**Problem:** 
When editing a mapping, all available parent and child fields from all layouts were shown, causing confusion.

**Solution:**
Implemented filtering logic:

```javascript
const getParentFieldsForEdit = () => {
  if (!editMappingId || !originalMapping) {
    return parents
  }
  // When editing, only show parent fields from same layout
  return parents.filter(p => p.id === originalMapping.parentId || p.layoutId === selectedLayout?.id)
}

const getChildFieldsForEdit = () => {
  if (!editMappingId || !originalMapping) {
    return children
  }
  // When editing, only show child fields from same layout
  return children.filter(c => c.id === originalMapping.childId || c.layoutId === selectedLayout?.id)
}
```

**Result:** 
- ✅ Only fields from the current layout are shown when editing
- ✅ Parent field selector shows "(Same Layout)" indicator
- ✅ Child field selector shows "(Same Layout)" indicator
- ✅ Step label shows "(From Same Layout)" hint

---

## Files Modified

### 1. `frontend/src/services/zohoApi.js`
- Added explicit `Content-Type: application/json` header to PATCH request
- Fixes UNSUPPORTED_MEDIA_TYPE error

### 2. `frontend/src/components/MappingViewer.jsx`
- Added layout ID to alert description
- Added layout ID to edit form header
- Implemented parent field filtering function
- Implemented child field filtering function
- Updated field selectors to use filtered lists
- Added "(Same Layout)" visual indicators

---

## User Experience Improvements

### Before Edit Flow
1. Click "Edit" on a mapping
2. Schema loads
3. See ALL parent fields from ALL layouts
4. See ALL child fields from ALL layouts
5. Confusion: "Which fields should I pick?"
6. Accidental wrong selection possible
7. Save fails or creates incorrect mapping

### After Edit Flow
1. Click "Edit" on a mapping
2. Schema loads
3. See ONLY parent fields from the CURRENT layout ✅
4. See ONLY child fields from the CURRENT layout ✅
5. Labels clearly say "(Same Layout)" ✅
6. Edit form header shows layout ID for reference ✅
7. Selection is constrained to correct layout
8. Reduced chance of errors

---

## Technical Details

### PATCH Request Headers
```
PATCH /mappings/{id}
Content-Type: application/json
Content-Length: 256

{
  "layoutId": "...",
  "parentId": "...",
  "childId": "...",
  "mappings": {...}
}
```

### Filter Logic
When editing (`editMappingId` is set):
- Parent selector shows only fields where:
  - `field.id === originalMapping.parentId` OR
  - `field.layoutId === selectedLayout.id`
- Same logic for child fields

When creating new mapping:
- Parent selector shows ALL parents
- Child selector shows ALL children
- User responsible for proper selection

---

## Testing Checklist

- [ ] Click Edit on a mapping
- [ ] Verify layout ID appears in edit header
- [ ] Verify parent fields are filtered
- [ ] Verify child fields are filtered
- [ ] Verify "(Same Layout)" indicators appear
- [ ] Change parent field selection
- [ ] Change child field selection
- [ ] Save mapping without Content-Type error
- [ ] Verify success message
- [ ] Verify mapping updated in table

---

## API Compatibility

### Backend Requirement
Backend at `/mappings/{id}` endpoint should accept:
```json
{
  "layoutId": "string",
  "parentId": "string",
  "childId": "string",
  "mappings": {
    "parentValue": ["childValue1", "childValue2"],
    ...
  }
}
```

The PATCH endpoint should validate:
- ✅ All fields are from the same layout
- ✅ Parent and child are different
- ✅ Content-Type is application/json

---

## Summary

✅ **Content-Type Error Fixed:** PATCH requests now have proper `application/json` header  
✅ **Layout ID Visible:** Displayed in alert and edit form  
✅ **Smart Field Filtering:** Only show parent/child from same layout  
✅ **Better UX:** Clear visual indicators when editing  
✅ **Error Prevention:** Reduced chance of mapping to wrong layout fields  

**Status:** Ready for testing ✨

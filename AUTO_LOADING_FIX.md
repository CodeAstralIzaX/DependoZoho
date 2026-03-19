# Auto-Loading & 422 Error Fix - March 15, 2026

## Issues Fixed

### 1. **422 Unprocessable Entity Error on `/layouts` endpoint**

**Problem:**
```
GET /layouts?module=1057335000005579029&status=active&limit=200&from=0 HTTP/1.1" 422 Unprocessable Entity
```

The `module` parameter was being sent as a department ID (large number) instead of the expected string value like `"tickets"`.

**Root Cause:**
`DepartmentLayoutSelector.jsx` was calling:
```javascript
fetchLayouts(selectedDepartment.id)  // ❌ Wrong - passes ID as module
```

But `fetchLayouts()` signature is:
```javascript
fetchLayouts(module = "tickets", departmentId = "", status = "active", limit = 200, from_index = 0)
```

**Solution:**
Updated the call to explicitly pass all parameters in correct order:
```javascript
fetchLayouts("tickets", selectedDepartment.id, "active", 200, 0)  // ✅ Correct
```

---

### 2. **Auto-Loading Not Working**

**Problem:**
Departments and layouts weren't automatically loading after authentication.

**Root Cause:**
- `DepartmentLayoutSelector` was calling `loadDepartments()` on component mount
- BUT it wasn't watching `authStatus` from context
- So it would load BEFORE authentication succeeded
- After auth succeeded, nothing triggered the reload

**Solution:**
Added `authStatus` to the useEffect dependency:

**Before:**
```javascript
useEffect(() => {
  loadDepartments()
}, [loadDepartments])  // Only runs once on mount
```

**After:**
```javascript
useEffect(() => {
  if (authStatus) {
    loadDepartments()  // Auto-runs when authenticated
  }
}, [authStatus, loadDepartments])  // Watches authStatus
```

---

## Auto-Loading Flow (Complete)

Now the flow works as expected:

1. **User authenticates**
   ```
   AuthPanel.jsx → authenticate() → setAuthenticated(true)
   ```

2. **AuthStatus changes in context**
   ```
   AppContext.jsx → setAuthStatus = true
   ```

3. **DepartmentLayoutSelector detects auth status change**
   ```
   useEffect([authStatus]) → loadDepartments()
   ```

4. **Departments auto-load**
   ```
   fetchDepartments() → GET /departments?isEnabled=true
   → departments appear in dropdown
   ```

5. **User selects department**
   ```
   selectDepartment() → selectedDepartment changes
   ```

6. **Layouts auto-load for that department**
   ```
   useEffect([selectedDepartment]) → loadLayouts()
   → fetchLayouts("tickets", departmentId, ...)
   → GET /layouts?module=tickets&departmentId=XXX
   → layouts appear in dropdown
   ```

7. **User selects layout**
   ```
   selectLayout() → selectedLayout changes
   ```

8. **All downstream components use selected layout**
   ```
   AvailableFields, MappingViewer, ExcelUploader all use selectedLayout.id
   ```

---

## Files Modified

### 1. `/frontend/src/components/DepartmentLayoutSelector.jsx`

**Changes:**
- Added `authStatus` to context destructuring
- Updated `loadLayouts()` call to use correct parameter order
- Modified useEffect to watch `authStatus` dependency
- Auto-loads departments when `authStatus` becomes true

**Key Code:**
```javascript
const { authStatus, ... } = useAppContext()

// Load layouts with correct parameters
const res = await fetchLayouts("tickets", selectedDepartment.id, "active", 200, 0)

// Watch authStatus for auto-load
useEffect(() => {
  if (authStatus) {
    loadDepartments()
  }
}, [authStatus, loadDepartments])
```

---

## Testing Checklist

- [ ] Log in successfully
- [ ] Verify departments automatically load (no manual click needed)
- [ ] Select a department
- [ ] Verify layouts automatically load for that department
- [ ] No 422 errors in network tab
- [ ] All components receive correct layout data
- [ ] Proceed with mapping fields/uploading excel

---

## Technical Details

### API Endpoints Called

**After Authentication:**
1. `GET /departments?isEnabled=true&limit=200&from=0`
   - Response: List of departments
   - Triggered: Automatically when authStatus = true

2. `GET /layouts?module=tickets&departmentId={id}&status=active&limit=200&from=0`
   - Response: List of layouts for that department
   - Triggered: Automatically when department selected
   - Parameters: module="tickets", status="active"

### No More Manual Clicking

**Before (Broken):**
- Auth → Manually click "Refresh Departments" button
- Select department → Manually click "Refresh Layouts" button

**After (Fixed):**
- Auth → Departments automatically load
- Select department → Layouts automatically load

---

## Error Prevention

The fix prevents:
- ❌ 422 Unprocessable Entity errors
- ❌ Wrong parameter types being sent
- ❌ User confusion about when to click buttons
- ❌ Race conditions from timing issues

---

## Summary

✅ **422 Error Fixed:** Correct parameter order for `fetchLayouts()`  
✅ **Auto-Loading Implemented:** Departments load on auth, layouts load on dept selection  
✅ **Better UX:** No more manual button clicking required  
✅ **More Reliable:** Uses React context and useEffect hooks properly

**Status:** Ready for testing ✨

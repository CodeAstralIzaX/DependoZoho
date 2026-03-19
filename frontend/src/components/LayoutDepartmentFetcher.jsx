import { Card, Select, Spin, Alert, Button, Divider, Space } from "antd"
import { useState, useCallback, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

function LayoutDepartmentFetcher() {

  const [departments, setDepartments] = useState([])
  const [layouts, setLayouts] = useState([])
  const [selectedDept, setSelectedDept] = useState("")
  const [selectedLayout, setSelectedLayout] = useState("")
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [loadingLayouts, setLoadingLayouts] = useState(false)
  const [error, setError] = useState("")

  /* =====================================================
     Fetch Departments
  ===================================================== */
  const fetchDepartments = useCallback(async () => {
    try {
      setLoadingDepts(true)
      setError("")
      
      const response = await axios.get(`${API}/departments`, {
        timeout: 15000
      })

      const deptList = response?.data?.data || []
      setDepartments(deptList)
      
      if (deptList.length === 0) {
        setError("No departments found. Please check your credentials.")
      }
    } catch (err) {
      console.error("Error fetching departments:", err)
      setError(
        err?.response?.data?.detail || 
        err.message || 
        "Failed to fetch departments"
      )
    } finally {
      setLoadingDepts(false)
    }
  }, [])

  /* =====================================================
     Fetch Layouts for Selected Department
  ===================================================== */
  const fetchLayouts = useCallback(async (deptId) => {
    if (!deptId) {
      setLayouts([])
      return
    }

    try {
      setLoadingLayouts(true)
      setError("")
      
      const response = await axios.get(
        `${API}/layouts?departmentId=${deptId}`,
        { timeout: 15000 }
      )

      const layoutList = response?.data?.data || []
      setLayouts(layoutList)
      
      if (layoutList.length === 0) {
        setError(`No layouts found for this department.`)
      }
    } catch (err) {
      console.error("Error fetching layouts:", err)
      setError(
        err?.response?.data?.detail || 
        err.message || 
        "Failed to fetch layouts"
      )
    } finally {
      setLoadingLayouts(false)
    }
  }, [])

  /* =====================================================
     Handle Department Selection
  ===================================================== */
  const handleDeptChange = (deptId) => {
    setSelectedDept(deptId)
    setSelectedLayout("") // Reset layout when dept changes
    if (deptId) {
      fetchLayouts(deptId)
    }
  }

  /* =====================================================
     Handle Layout Selection and Store
  ===================================================== */
  const handleLayoutSelect = (layoutId) => {
    setSelectedLayout(layoutId)
    const selectedLayoutObj = layouts.find(l => l.id === layoutId)
    
    if (selectedLayoutObj) {
      // Store in localStorage for easy access in other components
      localStorage.setItem('selectedLayoutId', layoutId)
      localStorage.setItem('selectedDepartmentId', selectedDept)
      localStorage.setItem('selectedLayout', JSON.stringify(selectedLayoutObj))
    }
  }

  // Auto-fetch departments on mount
  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const selectedDeptName = departments.find(d => d.id === selectedDept)?.name || ""
  const selectedLayoutName = layouts.find(l => l.id === selectedLayout)?.layoutName || ""

  return (
    <Card 
      title="Select Layout & Department" 
      loading={loadingDepts}
      extra={
        <Button 
          onClick={fetchDepartments} 
          loading={loadingDepts}
          size="small"
        >
          Refresh
        </Button>
      }
    >
      {error && (
        <Alert 
          message="Error" 
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 20 }}
          onClose={() => setError("")}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 500, marginBottom: 10 }}>Step 1: Select Department</p>
        <Select
          placeholder="Select a department"
          style={{ width: "100%" }}
          value={selectedDept || undefined}
          onChange={handleDeptChange}
          options={departments.map(dept => ({
            label: `${dept.name}${dept.isDefault ? ' (Default)' : ''}`,
            value: dept.id,
            description: dept.description
          }))}
          optionLabelProp="label"
          loading={loadingDepts}
        />
        {selectedDeptName && (
          <div style={{ marginTop: 10, padding: "8px", background: "#f0f5ff", borderRadius: "4px" }}>
            <strong>Selected:</strong> {selectedDeptName}
          </div>
        )}
      </div>

      <Divider />

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 500, marginBottom: 10 }}>Step 2: Select Layout</p>
        <Spin spinning={loadingLayouts}>
          <Select
            placeholder={selectedDept ? "Loading layouts..." : "Select a department first"}
            style={{ width: "100%" }}
            value={selectedLayout || undefined}
            onChange={handleLayoutSelect}
            options={layouts.map(layout => ({
              label: `${layout.layoutName}${layout.isDefaultLayout ? ' (Default)' : ''}`,
              value: layout.id
            }))}
            disabled={!selectedDept || loadingLayouts}
          />
        </Spin>
        {selectedLayoutName && (
          <div style={{ marginTop: 10, padding: "8px", background: "#f6ffed", borderRadius: "4px" }}>
            <strong>Selected:</strong> {selectedLayoutName}
            <br />
            <small>ID: {selectedLayout}</small>
          </div>
        )}
      </div>

      {selectedLayout && selectedDept && (
        <Alert 
          message="Layout & Department Selected Successfully" 
          description="You can now use the Layout ID in other sections (MappingViewer, Excel Upload, etc.)"
          type="success"
          showIcon
          style={{ marginTop: 20 }}
        />
      )}

    </Card>
  )
}

export default LayoutDepartmentFetcher

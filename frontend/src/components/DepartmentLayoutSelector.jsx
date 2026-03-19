import { Card, Select, Button, Space, Alert, Spin, message, Row, Col, Statistic } from "antd"
import { useState, useEffect, useCallback } from "react"
import { fetchDepartments, fetchLayouts } from "../services/zohoApi"
import { useAppContext } from "../context/AppContext"

function DepartmentLayoutSelector() {
  const {
    selectedDepartment,
    selectedLayout,
    selectDepartment,
    selectLayout,
    updateDepartments,
    updateLayouts,
    departments,
    layouts,
    authStatus
  } = useAppContext()

  const [loading, setLoading] = useState(false)
  const [loadingLayouts, setLoadingLayouts] = useState(false)

  /* =====================================================
     Load Departments
  ===================================================== */
  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchDepartments()
      const depts = res?.data?.data || []
      updateDepartments(depts)
      
      if (depts.length === 0) {
        message.info("No departments found")
      } else {
        message.success(`Loaded ${depts.length} department(s)`)
      }
    } catch (err) {
      console.error("Error loading departments:", err)
      message.error(err?.response?.data?.detail || "Failed to load departments")
    } finally {
      setLoading(false)
    }
  }, [updateDepartments])

  /* =====================================================
     Load Layouts for Selected Department
  ===================================================== */
  const loadLayouts = useCallback(async () => {
    if (!selectedDepartment) {
      message.warning("Select a department first")
      return
    }

    try {
      setLoadingLayouts(true)
      const res = await fetchLayouts("tickets", selectedDepartment.id, "active", 200, 0)
      const layoutsList = res?.data?.data || []
      updateLayouts(layoutsList)
      
      if (layoutsList.length === 0) {
        message.info("No layouts found for this department")
      } else {
        message.success(`Loaded ${layoutsList.length} layout(s)`)
      }
    } catch (err) {
      console.error("Error loading layouts:", err)
      message.error(err?.response?.data?.detail || "Failed to load layouts")
    } finally {
      setLoadingLayouts(false)
    }
  }, [selectedDepartment, updateLayouts])

  /* =====================================================
     Load departments on component mount or when authenticated
  ===================================================== */
  useEffect(() => {
    if (authStatus) {
      loadDepartments()
    }
  }, [authStatus, loadDepartments])

  /* =====================================================
     Load layouts when department changes
  ===================================================== */
  useEffect(() => {
    if (selectedDepartment) {
      loadLayouts()
    }
  }, [selectedDepartment, loadLayouts])

  return (
    <Card title="Setup: Department & Layout Selection" style={{ marginBottom: 20 }}>
      <Alert
        title="Setup Guide"
        description="1. Select a department 2. Choose a layout from that department. These selections will be used for all operations below."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Spin spinning={loading || loadingLayouts}>
        <Row gutter={[16, 16]}>
          {/* Department Selection */}
          <Col xs={24} sm={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Step 1: Select Department *
              </label>
              <Select
                placeholder="Choose a department"
                style={{ width: "100%" }}
                value={selectedDepartment?.id || undefined}
                onChange={(deptId) => {
                  const dept = departments.find(d => d.id === deptId)
                  selectDepartment(dept)
                }}
                options={departments.map(dept => ({
                  label: dept.name,
                  value: dept.id,
                  desc: dept.description
                }))}
                optionLabelProp="label"
              />
              {selectedDepartment && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0f5ff", borderRadius: "4px" }}>
                  <strong style={{ color: "#1890ff" }}>✓ Selected:</strong> {selectedDepartment.name}
                </div>
              )}
            </div>
          </Col>

          {/* Layout Selection */}
          <Col xs={24} sm={24} md={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
                Step 2: Select Layout *
              </label>
              <Select
                placeholder={selectedDepartment ? "Choose a layout" : "Select department first"}
                style={{ width: "100%" }}
                disabled={!selectedDepartment}
                value={selectedLayout?.id || undefined}
                onChange={(layoutId) => {
                  const layout = layouts.find(l => l.id === layoutId)
                  selectLayout(layout)
                }}
                options={layouts.map(layout => ({
                  label: layout.layoutName || layout.layoutDisplayName,
                  value: layout.id,
                  isDefault: layout.isDefaultLayout
                }))}
                optionLabelProp="label"
              />
              {selectedLayout && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f6ffed", borderRadius: "4px" }}>
                  <strong style={{ color: "#52c41a" }}>✓ Selected:</strong> {selectedLayout.layoutName || selectedLayout.layoutDisplayName}
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Status Summary */}
        {selectedDepartment && selectedLayout && (
          <div style={{ marginTop: 20, padding: 16, background: "#fafafa", borderRadius: "6px", border: "1px solid #f0f0f0" }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Statistic
                  title="Current Department"
                  value={selectedDepartment.name}
                  styles={{ content: { color: "#1890ff", fontSize: "16px" } }}
                />
              </Col>
              <Col xs={24} sm={12}>
                <Statistic
                  title="Current Layout"
                  value={selectedLayout.layoutName || selectedLayout.layoutDisplayName}
                  styles={{ content: { color: "#52c41a", fontSize: "16px" } }}
                />
              </Col>
            </Row>
            <Alert
              title="Ready to Proceed"
              description="You can now create, edit, or delete dependency mappings using the selected department and layout."
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}

        {/* Refresh Buttons */}
        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button onClick={loadDepartments} loading={loading}>
            Refresh Departments
          </Button>
          <Button
            onClick={loadLayouts}
            loading={loadingLayouts}
            disabled={!selectedDepartment}
            type="primary"
          >
            Refresh Layouts
          </Button>
        </div>
      </Spin>
    </Card>
  )
}

export default DepartmentLayoutSelector

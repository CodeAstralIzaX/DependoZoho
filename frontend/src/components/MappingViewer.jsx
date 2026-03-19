import { Card, Input, Button, Table, Tag, message, Popconfirm, Divider, Select, Alert, Space, Modal } from "antd"
import { useState, useEffect, useCallback } from "react"
import { fetchMappings, deleteMapping, fetchLayoutFields, createMapping, updateMapping, fetchLayouts } from "../services/zohoApi"
import { useAppContext } from "../context/AppContext"
import { ExclamationCircleOutlined } from "@ant-design/icons"

function MappingViewer() {

  const { selectedLayout, selectedDepartment, mappingDraft, saveMappingDraft, clearMappingDraft, layouts, departments } = useAppContext()
  
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  /* ===============================
     Edit State
  =============================== */
  const [editMappingId, setEditMappingId] = useState("")
  const [originalMapping, setOriginalMapping] = useState(null)
  const [selectedParentField, setSelectedParentField] = useState("")
  const [selectedChildField, setSelectedChildField] = useState("")
  const [mappingValues, setMappingValues] = useState({})
  const [parents, setParents] = useState([])
  const [children, setChildren] = useState([])
  const [schemaLoaded, setSchemaLoaded] = useState(false)

  /* ===============================
     Clone Mapping State
  =============================== */
  const [cloneMappingVisible, setCloneMappingVisible] = useState(false)
  const [cloneSourceMapping, setCloneSourceMapping] = useState(null)
  const [cloneTargetDepartment, setCloneTargetDepartment] = useState("") // New: target department
  const [cloneTargetLayout, setCloneTargetLayout] = useState("") // New: target layout selection
  const [cloneTargetLayouts, setCloneTargetLayouts] = useState([]) // New: layouts from target department
  const [cloneNewParent, setCloneNewParent] = useState("")
  const [cloneNewChild, setCloneNewChild] = useState("")
  const [cloneSchemasLoaded, setCloneSchemasLoaded] = useState(false)
  const [cloneTargetParents, setCloneTargetParents] = useState([]) // New: parents from target layout
  const [cloneTargetChildren, setCloneTargetChildren] = useState([]) // New: children from target layout

  /* ===============================
     Load persisted mapping draft on component mount
  =============================== */
  useEffect(() => {
    if (mappingDraft) {
      setEditMappingId(mappingDraft.editMappingId || "")
      setOriginalMapping(mappingDraft.originalMapping || null)
      setSelectedParentField(mappingDraft.selectedParentField || "")
      setSelectedChildField(mappingDraft.selectedChildField || "")
      setMappingValues(mappingDraft.mappingValues || {})
    }
  }, [])

  /* ===============================
     Auto-save mapping draft whenever form values change
  =============================== */
  useEffect(() => {
    const draft = {
      editMappingId,
      originalMapping,
      selectedParentField,
      selectedChildField,
      mappingValues
    }
    // Always save the draft whenever any form value changes
    saveMappingDraft(draft)
  }, [editMappingId, originalMapping, selectedParentField, selectedChildField, mappingValues, saveMappingDraft])

  /* ===============================
     Fetch Mapping List
  =============================== */
  const load = useCallback(async () => {
    if (!selectedLayout?.id) {
      message.warning("Select a layout first from the Department & Layout selector")
      return
    }

    try {
      setLoading(true)
      const res = await fetchMappings(selectedLayout.id)
      const mappings = res?.data?.data || []
      setData(mappings)
      if (mappings.length === 0) {
        message.info("No mappings found for this layout")
      }
    } catch (err) {
      console.error("Error loading mappings:", err)
      message.error(err?.response?.data?.detail || "Failed to load mappings")
    } finally {
      setLoading(false)
    }
  }, [selectedLayout])

  /* ===============================
     Revoke Mapping
  =============================== */
  const revokeMapping = async (id) => {
    try {
      setLoading(true)
      await deleteMapping(id)
      message.success("Mapping revoked successfully")
      await load()
    } catch (err) {
      console.error("Error revoking mapping:", err)
      message.error(err?.response?.data?.detail || "Failed to revoke mapping")
    } finally {
      setLoading(false)
    }
  }

  /* ===============================
     Load Schema for Parent/Child Fields
  =============================== */
  const loadSchema = useCallback(async () => {
    if (!selectedLayout?.id) {
      message.warning("Select a layout first from the Department & Layout selector")
      return
    }

    try {
      setLoading(true)
      const res = await fetchLayoutFields(selectedLayout.id)
      setParents(res?.data?.parents || [])
      setChildren(res?.data?.children || [])
      setSchemaLoaded(true)
      message.success("Schema loaded successfully")
    } catch (err) {
      console.error("Error loading schema:", err)
      message.error(err?.response?.data?.detail || "Failed to load schema")
      setSchemaLoaded(false)
    } finally {
      setLoading(false)
    }
  }, [selectedLayout])

  /* ===============================
     Edit Handler
  =============================== */
  const handleEdit = (mapping) => {
    setEditMappingId(mapping.id)
    setOriginalMapping(mapping)
    setSelectedParentField(mapping.parentId)
    setSelectedChildField(mapping.childId)
    setMappingValues({ ...mapping.mappings })

    // Auto-load schema if not already loaded
    if (!schemaLoaded) {
      loadSchema()
    }
  }

  /* ===============================
     Clone Handler - Reuse mapping for another layout
  =============================== */
  const handleCloneMapping = (mapping) => {
    setCloneSourceMapping(mapping)
    setCloneMappingVisible(true)
    setCloneNewParent("")
    setCloneNewChild("")
    setCloneSchemasLoaded(false)
  }

  const cloneMapping = async () => {
    if (!cloneTargetDepartment || !cloneTargetLayout) {
      message.warning("Select both target department and layout")
      return
    }

    try {
      setLoading(true)
      
      // Use the SAME parent and child fields from source mapping
      const payload = {
        layoutId: cloneTargetLayout, // Clone to the TARGET layout
        parentId: cloneSourceMapping.parent.id, // Keep same parent field
        childId: cloneSourceMapping.child.id, // Keep same child field
        mappings: cloneSourceMapping.mappings // Reuse the exact same mappings
      }

      await createMapping(payload)
      message.success("Mapping cloned successfully to target layout!")
      
      setCloneMappingVisible(false)
      setCloneSourceMapping(null)
      setCloneTargetDepartment("")
      setCloneTargetLayout("")
      
      await load()
    } catch (err) {
      console.error("Error cloning mapping:", err)
      message.error(err?.response?.data?.detail || "Failed to clone mapping")
    } finally {
      setLoading(false)
    }
  }

  /* ===============================
     Fetch Layout Fields for Clone - Get fields from target layout
  =============================== */
  const fetchLayoutFieldsForClone = useCallback(async (targetLayout) => {
    if (!targetLayout?.id || !selectedDepartment?.id) return

    try {
      const res = await fetchLayoutFields(selectedDepartment.id, targetLayout.id)
      if (res.status === 200 && res.data.data) {
        const { parents: parentFields, children: childFields } = res.data.data
        setCloneTargetParents(parentFields || [])
        setCloneTargetChildren(childFields || [])
        setCloneSchemasLoaded(true)
      }
    } catch (err) {
      console.error("Error fetching target layout fields:", err)
      message.error("Failed to load fields from target layout")
    }
  }, [selectedDepartment?.id])

  /* ===============================
     Smart Load - Try to find existing mappings with same parent/child names
  =============================== */
  const smartLoadMappings = useCallback(async (parentId, childId) => {
    if (!parentId || !childId || !data.length) return

    // Find a mapping with same parent and child field names in current layout
    const parentField = parents.find(p => p.id === parentId)
    const childField = children.find(c => c.id === childId)

    if (!parentField || !childField) return

    // Look for existing mapping with same field names
    const existingMapping = data.find(m => 
      m.parent?.displayLabel === parentField.displayLabel && 
      m.child?.displayLabel === childField.displayLabel
    )

    if (existingMapping && existingMapping.mappings) {
      setMappingValues({ ...existingMapping.mappings })
      message.success("✓ Found and loaded existing mappings with same field names!")
    }
  }, [parents, children, data])

  /* ===============================
     Reload mappings from draft
  =============================== */
  const reloadFromDraft = () => {
    if (mappingDraft) {
      setSelectedParentField(mappingDraft.selectedParentField || "")
      setSelectedChildField(mappingDraft.selectedChildField || "")
      setMappingValues(mappingDraft.mappingValues || {})
      message.success("✓ Values reloaded from saved draft")
    } else {
      message.info("No saved draft found")
    }
  }

  /* ===============================
     Filter parent/child to show only fields from current mapping's parent/child layout
  =============================== */
  const getParentFieldsForEdit = () => {
    if (!editMappingId || !originalMapping) {
      return parents
    }
    // When editing, only show parent fields and ensure they're from the same layout
    return parents.filter(p => p.id === originalMapping.parentId || p.layoutId === selectedLayout?.id)
  }

  const getChildFieldsForEdit = () => {
    if (!editMappingId || !originalMapping) {
      return children
    }
    // When editing, only show child fields and ensure they're from the same layout
    return children.filter(c => c.id === originalMapping.childId || c.layoutId === selectedLayout?.id)
  }

  const displayParents = editMappingId ? getParentFieldsForEdit() : parents
  const displayChildren = editMappingId ? getChildFieldsForEdit() : children

  /* ===============================
     Get field object by ID for display purposes
  =============================== */
  const getFieldDisplayLabel = (fieldId, fieldList) => {
    if (!fieldId) return "Not selected"
    const field = fieldList.find(f => f.id === fieldId)
    return field ? field.displayLabel : fieldId
  }

  const parentFieldLabel = getFieldDisplayLabel(selectedParentField, parents)
  const childFieldLabel = getFieldDisplayLabel(selectedChildField, children)

  /* ===============================
     Mapping Value Handler
  =============================== */
  const updateMappingValues = (parentVal, childVals) => {
    setMappingValues(prev => ({
      ...prev,
      [parentVal]: childVals && childVals.length > 0 ? childVals : undefined
    }))
  }

  const clearMappingState = () => {
    setEditMappingId("")
    setOriginalMapping(null)
    setSelectedParentField("")
    setSelectedChildField("")
    setMappingValues({})
    clearMappingDraft()
  }

  /* ===============================
     Validate Mapping
  =============================== */
  const validateMapping = () => {
    if (!selectedLayout?.id) {
      message.error("Select a layout from the Department & Layout selector")
      return false
    }
    if (!selectedParentField) {
      message.error("Select a parent field")
      return false
    }
    if (!selectedChildField) {
      message.error("Select a child field")
      return false
    }
    if (selectedParentField === selectedChildField) {
      message.error("Parent and child fields must be different")
      return false
    }
    
    const validMappings = Object.values(mappingValues).filter(v => v && v.length > 0)
    if (validMappings.length === 0) {
      message.error("Map at least one parent value to child values")
      return false
    }
    
    return true
  }

  /* ===============================
     Save (Create / Patch) Mapping
  =============================== */
  const saveMapping = async () => {
    if (!validateMapping()) {
      return
    }

    // Filter out empty mappings
    const cleanMappings = Object.fromEntries(
      Object.entries(mappingValues).filter(([_, vals]) => vals && vals.length > 0)
    )

    const payload = {
      layoutId: selectedLayout.id,
      parentId: selectedParentField,
      childId: selectedChildField,
      mappings: cleanMappings
    }

    try {
      setLoading(true)
      if (editMappingId) {
        await updateMapping(editMappingId, payload)
        message.success("Mapping updated successfully")
      } else {
        await createMapping(payload)
        message.success("New mapping created successfully")
      }
      clearMappingState()
      setSchemaLoaded(false)
      setParents([])
      setChildren([])
      await load()
    } catch (err) {
      console.error("Error saving mapping:", err)
      message.error(err?.response?.data?.detail || "Mapping save failed")
    } finally {
      setLoading(false)
    }
  }

  const parentObj = parents.find(p => p.id === selectedParentField) || { allowedValues: [] }
  const childObj = children.find(c => c.id === selectedChildField) || { allowedValues: [] }

  /* ===============================
     Table Columns
  =============================== */
  const columns = [
    { 
      title: "Mapping ID", 
      dataIndex: "id",
      width: 150
    },
    { 
      title: "Parent Field", 
      render: row => row?.parent?.displayLabel || "-",
      width: 150
    },
    { 
      title: "Child Field", 
      render: row => row?.child?.displayLabel || "-",
      width: 150
    },
    {
      title: "Mappings Count",
      render: row => {
        const map = row?.mappings || {}
        const totalMappings = Object.values(map).reduce((acc, arr) => acc + (arr?.length || 0), 0)
        return <Tag color="cyan">{totalMappings} mappings</Tag>
      },
      width: 120
    },
    {
      title: "Actions",
      render: row => (
        <Space size="small">
          <Button 
            size="small" 
            type="primary"
            onClick={() => handleEdit(row)}
          >
            Edit
          </Button>
          <Button
            size="small"
            onClick={() => handleCloneMapping(row)}
            title="Clone this mapping to another layout"
          >
            Clone
          </Button>
          <Popconfirm 
            title="Revoke Mapping?" 
            description="This action cannot be undone."
            onConfirm={() => revokeMapping(row.id)}
          >
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
      width: 180
    }
  ]

  /* ===============================
     UI Render
  =============================== */
  return (
    <Card title="Dependency Mappings">

      <div style={{ marginBottom: 20 }}>
        {selectedLayout ? (
          <Alert
            message={`Layout: ${selectedLayout.layoutName || selectedLayout.layoutDisplayName}`}
            description={`ID: ${selectedLayout.id} | Department: ${selectedDepartment ? selectedDepartment.name : "No department selected"}`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            title="No layout selected"
            description="Please select a layout from the Department & Layout selector above"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Space>
          <Button 
            type="primary" 
            onClick={load} 
            loading={loading}
            disabled={!selectedLayout}
          >
            Fetch Mappings
          </Button>
          <Button 
            onClick={loadSchema} 
            loading={loading}
            disabled={!selectedLayout}
          >
            Load Schema
          </Button>
        </Space>
      </div>

      {data.length === 0 && !loading && (
        <Alert 
          message="No mappings found" 
          description="Enter a layout ID and click 'Fetch Mappings' to view dependency mappings."
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 5, showSizeChanger: true }}
        scroll={{ x: 800 }}
      />

      {editMappingId && (
        <div style={{ marginTop: 30, padding: "20px", background: "#f5f5f5", borderRadius: "6px" }}>
          <Divider orientation="left">
            <strong>Edit Mapping: {editMappingId}</strong>
            <span style={{ marginLeft: 16, fontSize: "12px", color: "#666" }}>
              Layout ID: <code>{selectedLayout?.id}</code>
            </span>
          </Divider>

          <div style={{ marginBottom: 20 }}>
            <p style={{ marginBottom: 8, fontWeight: 500 }}>Step 1: Select Fields {editMappingId && <span style={{ fontSize: "12px", color: "#666" }}>(From Same Layout)</span>}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", marginBottom: 8 }}>Parent Field *</label>
                <Select
                  placeholder="Select parent field"
                  value={selectedParentField || undefined}
                  onChange={v => { 
                    setSelectedParentField(v)
                    setMappingValues({})
                    // Trigger smart load when both fields are selected
                    if (selectedChildField) {
                      setTimeout(() => smartLoadMappings(v, selectedChildField), 100)
                    }
                  }}
                  options={displayParents.map(f => ({ label: f.displayLabel, value: f.id }))}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 8 }}>Child Field *</label>
                <Select
                  placeholder="Select child field"
                  value={selectedChildField || undefined}
                  onChange={v => { 
                    setSelectedChildField(v)
                    setMappingValues({})
                    // Trigger smart load when both fields are selected
                    if (selectedParentField) {
                      setTimeout(() => smartLoadMappings(selectedParentField, v), 100)
                    }
                  }}
                  options={displayChildren.map(f => ({ label: f.displayLabel, value: f.id }))}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>

          {mappingDraft && (
            mappingDraft.selectedParentField || 
            mappingDraft.selectedChildField || 
            (mappingDraft.mappingValues && Object.keys(mappingDraft.mappingValues).length > 0)
          ) && (
            <div style={{ marginBottom: 20, padding: "12px", background: "#fff7e6", border: "1px solid #ffd591", borderRadius: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ marginBottom: 4, fontWeight: 500, color: "#ad6800" }}>💾 Saved Draft Available</p>
                  <p style={{ fontSize: "12px", color: "#666", marginBottom: 0 }}>Restore previously saved mapping values</p>
                </div>
                <Button 
                  type="primary" 
                  danger
                  onClick={reloadFromDraft}
                  size="small"
                >
                  🔄 Reload Values
                </Button>
              </div>
            </div>
          )}

          {selectedParentField && selectedChildField && (
            <div style={{ marginBottom: 20, padding: "12px", background: "#f0f8ff", border: "1px solid #b3d8ff", borderRadius: "4px" }}>
              <p style={{ marginBottom: 12, fontWeight: 500, color: "#0050b3" }}>Selected Fields</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: "12px", color: "#666" }}>Parent Field</label>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#1890ff" }}>{parentFieldLabel}</div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontSize: "12px", color: "#666" }}>Child Field</label>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#1890ff" }}>{childFieldLabel}</div>
                </div>
              </div>
            </div>
          )}

          {selectedParentField && selectedChildField && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ marginBottom: 8, fontWeight: 500 }}>Step 2: Map Values</p>
              {parentObj.allowedValues.length === 0 ? (
                <Alert 
                  message="No values available" 
                  description="Selected fields have no allowed values to map."
                  type="warning"
                  showIcon
                />
              ) : (
                <div style={{ 
                  maxHeight: "300px", 
                  overflowY: "auto",
                  border: "1px solid #d9d9d9",
                  borderRadius: "4px",
                  padding: "12px"
                }}>
                  {(() => {
                    // Get all parent values: from allowedValues + existing mappings
                    const allParentValues = new Set([
                      ...parentObj.allowedValues,
                      ...Object.keys(mappingValues)
                    ])
                    
                    if (allParentValues.size === 0) {
                      return (
                        <Alert
                          message="No parent values"
                          description="The selected parent field has no values available."
                          type="info"
                          showIcon
                        />
                      )
                    }

                    return Array.from(allParentValues).map(parentVal => (
                      <div key={parentVal} style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 4, fontSize: "12px", color: "#666" }}>
                          {parentVal}
                        </label>
                        <Select
                          mode="multiple"
                          placeholder="Select child values"
                          value={mappingValues[parentVal] || []}
                          onChange={vals => updateMappingValues(parentVal, vals)}
                          options={childObj.allowedValues.map(childVal => ({ 
                            label: childVal, 
                            value: childVal 
                          }))}
                          style={{ width: "100%" }}
                        />
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button onClick={clearMappingState}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              onClick={saveMapping}
              loading={loading}
            >
              {editMappingId ? "Update Mapping" : "Create Mapping"}
            </Button>
          </div>
        </div>
      )}

      {/* Clone Mapping Modal */}
      <Modal
        title="Clone Mapping Across Departments & Layouts"
        open={cloneMappingVisible}
        onCancel={() => {
          setCloneMappingVisible(false)
          setCloneSourceMapping(null)
          setCloneTargetDepartment("")
          setCloneTargetLayout("")
          setCloneTargetLayouts([])
        }}
        onOk={cloneMapping}
        okText="Clone"
        okButtonProps={{ loading, disabled: !cloneTargetDepartment || !cloneTargetLayout }}
        width={600}
      >
        <div style={{ marginBottom: 20 }}>
          <Alert
            title="Clone Mapping"
            description={`Clone the mapping from "${cloneSourceMapping?.parent?.displayLabel || 'Unknown'}" → "${cloneSourceMapping?.child?.displayLabel || 'Unknown'}" to any layout across departments.`}
            type="info"
            showIcon
          />
        </div>

        {/* Step 1: Select Target Department */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ marginBottom: 12, fontWeight: 500 }}>Step 1: Select Target Department *</p>
          <Select
            placeholder="Choose a department"
            value={cloneTargetDepartment || undefined}
            onChange={async (deptId) => {
              setCloneTargetDepartment(deptId)
              setCloneTargetLayout("")
              setCloneTargetLayouts([])
              
              // Get layouts for selected department
              try {
                if (deptId === selectedDepartment?.id) {
                  // Same department - use current layouts
                  setCloneTargetLayouts(layouts)
                } else {
                  // Different department - fetch from API
                  const res = await fetchLayouts("tickets", deptId, "active", 200, 0)
                  if (res.data?.data) {
                    setCloneTargetLayouts(res.data.data)
                  } else {
                    message.warning("No layouts found in this department")
                    setCloneTargetLayouts([])
                  }
                }
              } catch (err) {
                message.error(`Failed to fetch layouts: ${err.message}`)
                setCloneTargetLayouts([])
              }
            }}
            options={departments.map(d => ({ 
              label: d.name, 
              value: d.id 
            }))}
            style={{ width: "100%" }}
          />
          {cloneTargetDepartment && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#f6ffed", borderRadius: "4px" }}>
              <strong style={{ color: "#52c41a" }}>✓ Selected:</strong> {departments.find(d => d.id === cloneTargetDepartment)?.name}
            </div>
          )}
        </div>

        {/* Step 2: Select Target Layout */}
        {cloneTargetDepartment && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ marginBottom: 12, fontWeight: 500 }}>Step 2: Select Target Layout *</p>
            {cloneTargetLayouts.length === 0 ? (
              <div style={{ padding: "12px", background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: "4px", color: "#8c6c00" }}>
                No layouts available for this department yet. Make sure the department has layouts configured.
              </div>
            ) : (
              <>
                <Select
                  placeholder="Choose a layout in the target department"
                  value={cloneTargetLayout || undefined}
                  onChange={(layoutId) => {
                    setCloneTargetLayout(layoutId)
                  }}
                  options={cloneTargetLayouts
                    .filter(l => !(cloneTargetDepartment === selectedDepartment?.id && l.id === selectedLayout?.id))
                    .map(l => ({ 
                      label: l.layoutName || l.layoutDisplayName, 
                      value: l.id 
                    }))}
                  style={{ width: "100%" }}
                />
                {cloneTargetLayout && (
                  <div style={{ marginTop: 8, padding: "8px 12px", background: "#f6ffed", borderRadius: "4px" }}>
                    <strong style={{ color: "#52c41a" }}>✓ Selected:</strong> {cloneTargetLayouts.find(l => l.id === cloneTargetLayout)?.layoutName || cloneTargetLayouts.find(l => l.id === cloneTargetLayout)?.layoutDisplayName}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ marginBottom: 20, padding: "12px", background: "#f0f8ff", borderRadius: "4px" }}>
          <p style={{ marginBottom: 12, fontWeight: 500 }}>Source Mapping Details</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: "12px", color: "#666" }}>Parent Field</label>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#1890ff" }}>
                {cloneSourceMapping?.parent?.displayLabel || "Unknown"}
              </div>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "#666" }}>Child Field</label>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#1890ff" }}>
                {cloneSourceMapping?.child?.displayLabel || "Unknown"}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: "12px", color: "#666" }}>Mappings Being Cloned</label>
            <div style={{ fontSize: "12px", color: "#333" }}>
              {Object.entries(cloneSourceMapping?.mappings || {}).slice(0, 5).map(([k, v]) => (
                <div key={k} style={{ marginTop: 4 }}><strong>{k}</strong> → {Array.isArray(v) ? v.join(", ") : v}</div>
              ))}
              {Object.keys(cloneSourceMapping?.mappings || {}).length > 5 && (
                <div style={{ color: "#999", marginTop: 4 }}>+ {Object.keys(cloneSourceMapping?.mappings || {}).length - 5} more...</div>
              )}
            </div>
          </div>
        </div>

        <Alert
          title="Note"
          description="The same parent and child fields will be used in the target layout. If the target layout doesn't have these fields, cloning will fail."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>

    </Card>
  )
}

export default MappingViewer
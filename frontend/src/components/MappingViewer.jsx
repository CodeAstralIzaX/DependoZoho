import { Card, Input, Button, Table, Tag, message, Popconfirm, Divider, Select } from "antd"
import { useState, useEffect } from "react"
import { fetchMappings, deleteMapping, fetchLayoutFields, createMapping, updateMapping } from "../services/zohoApi"

function MappingViewer() {

  const [layoutId, setLayoutId] = useState("")
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  /* ===============================
     Edit State
  =============================== */
  const [editMappingId, setEditMappingId] = useState("")
  const [selectedParentField, setSelectedParentField] = useState("")
  const [selectedChildField, setSelectedChildField] = useState("")
  const [mappingValues, setMappingValues] = useState({})
  const [parents, setParents] = useState([])
  const [children, setChildren] = useState([])

  /* ===============================
     Fetch Mapping List
  =============================== */
  const load = async () => {
    if (!layoutId.trim()) {
      message.warning("Enter layout ID")
      return
    }

    try {
      setLoading(true)
      const res = await fetchMappings(layoutId)
      const mappings = res?.data?.data || []
      setData(mappings)
    } catch (err) {
      console.error(err)
      message.error("Failed to load mappings")
    } finally {
      setLoading(false)
    }
  }

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
      console.error(err)
      message.error("Failed to revoke mapping")
    } finally {
      setLoading(false)
    }
  }

  /* ===============================
     Load Schema for Parent/Child Fields
  =============================== */
  const loadSchema = async () => {
    if (!layoutId) return message.warning("Enter layout ID")

    try {
      setLoading(true)
      const res = await fetchLayoutFields(layoutId)
      setParents(res?.data?.parents || [])
      setChildren(res?.data?.children || [])
      message.success("Schema loaded")
    } catch (err) {
      console.error(err)
      message.error("Failed to load schema")
    } finally {
      setLoading(false)
    }
  }

  /* ===============================
     Edit Handler
  =============================== */
  const handleEdit = (mapping) => {
    setEditMappingId(mapping.id)
    setLayoutId(mapping.layoutId)
    setSelectedParentField(mapping.parentId)
    setSelectedChildField(mapping.childId)
    setMappingValues(mapping.mappings || [])

    // Auto-load schema if not already loaded
    if (!parents.length || !children.length) loadSchema()
  }

  /* ===============================
     Mapping Value Handler
  =============================== */
  const updateMappingValues = (parentVal, childVals) => {
    setMappingValues(prev => ({
      ...prev,
      [parentVal]: childVals
    }))
  }

  const clearMappingState = () => {
    setEditMappingId("")
    setSelectedParentField("")
    setSelectedChildField("")
    setMappingValues({})
  }

  /* ===============================
     Save (Create / Patch) Mapping
  =============================== */
  const saveMapping = async () => {
    if (!selectedParentField || !selectedChildField) {
      message.warning("Select parent and child fields")
      return
    }
    if (!Object.keys(mappingValues).length) {
      message.warning("Map at least one parent value")
      return
    }

    const payload = {
      layoutId,
      parentId: selectedParentField,
      childId: selectedChildField,
      mappings: mappingValues
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
      await load()
    } catch (err) {
      console.error(err)
      message.error("Mapping save failed")
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
    { title: "Mapping ID", dataIndex: "id" },
    { title: "Parent Field", render: row => row?.parent?.displayLabel || "-" },
    { title: "Child Field", render: row => row?.child?.displayLabel || "-" },
    {
      title: "Mappings",
      render: row => {
        const map = row?.mappings || {}
        return Object.entries(map).map(([parent, children]) => (
          <div key={parent}>
            <Tag color="blue">{parent}</Tag>
            {(children || []).map(child => (
              <Tag color="green" key={child}>{child}</Tag>
            ))}
          </div>
        ))
      }
    },
    {
      title: "Actions",
      render: row => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="small" onClick={() => handleEdit(row)}>Edit</Button>
          <Popconfirm title="Confirm revoke mapping?" onConfirm={() => revokeMapping(row.id)}>
            <Button size="small" danger>Revoke</Button>
          </Popconfirm>
        </div>
      )
    }
  ]

  /* ===============================
     UI Render
  =============================== */
  return (
    <Card title="Dependency Mappings">

      <div style={{ marginBottom: 12 }}>
        <Input
          placeholder="Layout ID"
          style={{ width: 250, marginRight: 10 }}
          value={layoutId}
          onChange={e => setLayoutId(e.target.value)}
        />
        <Button type="primary" onClick={load}>Fetch Mappings</Button>
        <Button style={{ marginLeft: 8 }} onClick={loadSchema}>Load Schema</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />

      {editMappingId && (
        <div style={{ marginTop: 20 }}>
          <Divider />
          <h3>Edit Mapping: {editMappingId}</h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <Select
              placeholder="Select Parent Field"
              style={{ width: "45%" }}
              value={selectedParentField || undefined}
              onChange={v => { setSelectedParentField(v); setMappingValues({}) }}
              options={parents.map(f => ({ label: f.displayLabel, value: f.id }))}
            />

            <Select
              placeholder="Select Child Field"
              style={{ width: "45%" }}
              value={selectedChildField || undefined}
              onChange={v => { setSelectedChildField(v); setMappingValues({}) }}
              options={children.map(f => ({ label: f.displayLabel, value: f.id }))}
            />
          </div>

          {parentObj.allowedValues.length > 0 && childObj.allowedValues.length > 0 &&
            parentObj.allowedValues.map(parentVal => (
              <div key={parentVal} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <div style={{ width: "25%" }}>{parentVal}</div>
                <Select
                  mode="multiple"
                  style={{ width: "65%" }}
                  placeholder="Map child values"
                  value={mappingValues[parentVal] || []}
                  onChange={vals => updateMappingValues(parentVal, vals)}
                  options={childObj.allowedValues.map(childVal => ({ label: childVal, value: childVal }))}
                />
              </div>
            ))
          }

          <Button type="primary" style={{ marginTop: 10 }} onClick={saveMapping}>
            {editMappingId ? "Update Mapping" : "Create Mapping"}
          </Button>
        </div>
      )}

    </Card>
  )
}

export default MappingViewer
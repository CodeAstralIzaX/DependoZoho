import { Card, Select, Button, message } from "antd"
import { useState, useEffect } from "react"
import { fetchAvailableFields, updateMapping } from "../services/zohoApi"

function DependencyBuilder({ layoutId }) {
  const [parents, setParents] = useState([])
  const [children, setChildren] = useState([])
  const [selectedParent, setSelectedParent] = useState("")
  const [selectedChildren, setSelectedChildren] = useState([])

  const loadFields = async () => {
    if (!layoutId) {
      message.warning("Provide layout ID first")
      return
    }
    try {
      const res = await fetchAvailableFields(layoutId)
      setParents(res.data.parents || [])
      setChildren(res.data.children || [])
      message.success("Fields loaded")
    } catch (err) {
      console.error(err)
      message.error("Failed to load fields")
    }
  }

  useEffect(() => {
    loadFields()
  }, [layoutId])

  const saveMapping = async () => {
    if (!selectedParent || selectedChildren.length === 0) {
      message.warning("Select parent and child fields")
      return
    }
    try {
      await updateMapping("mapping_id_placeholder", {
        [selectedParent]: selectedChildren
      })
      message.success("Mapping saved")
    } catch (err) {
      console.error(err)
      message.error("Failed to save mapping")
    }
  }

  return (
    <Card title="Visual Dependency Builder" style={{ width: 400 }}>
      <Select
        placeholder="Parent Field"
        style={{ width: "100%", marginBottom: 15 }}
        value={selectedParent || undefined}
        onChange={setSelectedParent}
        options={parents.map(f => ({
          label: f.displayLabel,
          value: f.id
        }))}
      />

      <Select
        mode="multiple"
        placeholder="Child Fields"
        style={{ width: "100%", marginBottom: 15 }}
        value={selectedChildren}
        onChange={setSelectedChildren}
        options={children.map(f => ({
          label: f.displayLabel,
          value: f.id
        }))}
      />

      <Button type="primary" onClick={saveMapping} block>
        Save Dependency Mapping
      </Button>
    </Card>
  )
}

export default DependencyBuilder
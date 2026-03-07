import { Card, Input, Button, Table, message } from "antd"
import { useState, useMemo } from "react"
import { fetchLayoutFields } from "../services/zohoApi"

function LayoutFieldFetcher() {

  const [layoutId, setLayoutId] = useState("")
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  const loadFields = async () => {

    if (!layoutId.trim()) {
      message.warning("Enter Layout ID")
      return
    }

    try {

      setLoading(true)

      const res = await fetchLayoutFields(layoutId)
      const data = res?.data || {}

      /* Merge parents + children safely */
      const merged = [
        ...(data.parents || []),
        ...(data.children || [])
      ]

      setFields(merged)

      if (!merged.length) {
        message.info("No fields found for this layout")
      }

    }
    catch (err) {
      console.error(err)
      message.error("Failed to fetch fields")
    }
    finally {
      setLoading(false)
    }
  }

  // Filtered fields based on search input
  const filteredFields = useMemo(() => {
    if (!search.trim()) return fields
    const s = search.toLowerCase()
    return fields.filter(f =>
      f.displayLabel?.toLowerCase().includes(s) ||
      (Array.isArray(f.allowedValues) && f.allowedValues.some(v => String(v).toLowerCase().includes(s)))
    )
  }, [fields, search])

  return (
    <Card title="Auto Fetch Layout + Fields">

      <div style={{ marginBottom: 10, display: "flex", gap: 10 }}>
        <Input
          placeholder="Layout ID"
          style={{ width: 200 }}
          value={layoutId}
          onChange={e => setLayoutId(e.target.value)}
        />

        <Button type="primary" onClick={loadFields}>
          Fetch Fields
        </Button>
      </div>

      <Input
        placeholder="Search by Field Label or Allowed Value"
        style={{ marginBottom: 15, width: "100%" }}
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <Table
        style={{ marginTop: 0 }}
        loading={loading}
        dataSource={filteredFields}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        columns={[
          {
            title: "Field Label",
            dataIndex: "displayLabel"
          },
          {
            title: "Field ID",
            dataIndex: "id"
          },
          {
            title: "Allowed Values",
            dataIndex: "allowedValues",
            render: v => Array.isArray(v) ? v.join(", ") : "-"
          }
        ]}
      />

    </Card>
  )
}

export default LayoutFieldFetcher
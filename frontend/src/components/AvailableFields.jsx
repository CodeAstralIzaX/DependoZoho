import { Card, Button, Input, Select, message, Divider } from "antd";
import { useState } from "react";
import { fetchLayoutFields, createMapping, updateMapping, getMapping } from "../services/zohoApi";

function AvailableFields() {

  const [layoutId, setLayoutId] = useState("");
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);

  const [selectedParentField, setSelectedParentField] = useState("");
  const [selectedChildField, setSelectedChildField] = useState("");

  const [mappingValues, setMappingValues] = useState({});
  const [mappingId, setMappingId] = useState("");

  const [loading, setLoading] = useState(false);

  /* =====================================================
     Load Schema
  ===================================================== */

  const loadSchema = async () => {

    if (!layoutId) return message.warning("Enter layout ID");

    try {

      setLoading(true);

      const res = await fetchLayoutFields(layoutId);

      setParents(res?.data?.parents || []);
      setChildren(res?.data?.children || []);

      message.success("Schema loaded");

    } catch {
      message.error("Schema load failed");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     Load Mapping For Edit Mode
  ===================================================== */

  const loadMapping = async () => {

    if (!mappingId) return;

    try {

      setLoading(true);

      const res = await getMapping(mappingId);

      const mapping = res?.data || res;

      setSelectedParentField(mapping.parentId);
      setSelectedChildField(mapping.childId);
      setMappingValues(mapping.mappings || {});

      message.success("Mapping loaded for edit");

    } catch (err) {
      console.error(err);
      message.error("Failed to load mapping");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     Mapping Value Handler
  ===================================================== */

  const updateMappingValues = (parentVal, childVals) => {
    setMappingValues(prev => ({
      ...prev,
      [parentVal]: childVals
    }));
  };

  const clearMappingState = () => {
    setMappingValues({});
  };

  /* =====================================================
     Save Mapping
  ===================================================== */

  const saveMapping = async () => {

    if (!selectedParentField || !selectedChildField)
      return message.warning("Select parent and child fields");

    if (Object.keys(mappingValues).length === 0)
      return message.warning("Map at least one parent value");

    const payload = {
      layoutId,
      parentId: selectedParentField,
      childId: selectedChildField,
      mappings: mappingValues
    };

    try {

      setLoading(true);

      if (mappingId) {
        await updateMapping(mappingId, payload);
        message.success("Mapping updated successfully");
      } else {
        await createMapping(payload);
        message.success("New mapping created successfully");
      }

      clearMappingState();
      setMappingId("");

    } catch (err) {
      console.error(err);
      message.error("Mapping save failed");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     Safe Field Objects
  ===================================================== */

  const parentObj = parents.find(p => p.id === selectedParentField) || { allowedValues: [] };
  const childObj = children.find(c => c.id === selectedChildField) || { allowedValues: [] };

  const editMode = Boolean(mappingId);

  /* =====================================================
     UI
  ===================================================== */

  return (
    <Card title="Dependency Mapping Builder" loading={loading}>

      <Input
        placeholder="Layout ID"
        style={{ width: 250, marginRight: 10 }}
        value={layoutId}
        onChange={e => setLayoutId(e.target.value)}
      />

      <Button type="primary" onClick={loadSchema}>
        Load Schema
      </Button>

      <Divider />

      <Input
        placeholder="Mapping ID (Enter to edit)"
        style={{ width: 350, marginBottom: 15 }}
        value={mappingId}
        onChange={e => setMappingId(e.target.value)}
        onBlur={loadMapping}
      />

      <div style={{ marginBottom: 15 }}>

        <Select
          placeholder="Select Parent Field"
          style={{ width: "45%", marginRight: 10 }}
          value={selectedParentField || undefined}
          disabled={editMode}
          onChange={v => {
            setSelectedParentField(v);
            clearMappingState();
          }}
          options={parents.map(f => ({
            label: f.displayLabel,
            value: f.id
          }))}
        />

        <Select
          placeholder="Select Child Field"
          style={{ width: "45%" }}
          value={selectedChildField || undefined}
          disabled={editMode}
          onChange={v => {
            setSelectedChildField(v);
            clearMappingState();
          }}
          options={children.map(f => ({
            label: f.displayLabel,
            value: f.id
          }))}
        />

      </div>

      <Divider />

      {(parentObj.allowedValues.length > 0 &&
        childObj.allowedValues.length > 0) && (

          parentObj.allowedValues.map(parentVal => (
            <div
              key={parentVal}
              style={{ display: "flex", alignItems: "center", marginBottom: 12 }}
            >
              <div style={{ width: "25%" }}>{parentVal}</div>

              <Select
                mode="multiple"
                style={{ width: "65%" }}
                placeholder="Map child values"
                value={mappingValues[parentVal] || []}
                onChange={vals => updateMappingValues(parentVal, vals)}
                options={childObj.allowedValues.map(childVal => ({
                  label: childVal,
                  value: childVal
                }))}
              />

            </div>
          ))

        )}

      <Button type="primary" style={{ marginTop: 20 }} onClick={saveMapping}>
        Save Mapping
      </Button>

    </Card>
  );
}

export default AvailableFields;
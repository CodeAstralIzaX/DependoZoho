import { Card, Button, Input, Select, message, Divider, Alert, Space } from "antd";
import { useState, useCallback } from "react";
import { fetchLayoutFields, createMapping, updateMapping, getMapping } from "../services/zohoApi";
import { useAppContext } from "../context/AppContext";

function AvailableFields() {

  const { selectedLayout, selectedDepartment } = useAppContext();
  
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);

  const [selectedParentField, setSelectedParentField] = useState("");
  const [selectedChildField, setSelectedChildField] = useState("");

  const [mappingValues, setMappingValues] = useState({});
  const [mappingId, setMappingId] = useState("");
  const [editMode, setEditMode] = useState(false);

  const [loading, setLoading] = useState(false);

  /* =====================================================
     Load Schema
  ===================================================== */

  const loadSchema = useCallback(async () => {

    if (!selectedLayout?.id) {
      message.warning("Select a layout from the Department & Layout selector");
      return;
    }

    try {

      setLoading(true);

      const res = await fetchLayoutFields(selectedLayout.id);

      setParents(res?.data?.parents || []);
      setChildren(res?.data?.children || []);

      if (!res?.data?.parents?.length && !res?.data?.children?.length) {
        message.info("No fields available for this layout");
      } else {
        message.success("Schema loaded successfully");
      }

    } catch (err) {
      console.error("Error loading schema:", err);
      message.error(err?.response?.data?.detail || "Failed to load schema");
    } finally {
      setLoading(false);
    }
  }, [selectedLayout]);

  /* =====================================================
     Load Mapping For Edit Mode
  ===================================================== */

  const loadMapping = useCallback(async () => {

    if (!mappingId || !mappingId.trim()) {
      setEditMode(false);
      return;
    }

    try {

      setLoading(true);

      const res = await getMapping(mappingId);

      const mapping = res?.data || res;

      setSelectedParentField(mapping.parentId);
      setSelectedChildField(mapping.childId);
      setMappingValues(mapping.mappings || {});
      setEditMode(true);

      message.success("Mapping loaded for editing");

    } catch (err) {
      console.error("Error loading mapping:", err);
      message.error(err?.response?.data?.detail || "Failed to load mapping");
      setEditMode(false);
    } finally {
      setLoading(false);
    }
  }, [mappingId]);

  /* =====================================================
     Validate Mapping
  ===================================================== */

  const validateMapping = () => {
    if (!selectedLayout?.id) {
      message.error("Select a layout from the Department & Layout selector");
      return false;
    }
    if (!selectedParentField) {
      message.error("Select a parent field");
      return false;
    }
    if (!selectedChildField) {
      message.error("Select a child field");
      return false;
    }
    if (selectedParentField === selectedChildField) {
      message.error("Parent and child fields must be different");
      return false;
    }

    const validMappings = Object.values(mappingValues).filter(v => v && v.length > 0);
    if (validMappings.length === 0) {
      message.error("Map at least one parent value to child values");
      return false;
    }

    return true;
  };

  /* =====================================================
     Mapping Value Handler
  ===================================================== */

  const updateMappingValues = (parentVal, childVals) => {
    setMappingValues(prev => ({
      ...prev,
      [parentVal]: childVals && childVals.length > 0 ? childVals : undefined
    }));
  };

  const clearMappingState = () => {
    setMappingValues({});
    setMappingId("");
    setEditMode(false);
  };

  /* =====================================================
     Save Mapping
  ===================================================== */

  const saveMapping = async () => {

    if (!validateMapping()) {
      return;
    }

    // Filter out empty mappings
    const cleanMappings = Object.fromEntries(
      Object.entries(mappingValues).filter(([_, vals]) => vals && vals.length > 0)
    );

    const payload = {
      layoutId: selectedLayout.id,
      parentId: selectedParentField,
      childId: selectedChildField,
      mappings: cleanMappings
    };

    try {

      setLoading(true);

      if (mappingId && editMode) {
        await updateMapping(mappingId, payload);
        message.success("Mapping updated successfully");
      } else {
        await createMapping(payload);
        message.success("New mapping created successfully");
      }

      clearMappingState();
      setParents([]);
      setChildren([]);

    } catch (err) {
      console.error("Error saving mapping:", err);
      message.error(err?.response?.data?.detail || "Failed to save mapping");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     Safe Field Objects
  ===================================================== */

  const parentObj = parents.find(p => p.id === selectedParentField) || { allowedValues: [] };
  const childObj = children.find(c => c.id === selectedChildField) || { allowedValues: [] };

  /* =====================================================
     UI
  ===================================================== */

  return (
    <Card title="Dependency Mapping Builder (Create/Edit)" loading={loading}>

      <div style={{ marginBottom: 20 }}>
        {selectedLayout ? (
          <Alert
            message={`Layout: ${selectedLayout.layoutName || selectedLayout.layoutDisplayName}`}
            description={selectedDepartment ? `Department: ${selectedDepartment.name}` : "No department selected"}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Alert
            message="No layout selected"
            description="Please select a layout from the Department & Layout selector above"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <p style={{ fontWeight: 500, marginBottom: 10 }}>Step 1: Load Schema</p>
        <Button 
          type="primary" 
          onClick={loadSchema} 
          loading={loading}
          disabled={!selectedLayout}
        >
          Load Schema
        </Button>
      </div>

      <Divider />

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 500, marginBottom: 10 }}>Step 2: Load Existing Mapping (Optional)</p>
        <Space>
          <Input
            placeholder="Enter Mapping ID to edit"
            style={{ width: 280 }}
            value={mappingId}
            onChange={e => setMappingId(e.target.value)}
            onPressEnter={loadMapping}
          />
          <Button onClick={loadMapping} loading={loading}>
            Load
          </Button>
          {editMode && (
            <Button danger onClick={clearMappingState}>
              Clear
            </Button>
          )}
        </Space>
        {editMode && (
          <Alert 
            message="Edit Mode Active" 
            description="You are editing an existing mapping."
            type="info"
            showIcon
            style={{ marginTop: 10 }}
          />
        )}
      </div>

      <Divider />

      <div style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 500, marginBottom: 10 }}>Step 3: Select Fields</p>
        <Space style={{ width: "100%" }} orientation="vertical">
          <Select
            placeholder="Select Parent Field"
            style={{ width: "100%" }}
            value={selectedParentField || undefined}
            disabled={editMode}
            onChange={v => {
              setSelectedParentField(v);
              setMappingValues({});
            }}
            options={parents.map(f => ({
              label: f.displayLabel,
              value: f.id
            }))}
          />

          <Select
            placeholder="Select Child Field"
            style={{ width: "100%" }}
            value={selectedChildField || undefined}
            disabled={editMode}
            onChange={v => {
              setSelectedChildField(v);
              setMappingValues({});
            }}
            options={children.map(f => ({
              label: f.displayLabel,
              value: f.id
            }))}
          />
        </Space>
      </div>

      <Divider />

      {selectedParentField && selectedChildField && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 500, marginBottom: 10 }}>Step 4: Map Values</p>
          
          {parentObj.allowedValues.length === 0 ? (
            <Alert 
              message="No values available" 
              description="Selected fields have no allowed values to map."
              type="warning"
              showIcon
            />
          ) : (
            <div style={{ 
              maxHeight: "400px", 
              overflowY: "auto",
              border: "1px solid #d9d9d9",
              borderRadius: "4px",
              padding: "12px"
            }}>
              {parentObj.allowedValues.map(parentVal => (
                <div key={parentVal} style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: "12px", color: "#666", fontWeight: 500 }}>
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
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button onClick={clearMappingState}>
          Reset
        </Button>
        <Button type="primary" onClick={saveMapping} loading={loading}>
          {editMode ? "Update Mapping" : "Create Mapping"}
        </Button>
      </div>

    </Card>
  );
}

export default AvailableFields;
import { Card, Upload, Button, Input, message } from "antd"
import { UploadOutlined } from "@ant-design/icons"
import { useState } from "react"
import { uploadExcel } from "../services/zohoApi"

function ExcelUploader(){

  const [layoutId,setLayoutId]=useState("")
  const [parentId,setParentId]=useState("")
  const [childId,setChildId]=useState("")

  const props = {

    beforeUpload:(file)=>{

      if(!layoutId){
        message.warning("Enter layout ID")
        return false
      }

      uploadExcel(file,layoutId,parentId,childId)
        .then(()=>message.success("Excel uploaded"))
        .catch(()=>message.error("Upload failed"))

      return false
    }
  }

  return(
    <Card title="Upload Dependency Excel">

      <Input
        placeholder="Layout ID"
        style={{marginBottom:10}}
        value={layoutId}
        onChange={e=>setLayoutId(e.target.value)}
      />

      <Input
        placeholder="Parent Field ID"
        style={{marginBottom:10}}
        value={parentId}
        onChange={e=>setParentId(e.target.value)}
      />

      <Input
        placeholder="Child Field ID"
        style={{marginBottom:10}}
        value={childId}
        onChange={e=>setChildId(e.target.value)}
      />

      <Upload {...props}>

        <Button icon={<UploadOutlined />}>
          Upload Excel
        </Button>

      </Upload>

    </Card>
  )
}

export default ExcelUploader
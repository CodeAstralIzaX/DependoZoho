import { Card, Input, Button, message } from "antd"
import { useState } from "react"
import { updateMapping, deleteMapping } from "../services/zohoApi"

function ApiConsole(){

  const [id,setId]=useState("")
  const [body,setBody]=useState("")

  const update=async()=>{

    try{

      const json=JSON.parse(body)

      await updateMapping(id,json)

      message.success("Mapping updated")

    }
    catch{
      message.error("Invalid JSON")
    }

  }

  const remove=async()=>{

    if(!id){
      message.warning("Enter Mapping ID")
      return
    }

    try{
      await deleteMapping(id)
      message.success("Mapping deleted")
    }
    catch{
      message.error("Delete failed")
    }

  }

  return(

    <Card title="Mapping Console">

      <Input
        placeholder="Mapping ID"
        style={{marginBottom:10}}
        onChange={(e)=>setId(e.target.value)}
      />

      <Input.TextArea
        rows={4}
        placeholder="JSON Body"
        style={{marginBottom:10}}
        onChange={(e)=>setBody(e.target.value)}
      />

      <Button type="primary" onClick={update} style={{marginRight:10}}>
        Update
      </Button>

      <Button danger onClick={remove}>
        Delete
      </Button>

    </Card>

  )

}

export default ApiConsole
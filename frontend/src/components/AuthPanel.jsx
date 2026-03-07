import { Card, Input, Button, message, Select } from "antd"
import { useState } from "react"
import { authenticate } from "../services/zohoApi"

const { Option } = Select

function AuthPanel(){

  const [org,setOrg] = useState("")
  const [token,setToken] = useState("")
  const [domain,setDomain] = useState("com")
  const [loading,setLoading] = useState(false)

  const login = async () => {

    if(!org || !token){
      message.warning("Please enter Org ID and Access Token")
      return
    }

    try{

      setLoading(true)

      const res = await authenticate(org,token,domain)

      message.success(res.data?.message || "Authentication Successful")

    }
    catch(error){

      message.error(
        error?.response?.data?.detail ||
        "Authentication Failed"
      )

    }
    finally{
      setLoading(false)
    }

  }

  return(

    <Card title="Zoho Authentication" style={{marginTop:20}}>

      <Input
        placeholder="Org ID"
        style={{marginBottom:10}}
        onChange={(e)=>setOrg(e.target.value)}
      />

      <Input.Password
        placeholder="Access Token"
        style={{marginBottom:10}}
        onChange={(e)=>setToken(e.target.value)}
      />

      <Select
        value={domain}
        style={{width:200,marginBottom:15}}
        onChange={setDomain}
      >
        <Option value="com">US</Option>
        <Option value="eu">EU</Option>
        <Option value="in">IN</Option>
        <Option value="au">AU</Option>
      </Select>

      <br/>

      <Button
        type="primary"
        loading={loading}
        onClick={login}
      >
        Authenticate
      </Button>

    </Card>

  )

}

export default AuthPanel
import { Card } from "antd"

function ApiResponseViewer({data}){

  return(

    <Card title="API Response" style={{marginTop:20}}>

      <pre>
        {data ? JSON.stringify(data,null,2) : "No response yet"}
      </pre>

    </Card>

  )

}

export default ApiResponseViewer
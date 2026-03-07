function Sidebar(){

  const scrollTo=(id)=>{
    const el=document.getElementById(id)
    if(el){
      el.scrollIntoView({behavior:"smooth"})
    }
  }

  const style={
    width:"260px",
    background:"#020617",
    padding:"20px",
    height:"100vh",
    color:"white"
  }

  const item={
    padding:"12px",
    marginBottom:"10px",
    background:"#0f172a",
    borderRadius:"6px",
    cursor:"pointer"
  }

  return(

    <div style={style}>

      <h2 style={{color:"#38bdf8"}}>DependoZoho</h2>

      <div style={item} onClick={()=>scrollTo("auth")}>
        Authentication
      </div>

      <div style={item} onClick={()=>scrollTo("excel")}>
        Excel Upload
      </div>

      <div style={item} onClick={()=>scrollTo("mappings")}>
        List Mappings
      </div>

      <div style={item} onClick={()=>scrollTo("console")}>
        Mapping Console
      </div>

      <div style={item} onClick={()=>scrollTo("layout-fields")}>
       Auto Fetch Layout + Fields
      </div>

      <div style={item} onClick={()=>scrollTo("available-fields")}>
        Dependency Builder
      </div>

    </div>

  )
}

export default Sidebar
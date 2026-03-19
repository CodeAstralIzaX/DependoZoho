function Sidebar(){

  const scrollTo=(id)=>{
    const el=document.getElementById(id)
    if(el){
      el.scrollIntoView({behavior:"smooth", block:"start"})
    } else {
      console.warn(`Element with id "${id}" not found`)
    }
  }

  const style={
    width:"260px",
    background:"#020617",
    padding:"20px",
    height:"100vh",
    color:"white",
    overflow:"auto",
    position:"sticky",
    top:0,
    left:0
  }

  const item={
    padding:"12px 16px",
    marginBottom:"10px",
    background:"#0f172a",
    borderRadius:"6px",
    cursor:"pointer",
    transition:"all 0.3s ease",
    userSelect:"none",
    fontSize:"14px",
    fontWeight:"500",
    border:"2px solid transparent"
  }

  const itemHover={
    ...item,
    background:"#1e293b",
    borderColor:"#38bdf8",
    color:"#38bdf8"
  }

  const menuItems = [
    { label: "1. Authentication", id: "auth" },
    { label: "2. Select Department & Layout", id: "dept-layout" },
    { label: "3. Create Mappings", id: "excel" },
    { label: "4. Edit Mappings", id: "mappings" },
    { label: "API Console", id: "console" },
    { label: "Layout Field Fetcher", id: "layout-fields" },
    { label: "Dependency Builder", id: "available-fields" },
  ]

  return(

    <div style={style}>

      <h2 style={{color:"#38bdf8", marginBottom:"30px"}}>DependoZoho</h2>

      {menuItems.map((menu) => (
        <div 
          key={menu.id}
          style={item}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, itemHover)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, item)}
          onClick={()=>scrollTo(menu.id)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if(e.key === 'Enter' || e.key === ' '){
              scrollTo(menu.id)
            }
          }}
        >
          {menu.label}
        </div>
      ))}

    </div>

  )
}

export default Sidebar
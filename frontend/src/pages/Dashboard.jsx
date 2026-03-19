import Sidebar from "../components/Sidebar"
import AuthPanel from "../components/AuthPanel"
import DepartmentLayoutSelector from "../components/DepartmentLayoutSelector"
import ExcelUploader from "../components/ExcelUploader"
import MappingViewer from "../components/MappingViewer"
import ApiConsole from "../components/ApiConsole"
import LayoutFieldFetcher from "../components/LayoutFieldFetcher"
import AvailableFields from "../components/AvailableFields"
import DependencyBuilder from "../components/DependencyBuilder"
import Footer from "../components/Footer"

function Dashboard(){

  const contentStyle={
    flex:1,
    padding:"30px",
    height:"100vh",
    overflowY:"auto",
    background:"#f1f5f9",
    display:"flex",
    flexDirection:"column",
    gap:"25px"
  }

  return(

    <div style={{display:"flex"}}>

      <Sidebar/>

      <div style={contentStyle}>

        <div id="auth">
          <AuthPanel/>
        </div>

        <div id="dept-layout">
          <DepartmentLayoutSelector/>
        </div>

        <div id="excel">
          <ExcelUploader/>
        </div>

        <div id="mappings">
          <MappingViewer/>
        </div>

        <div id="console">
          <ApiConsole/>
        </div>

        <div id="layout-fields">
          <LayoutFieldFetcher/>
        </div>

        <div id="available-fields">
          <AvailableFields/>
        </div>

        <Footer/>

      </div>

    </div>

  )
}

export default Dashboard
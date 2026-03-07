import Sidebar from "../components/Sidebar"
import AuthPanel from "../components/AuthPanel"
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

        <AuthPanel/>
        <ExcelUploader/>
        <MappingViewer/>
        <ApiConsole/>
        <LayoutFieldFetcher/>
        <AvailableFields/>
        <Footer/>

      </div>

    </div>

  )
}

export default Dashboard
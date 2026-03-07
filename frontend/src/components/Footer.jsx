function Footer(){

  const footerStyle = {
    marginTop: "40px",
    padding: "20px",
    textAlign: "center",
    borderTop: "1px solid #e5e7eb",
    fontSize: "14px",
    color: "#6b7280",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
  }

  return(
    <footer style={footerStyle}>
      <div style={{marginBottom:"6px", fontWeight:500}}>
        ❤️ Made with Love – Prem IzaX
      </div>

      <div style={{fontSize:"12px"}}>
        © {new Date().getFullYear()} DependoZoho. All rights reserved.
      </div>
    </footer>
  )
}

export default Footer
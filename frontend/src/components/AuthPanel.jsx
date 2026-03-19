import { Card, Input, Button, message, Select, Alert, Space, Tabs, Collapse, Divider, Typography, Steps } from "antd"
import { useState, useEffect } from "react"
import { authenticate, exchangeOAuthCode, getOAuthGuide } from "../services/zohoApi"
import { useAppContext } from "../context/AppContext"

const { Option } = Select
const { Text, Paragraph, Link } = Typography

function AuthPanel(){

  const { setAuthenticated } = useAppContext()

  // Direct Token Auth
  const [org,setOrg] = useState("")
  const [token,setToken] = useState("")
  const [domain,setDomain] = useState("com")
  const [loading,setLoading] = useState(false)
  const [authenticated, setLocalAuth] = useState(false)

  // OAuth Flow
  const [activeTab, setActiveTab] = useState("direct")
  const [oauthCode, setOauthCode] = useState("")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [redirectUri, setRedirectUri] = useState("http://localhost:5173")
  const [oauthDomain, setOauthDomain] = useState("com")
  const [oauthLoading, setOauthLoading] = useState(false)
  const [guidePlus, setGuideData] = useState(null)

  // Load OAuth guide on mount
  useEffect(() => {
    loadOAuthGuide()
  }, [])

  const loadOAuthGuide = async () => {
    try {
      const response = await getOAuthGuide(oauthDomain)
      setGuideData(response.data)
    } catch (error) {
      console.error("Failed to load OAuth guide:", error)
    }
  }

  const handleOAuthDomainChange = (value) => {
    setOauthDomain(value)
  }

  // Direct Token Authentication
  const login = async () => {

    if(!org || !token){
      message.warning("Please enter Org ID and Access Token")
      return
    }

    try{

      setLoading(true)

      const res = await authenticate(org,token,domain)

      message.success(res.data?.message || "✓ Authentication Successful")
      
      // Update global auth status with credentials
      setAuthenticated(true, {
        orgId: org,
        accessToken: token,
        domain: domain
      })
      setLocalAuth(true)

    }
    catch(error){

      message.error(
        error?.response?.data?.detail ||
        "Authentication Failed"
      )
      
      setAuthenticated(false)
      setLocalAuth(false)

    }
    finally{
      setLoading(false)
    }

  }

  // OAuth Code Exchange
  const exchangeCode = async () => {
    if (!oauthCode || !clientId || !clientSecret) {
      message.warning("Please enter authorization code, client ID, and client secret")
      return
    }

    try {
      setOauthLoading(true)
      
      const response = await exchangeOAuthCode({
        clientId,
        clientSecret,
        code: oauthCode,
        redirectUri,
        domain: oauthDomain
      })

      const accessToken = response.data.access_token
      
      message.info("✓ Token exchanged! Now provide Org ID and authenticate")
      message.info(`Token: ${accessToken.substring(0, 20)}...`)
      
      // Auto-fill token
      setToken(accessToken)
      setDomain(oauthDomain)
      
    } catch (error) {
      message.error(
        error?.response?.data?.detail ||
        "Token exchange failed"
      )
    } finally {
      setOauthLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      // Call logout endpoint
      await authenticate("", "", "com")
    } catch (error) {
      // Ignore errors on logout
    } finally {
      setOrg("")
      setToken("")
      setDomain("com")
      setOauthCode("")
      setClientId("")
      setClientSecret("")
      setAuthenticated(false)
      setLocalAuth(false)
      message.info("✓ Logged out successfully")
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    message.success("Copied to clipboard!")
  }

  const getAuthorizationUrl = () => {
    if (!clientId || !redirectUri) {
      return "Please enter Client ID and Redirect URI first"
    }
    const scope = "Desk.tickets.ALL,Desk.contacts.ALL,Desk.accounts.ALL,Desk.departments.ALL"
    return `https://accounts.zoho.${oauthDomain}/oauth/v2/auth?scope=${scope}&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=security_token`
  }

  const directAuthTab = (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Input
        placeholder="Org ID"
        value={org}
        onChange={(e)=>setOrg(e.target.value)}
        disabled={authenticated}
      />

      <Input.Password
        placeholder="Access Token"
        value={token}
        onChange={(e)=>setToken(e.target.value)}
        disabled={authenticated}
      />

      <Select
        value={domain}
        onChange={setDomain}
        disabled={authenticated}
      >
        <Option value="com">US (com)</Option>
        <Option value="eu">EU (eu)</Option>
        <Option value="in">India (in)</Option>
        <Option value="au">Australia (au)</Option>
      </Select>

      <Button
        type="primary"
        loading={loading}
        onClick={login}
        disabled={authenticated}
        block
      >
        {authenticated ? "Already Authenticated" : "Authenticate"}
      </Button>
    </Space>
  )

  const oauthTabContent = (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Alert
        message="OAuth2 Authorization Code Flow"
        description="Follow the steps below to get an access token from Zoho"
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />

      <Collapse
        items={[
          {
            key: "1",
            label: "Step 1: Get Authorization Code",
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Paragraph>
                  <Text strong>Client ID:</Text>
                  <Input
                    placeholder="Your OAuth Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    style={{ marginTop: 5 }}
                  />
                </Paragraph>

                <Paragraph>
                  <Text strong>Redirect URI:</Text>
                  <Input
                    placeholder="e.g., http://localhost:5173"
                    value={redirectUri}
                    onChange={(e) => setRedirectUri(e.target.value)}
                    style={{ marginTop: 5 }}
                  />
                </Paragraph>

                <Paragraph>
                  <Text strong>Domain:</Text>
                  <Select
                    value={oauthDomain}
                    onChange={handleOAuthDomainChange}
                    style={{ width: "100%", marginTop: 5 }}
                  >
                    <Option value="com">US (com)</Option>
                    <Option value="eu">EU (eu)</Option>
                    <Option value="in">India (in)</Option>
                    <Option value="au">Australia (au)</Option>
                  </Select>
                </Paragraph>

                <Divider />

                <Paragraph>
                  <Text strong>Authorization URL:</Text>
                  <div style={{
                    backgroundColor: "#f5f5f5",
                    padding: "10px",
                    borderRadius: "4px",
                    marginTop: "10px",
                    wordBreak: "break-all",
                    fontSize: "12px"
                  }}>
                    {getAuthorizationUrl()}
                  </div>
                </Paragraph>

                <Button 
                  type="primary"
                  onClick={() => {
                    const url = getAuthorizationUrl()
                    if (!url.includes("Please enter")) {
                      window.open(url, "_blank")
                    } else {
                      message.error(url)
                    }
                  }}
                  block
                >
                  🔗 Open Authorization URL
                </Button>

                <Alert
                  message="Next steps"
                  description="1. Click the button above to open Zoho Accounts
2. Log in with your Zoho credentials
3. Grant permission to the application
4. You'll be redirected with ?code=... in the URL
5. Copy that authorization code and paste it below"
                  type="warning"
                />
              </Space>
            )
          },
          {
            key: "2",
            label: "Step 2: Exchange Code for Token",
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Paragraph>
                  <Text strong>Authorization Code:</Text>
                  <Input
                    placeholder="Code from redirect URL (code=...)"
                    value={oauthCode}
                    onChange={(e) => setOauthCode(e.target.value)}
                    style={{ marginTop: 5 }}
                  />
                </Paragraph>

                <Paragraph>
                  <Text strong>Client Secret:</Text>
                  <Input.Password
                    placeholder="Your OAuth Client Secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    style={{ marginTop: 5 }}
                  />
                </Paragraph>

                <Button
                  type="primary"
                  loading={oauthLoading}
                  onClick={exchangeCode}
                  block
                >
                  🔄 Exchange Code for Token
                </Button>

                <Alert
                  message="After successful exchange"
                  description="The access token will be auto-filled above. Click 'Authenticate' to complete login."
                  type="success"
                />
              </Space>
            )
          },
          {
            key: "3",
            label: "Step 3: Complete Authentication",
            children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                <Alert
                  message="Token received"
                  description="The access token from Step 2 has been auto-filled above in the Direct Token tab"
                  type="info"
                />
                <Paragraph>
                  <Text strong>Still need to provide:</Text>
                  <ul>
                    <li>Org ID (find in Zoho Desk settings)</li>
                  </ul>
                </Paragraph>
                <Button
                  type="primary"
                  onClick={() => setActiveTab("direct")}
                  block
                >
                  ✓ Go to Direct Auth & Complete
                </Button>
              </Space>
            )
          }
        ]}
      />
    </Space>
  )

  return(

    <Card title="Step 1: Zoho Authentication" style={{marginTop:20}}>

      {authenticated ? (
        <Alert
          message="✓ Authenticated"
          description={`Connected to Zoho Desk (${domain.toUpperCase()})`}
          type="success"
          showIcon
          style={{ marginBottom: 20 }}
          action={
            <Button size="small" danger onClick={logout}>
              Logout
            </Button>
          }
        />
      ) : (
        <Alert
          title="Not Authenticated"
          description="Choose authentication method below"
          type="warning"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "direct",
            label: "Direct Token",
            children: directAuthTab
          },
          {
            key: "oauth",
            label: "OAuth Flow",
            children: oauthTabContent
          }
        ]}
      />

    </Card>

  )

}

export default AuthPanel
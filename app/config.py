# app/config.py

# Default domain
DEFAULT_ZOHO_DOMAIN = "com"

# Supported Zoho domains
ZOHO_DOMAINS = ["com", "in", "eu", "sa", "cn", "au"]  # add more if needed

# Function to construct Zoho Desk base URL dynamically
def get_zoho_base_url(domain: str = None) -> str:
    """
    Returns the Zoho Desk API base URL for the specified domain.
    If domain is not provided, uses the default domain.
    """
    domain = domain.lower() if domain else DEFAULT_ZOHO_DOMAIN
    if domain not in ZOHO_DOMAINS:
        raise ValueError(f"Unsupported Zoho domain '{domain}'. Supported: {ZOHO_DOMAINS}")
    return f"https://desk.zoho.{domain}/api/v1"


# In-memory credential storage
CREDENTIALS = {
    "orgId": None,
    "accessToken": None,
    "domain": DEFAULT_ZOHO_DOMAIN,  # store domain with credentials
}

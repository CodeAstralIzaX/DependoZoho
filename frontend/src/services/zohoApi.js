import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://localhost:8000"

/* =====================================================
   Axios Instance (Recommended)
===================================================== */

const client = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json"
  }
})

/* =====================================================
   AUTH
===================================================== */

export const authenticate = (orgId, accessToken, domain = "com") => {
  return client.post("/auth", {
    orgId,
    accessToken,
    domain
  })
}

export const exchangeOAuthCode = (payload) => {
  return client.post("/auth/exchange-token", payload)
}

export const refreshOAuthToken = (refreshToken, clientId, clientSecret, domain = "com") => {
  return client.post("/auth/refresh-token", null, {
    params: {
      refreshToken,
      clientId,
      clientSecret,
      domain
    }
  })
}

export const getAuthStatus = () => {
  return client.get("/auth/status")
}

export const logout = () => {
  return client.post("/auth/logout")
}

export const getOAuthGuide = (domain = "com") => {
  return client.get("/auth/guide", {
    params: { domain }
  })
}

/* =====================================================
   SCHEMA FIELD FETCH
===================================================== */

export const fetchAvailableFields = (layoutId) => {
  return client.get(`/available-fields?layoutId=${layoutId}`)
}

/* Alias (Backward compatibility if used in UI) */
export const fetchLayoutFields = fetchAvailableFields

/* =====================================================
   DEPENDENCY MAPPINGS
===================================================== */

/* List mappings */
export const fetchMappings = (layoutId = "") => {
  const url = layoutId
    ? `/mappings?layoutId=${layoutId}`
    : `/mappings`

  return client.get(url)
}

/* Get single mapping */
export const getMapping = (mappingId) => {
  return client.get(`/mappings/${mappingId}`)
}

/* Create mapping */
export const createMapping = (payload) => {
  return client.post("/mappings", payload)
}

/* Update mapping */
export const updateMapping = (mappingId, payload) => {
  return client.patch(`/mappings/${mappingId}`, payload, {
    headers: {
      "Content-Type": "application/json"
    }
  })
}

/* Delete mapping */
export const deleteMapping = (mappingId) => {
  return client.delete(`/mappings/${mappingId}`)
}

/* =====================================================
   EXCEL UPLOAD
===================================================== */

export const uploadExcel = (
  file,
  layoutId,
  parentId = "",
  childId = ""
) => {

  const form = new FormData()
  form.append("file", file)

  return client.post(
    `/dependency/upload?layoutId=${layoutId}&parentId=${parentId}&childId=${childId}`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  )
}

/* =====================================================
   DEPARTMENTS
===================================================== */
export const fetchDepartments = (limit = 200, from_index = 0) => {
  return client.get(`/departments?isEnabled=true&limit=${limit}&from=${from_index}`)
}

export const getDepartment = (departmentId) => {
  return client.get(`/departments/${departmentId}`)
}

/* =====================================================
   LAYOUTS
===================================================== */

export const fetchLayouts = (module = "tickets", departmentId = "", status = "active", limit = 200, from_index = 0) => {
  let url = `/layouts?module=${module}&status=${status}&limit=${limit}&from=${from_index}`
  if (departmentId) {
    url += `&departmentId=${departmentId}`
  }
  return client.get(url)
}

export const getLayout = (layoutId) => {
  return client.get(`/layouts/${layoutId}`)
}
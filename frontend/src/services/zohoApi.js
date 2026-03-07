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
  return client.patch(`/mappings/${mappingId}`, payload)
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
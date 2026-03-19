import { createContext, useContext, useState, useCallback, useEffect } from 'react'

/**
 * Global App Context for managing Department and Layout selection
 * Auth data persists to localStorage, mapping draft stays in session only
 */
const AppContext = createContext()

const STORAGE_KEY = 'dependoZoho_session'

export function AppProvider({ children }) {
  // Global state
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [selectedLayout, setSelectedLayout] = useState(null)
  const [authStatus, setAuthStatus] = useState(false)
  const [departments, setDepartments] = useState([])
  const [layouts, setLayouts] = useState([])
  const [credentials, setCredentials] = useState(null)
  // Mapping draft is session-only (NOT persisted to localStorage)
  const [mappingDraft, setMappingDraft] = useState(null)

  // Load persisted auth data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.selectedDepartment) setSelectedDepartment(data.selectedDepartment)
        if (data.selectedLayout) setSelectedLayout(data.selectedLayout)
        if (data.authStatus) setAuthStatus(data.authStatus)
        if (data.credentials) setCredentials(data.credentials)
      } catch (err) {
        console.error('Failed to load persisted data:', err)
      }
    }
  }, [])

  // Persist auth data to localStorage (not mapping draft)
  useEffect(() => {
    const dataToSave = {
      selectedDepartment,
      selectedLayout,
      authStatus,
      credentials
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  }, [selectedDepartment, selectedLayout, authStatus, credentials])

  // Actions
  const selectDepartment = useCallback((dept) => {
    setSelectedDepartment(dept)
    // Reset layout when department changes
    setSelectedLayout(null)
    setLayouts([])
  }, [])

  const selectLayout = useCallback((layout) => {
    setSelectedLayout(layout)
  }, [])

  const setAuthenticated = useCallback((status, creds = null) => {
    setAuthStatus(status)
    if (status && creds) {
      setCredentials(creds)
    }
    if (!status) {
      // Reset everything on logout
      setSelectedDepartment(null)
      setSelectedLayout(null)
      setDepartments([])
      setLayouts([])
      setCredentials(null)
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const updateDepartments = useCallback((depts) => {
    setDepartments(depts)
  }, [])

  const updateLayouts = useCallback((layoutsList) => {
    setLayouts(layoutsList)
  }, [])

  const saveMappingDraft = useCallback((draft) => {
    setMappingDraft(draft)
  }, [])

  const clearMappingDraft = useCallback(() => {
    setMappingDraft(null)
    localStorage.removeItem(MAPPING_DRAFT_KEY)
  }, [])

  const value = {
    // State
    selectedDepartment,
    selectedLayout,
    authStatus,
    departments,
    layouts,
    credentials,
    mappingDraft,
    // Actions
    selectDepartment,
    selectLayout,
    setAuthenticated,
    updateDepartments,
    updateLayouts,
    setCredentials,
    saveMappingDraft,
    clearMappingDraft
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

/**
 * Hook to use the App Context
 */
export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}

import { type Task } from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// Add development bypass constants
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'

/**
 * Get authorization headers for API requests
 */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  // In development mode with bypass enabled, return mock headers
  if (IS_DEVELOPMENT && BYPASS_AUTH) {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-token-for-development'
    }
  }

  // Get Firebase auth token
  const { getAuth } = await import('firebase/auth')
  const auth = getAuth()

  if (!auth.currentUser) {
    throw new Error('User not authenticated')
  }

  const token = await auth.currentUser.getIdToken()

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
}

/**
 * Archive a task for the current user
 */
export const archiveTask = async (
  taskData: Task,
  originalDate: string
): Promise<{ success: boolean, message?: string, error?: string }> => {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/api/archive/task`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        taskId: taskData.id,
        taskData,
        originalDate
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`)
    }

    return result
  } catch (error) {
    console.error('Error archiving task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive task'
    }
  }
}

/**
 * Get all archived tasks for the current user
 */
export const getArchivedTasks = async (): Promise<{
  success: boolean
  archivedTasks: Array<{
    taskId: string
    archivedAt: string
    task: Task
    originalDate: string
  }>
  error?: string
}> => {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/api/archive/tasks`, {
      method: 'GET',
      headers
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`)
    }

    return result
  } catch (error) {
    console.error('Error getting archived tasks:', error)
    return {
      success: false,
      archivedTasks: [],
      error: error instanceof Error ? error.message : 'Failed to get archived tasks'
    }
  }
}

/**
 * Move an archived task to today's schedule
 */
export const moveArchivedTaskToToday = async (
  taskId: string
): Promise<{
  success: boolean
  task?: Task
  message?: string
  error?: string
}> => {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/api/archive/task/${taskId}/move-to-today`, {
      method: 'POST',
      headers
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`)
    }

    return result
  } catch (error) {
    console.error('Error moving archived task to today:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move task to today'
    }
  }
}

/**
 * Permanently delete an archived task
 */
export const deleteArchivedTask = async (
  taskId: string
): Promise<{ success: boolean, message?: string, error?: string }> => {
  try {
    const headers = await getAuthHeaders()

    const response = await fetch(`${API_BASE_URL}/api/archive/task/${taskId}`, {
      method: 'DELETE',
      headers
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`)
    }

    return result
  } catch (error) {
    console.error('Error deleting archived task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete archived task'
    }
  }
}

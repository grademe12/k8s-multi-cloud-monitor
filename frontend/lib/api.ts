const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token')
  
  if (!token) {
    throw new Error('No authentication token')
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  })

  // 401 에러 처리
  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Authentication failed')
  }

  return response
}

// GET 요청 헬퍼
export async function apiGet(endpoint: string) {
  return fetchWithAuth(`${API_URL}${endpoint}`)
}

// POST 요청 헬퍼
export async function apiPost(endpoint: string, data: any) {
  return fetchWithAuth(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// PUT 요청 헬퍼
export async function apiPut(endpoint: string, data: any) {
  return fetchWithAuth(`${API_URL}${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// DELETE 요청 헬퍼
export async function apiDelete(endpoint: string) {
  return fetchWithAuth(`${API_URL}${endpoint}`, {
    method: 'DELETE'
  })
}
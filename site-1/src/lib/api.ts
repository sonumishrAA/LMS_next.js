const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// Decode JWT payload without verifying signature (client-side expiry check)
export function isAdminTokenValid(): boolean {
  try {
    const token = localStorage.getItem('admin_token')
    if (!token) return false
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1]))
    // exp is in seconds, Date.now() is in ms
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('admin_token')
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function callEdgeFunction(
  name: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: any
    headers?: Record<string, string>
    useAdminToken?: boolean
    queryParams?: Record<string, string>
  } = {}
) {
  const { method = 'POST', body, headers = {}, useAdminToken = false, queryParams } = options

  let url = `${SUPABASE_URL}/functions/v1/${name}`
  
  if (queryParams) {
    const searchParams = new URLSearchParams(queryParams)
    url += `?${searchParams.toString()}`
  }
  
  const isFormData = body instanceof FormData
  
  const allHeaders: Record<string, string> = {
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    ...headers,
  }

  if (!isFormData) {
    allHeaders['Content-Type'] = 'application/json'
  }

  if (useAdminToken) {
    const token = localStorage.getItem('admin_token')
    if (token) {
      allHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  // Fallback Authorization if not set (for public protected functions)
  if (!allHeaders['Authorization'] && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    allHeaders['Authorization'] = `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
  }

  const res = await fetch(url, {
    method,
    headers: allHeaders,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  })

  if (!res.ok) {
    // If the admin token is expired/invalid, clear it and force re-login
    if (res.status === 401 && useAdminToken) {
      localStorage.removeItem('admin_token')
      window.location.href = '/lms-admin/login?expired=1'
      throw new Error('Session expired. Please log in again.')
    }
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Request failed')
  }

  return res.json()
}

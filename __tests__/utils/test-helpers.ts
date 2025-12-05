import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'

export function createMockRequest(options: {
  method?: string
  headers?: Record<string, string>
  body?: FormData
  url?: string
  ip?: string
}) {
  const { method = 'POST', headers = {}, body, url = 'http://localhost:3000', ip } = options

  const mockHeaders = new Headers({
    'content-type': 'multipart/form-data',
    ...headers,
  })

  // Only add IP headers if explicitly provided
  if (ip && !headers['x-forwarded-for'] && !headers['x-real-ip']) {
    mockHeaders.set('x-forwarded-for', ip)
  }

  // Create a proper request with FormData body
  const req = new NextRequest(url, {
    method,
    headers: mockHeaders,
    body: body instanceof FormData ? body : undefined,
  })

  // Mock the formData method
  if (body instanceof FormData) {
    req.formData = async () => body
  }

  // Mock the cookies
  const cookieStore = new Map<string, string>()
  if (headers.cookie) {
    headers.cookie.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=')
      cookieStore.set(key, value)
    })
  }

  req.cookies = {
    get: (name: string) => {
      const value = cookieStore.get(name)
      return value ? { name, value } : undefined
    },
    getAll: () => Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieStore.has(name),
    set: () => {},
    delete: () => {},
  } as unknown as typeof req.cookies

  return req
}

export function createMockResponse() {
  const { res } = createMocks()
  return res
}

export function createMockFormData(data: Record<string, string | Blob>) {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

export function mockIpAddress(ip: string) {
  return {
    'x-forwarded-for': ip,
    'x-real-ip': ip,
  }
}

export async function waitFor(condition: () => boolean, timeout = 5000) {
  const startTime = Date.now()
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
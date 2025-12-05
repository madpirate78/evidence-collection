// Simple mock request implementation for testing
export class MockNextRequest {
  public method: string
  public headers: Map<string, string>
  public url: string
  private _formData: FormData | null = null
  private _cookies: Map<string, string>

  constructor(url: string, options: {
    method?: string
    headers?: Record<string, string>
    body?: FormData
  } = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map()
    this._cookies = new Map()

    // Set default headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value)
      })
    }

    // Parse cookies from cookie header
    const cookieHeader = this.headers.get('cookie')
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) {
          this._cookies.set(key, value)
        }
      })
    }

    // Set form data
    if (options.body instanceof FormData) {
      this._formData = options.body
    }
  }

  async formData(): Promise<FormData> {
    if (!this._formData) {
      throw new Error('No form data available')
    }
    return this._formData
  }

  get cookies() {
    return {
      get: (name: string) => {
        const value = this._cookies.get(name)
        return value ? { name, value } : undefined
      },
      getAll: () => Array.from(this._cookies.entries()).map(([name, value]) => ({ name, value })),
      has: (name: string) => this._cookies.has(name),
    }
  }
}

export function createTestRequest(options: {
  method?: string
  headers?: Record<string, string>
  body?: FormData
  url?: string
  ip?: string
}) {
  const { method = 'POST', headers = {}, body, url = 'http://localhost:3000', ip } = options

  const requestHeaders: Record<string, string> = {
    'content-type': 'multipart/form-data',
    ...headers,
  }

  // Only add IP headers if explicitly provided
  if (ip && !headers['x-forwarded-for'] && !headers['x-real-ip']) {
    requestHeaders['x-forwarded-for'] = ip
  }

  return new MockNextRequest(url, {
    method,
    headers: requestHeaders,
    body,
  }) as unknown as Request
}
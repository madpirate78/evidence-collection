import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.CSRF_SECRET = 'test-csrf-secret'

// Suppress console errors during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console.error = jest.fn()
  global.console.warn = jest.fn()
}

// Mock fetch for tests
global.fetch = jest.fn()

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
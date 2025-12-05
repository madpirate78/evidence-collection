import { jest } from '@jest/globals'

// Mock Prisma client for testing
export const mockPrismaClient = {
  rateLimit: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  rateLimitBlock: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  rateLimitViolation: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}

// Helper to reset all mocks
export function resetPrismaMocks() {
  Object.values(mockPrismaClient).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.Mock).mockReset()
        }
      })
    }
  })
  ;(mockPrismaClient.$transaction as jest.Mock).mockReset()
}

// Mock the Prisma module
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrismaClient,
  prisma: mockPrismaClient,
}))

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { mockPrismaClient, resetPrismaMocks } from '../mocks/prisma'

// Must import after mock setup
import { checkRateLimit, getRateLimitStatus } from '@/lib/rate-limiter'

describe('Rate Limiter (Prisma)', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>

  beforeEach(() => {
    resetPrismaMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy.mockRestore()
  })

  describe('checkRateLimit', () => {
    it('should allow requests when under rate limit', async () => {
      // No active block
      mockPrismaClient.rateLimitBlock.findFirst.mockResolvedValue(null)
      // 2 previous attempts
      mockPrismaClient.rateLimit.findMany.mockResolvedValue([
        { id: 1n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
        { id: 2n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
      ])
      mockPrismaClient.rateLimit.create.mockResolvedValue({
        id: 3n,
        identifier: '127.0.0.1',
        action: 'submit_form',
        createdAt: new Date(),
      })

      const result = await checkRateLimit('127.0.0.1', 'submit_form')

      expect(result.allowed).toBe(true)
      expect(result.current_attempts).toBe(3)
      expect(result.remaining_attempts).toBe(2)
      expect(mockPrismaClient.rateLimit.create).toHaveBeenCalledWith({
        data: { identifier: '127.0.0.1', action: 'submit_form', userAgent: null },
      })
    })

    it('should block requests when rate limit exceeded', async () => {
      const oldestAttempt = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago

      // No active block
      mockPrismaClient.rateLimitBlock.findFirst.mockResolvedValue(null)
      // 5 previous attempts (max)
      mockPrismaClient.rateLimit.findMany.mockResolvedValue([
        { id: 1n, identifier: '127.0.0.1', action: 'submit_form', createdAt: oldestAttempt },
        { id: 2n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
        { id: 3n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
        { id: 4n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
        { id: 5n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
      ])
      mockPrismaClient.$transaction.mockResolvedValue([{}, {}])

      const result = await checkRateLimit('127.0.0.1', 'submit_form')

      expect(result.allowed).toBe(false)
      expect(result.current_attempts).toBe(5)
      expect(result.remaining_attempts).toBe(0)
      expect(result.message).toContain('Too many attempts')
      expect(mockPrismaClient.$transaction).toHaveBeenCalled()
    })

    it('should block if user is already blocked', async () => {
      const blockedUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

      mockPrismaClient.rateLimitBlock.findFirst.mockResolvedValue({
        id: 1n,
        identifier: '127.0.0.1',
        blockedUntil,
        reason: 'Too many requests',
      })

      const result = await checkRateLimit('127.0.0.1', 'submit_form')

      expect(result.allowed).toBe(false)
      expect(result.message).toContain('temporarily blocked')
      expect(result.blocked_until).toBe(blockedUntil.toISOString())
      expect(mockPrismaClient.rateLimit.findMany).not.toHaveBeenCalled()
    })

    it('should include user agent when provided', async () => {
      mockPrismaClient.rateLimitBlock.findFirst.mockResolvedValue(null)
      mockPrismaClient.rateLimit.findMany.mockResolvedValue([])
      mockPrismaClient.rateLimit.create.mockResolvedValue({
        id: 1n,
        identifier: '127.0.0.1',
        action: 'submit_form',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
      })

      await checkRateLimit('127.0.0.1', 'submit_form', 'Mozilla/5.0')

      expect(mockPrismaClient.rateLimit.create).toHaveBeenCalledWith({
        data: {
          identifier: '127.0.0.1',
          action: 'submit_form',
          userAgent: 'Mozilla/5.0',
        },
      })
    })

    it('should fail open when database error occurs', async () => {
      mockPrismaClient.rateLimitBlock.findFirst.mockRejectedValue(new Error('Database error'))

      const result = await checkRateLimit('127.0.0.1', 'submit_form')

      expect(result.allowed).toBe(true)
      expect(result.current_attempts).toBe(0)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Rate limiter error:', expect.any(Error))
    })

    it('should use custom config when provided', async () => {
      mockPrismaClient.rateLimitBlock.findFirst.mockResolvedValue(null)
      mockPrismaClient.rateLimit.findMany.mockResolvedValue([
        { id: 1n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
        { id: 2n, identifier: '127.0.0.1', action: 'submit_form', createdAt: new Date() },
      ])
      mockPrismaClient.rateLimit.create.mockResolvedValue({
        id: 3n,
        identifier: '127.0.0.1',
        action: 'submit_form',
        createdAt: new Date(),
      })

      const result = await checkRateLimit('127.0.0.1', 'submit_form', null, {
        maxAttempts: 10,
        windowMinutes: 30,
      })

      expect(result.allowed).toBe(true)
      expect(result.max_attempts).toBe(10)
      expect(result.window_minutes).toBe(30)
    })

    it('should allow first request for new identifier', async () => {
      mockPrismaClient.rateLimitBlock.findFirst.mockResolvedValue(null)
      mockPrismaClient.rateLimit.findMany.mockResolvedValue([])
      mockPrismaClient.rateLimit.create.mockResolvedValue({
        id: 1n,
        identifier: '192.168.1.1',
        action: 'submit_form',
        createdAt: new Date(),
      })

      const result = await checkRateLimit('192.168.1.1', 'submit_form')

      expect(result.allowed).toBe(true)
      expect(result.current_attempts).toBe(1)
      expect(result.remaining_attempts).toBe(4)
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return rate limit status without incrementing', async () => {
      mockPrismaClient.rateLimit.count.mockResolvedValue(3)

      const result = await getRateLimitStatus('127.0.0.1', 'submit_form')

      expect(result).toEqual({
        allowed: true,
        current_attempts: 3,
        max_attempts: 5,
        remaining_attempts: 2,
        window_minutes: 15,
      })
      expect(mockPrismaClient.rateLimit.create).not.toHaveBeenCalled()
    })

    it('should return not allowed when at limit', async () => {
      mockPrismaClient.rateLimit.count.mockResolvedValue(5)

      const result = await getRateLimitStatus('127.0.0.1', 'submit_form')

      expect(result?.allowed).toBe(false)
      expect(result?.remaining_attempts).toBe(0)
    })

    it('should return null on error', async () => {
      mockPrismaClient.rateLimit.count.mockRejectedValue(new Error('Database error'))

      const result = await getRateLimitStatus('127.0.0.1', 'submit_form')

      expect(result).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Rate limit status error:', expect.any(Error))
    })
  })
})

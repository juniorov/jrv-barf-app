import { describe, it, expect } from 'vitest'
import { calculateAge, calculateRealAge } from '../../utils/age.js'

describe('calculateAge', () => {
  it('returns 0 for empty birthDate', () => {
    expect(calculateAge(null)).toBe(0)
    expect(calculateAge(undefined)).toBe(0)
    expect(calculateAge('')).toBe(0)
  })

  it('calculates age correctly for a known date', () => {
    const today = new Date()
    const birthYear = today.getFullYear() - 3
    const birthDate = `${birthYear}-01-15`
    const age = calculateAge(birthDate)
    expect(age).toBeGreaterThanOrEqual(2.9)
    expect(age).toBeLessThanOrEqual(3.5)
  })

  it('returns 0 for future dates', () => {
    const futureDate = '2099-01-01'
    expect(calculateAge(futureDate)).toBe(0)
  })

  it('calculates age with decimals', () => {
    const today = new Date()
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
    const birthDate = sixMonthsAgo.toISOString().split('T')[0]
    const age = calculateAge(birthDate)
    expect(age).toBeGreaterThanOrEqual(0.4)
    expect(age).toBeLessThanOrEqual(0.6)
  })
})

describe('calculateRealAge', () => {
  it('returns 0 for invalid input', () => {
    expect(calculateRealAge(null)).toBe(0)
    expect(calculateRealAge(undefined)).toBe(0)
    expect(calculateRealAge(0)).toBe(0)
    expect(calculateRealAge(-1)).toBe(0)
  })

  it('calculates real age correctly for first year (15 human months = 1 dog year)', () => {
    expect(calculateRealAge(15)).toBe(1)
    expect(calculateRealAge(7.5)).toBeCloseTo(0.5, 1)
  })

  it('returns 2 for 24 human months', () => {
    expect(calculateRealAge(24)).toBe(2)
  })

  it('calculates real age after 2 years (+4 human months per dog year)', () => {
    expect(calculateRealAge(28)).toBeCloseTo(3, 1)
    expect(calculateRealAge(48)).toBeCloseTo(8, 1)
  })
})

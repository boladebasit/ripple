import { describe, it, expect, beforeEach } from 'vitest'

const mockContract = {
  admin: 'ST1ADMIN00000000000000000000000000000ADMIN',
  waterRights: new Map<string, number>(),
  usageReports: new Map<string, number>(),
  suspendedAccounts: new Map<string, boolean>(),

  isAdmin(caller: string) {
    return caller === this.admin
  },

  transferAdmin(caller: string, newAdmin: string) {
    if (!this.isAdmin(caller)) return { error: 100 } // ERR-NOT-AUTHORIZED
    this.admin = newAdmin
    return { value: true }
  },

  registerRightsHolder(caller: string, holder: string, allocation: number) {
    if (!this.isAdmin(caller)) return { error: 100 }
    if (allocation <= 0) return { error: 103 }
    if (this.waterRights.has(holder)) return { error: 101 }
    this.waterRights.set(holder, allocation)
    return { value: true }
  },

  revokeHolder(caller: string, holder: string) {
    if (!this.isAdmin(caller)) return { error: 100 }
    if (!this.waterRights.has(holder)) return { error: 102 }
    this.waterRights.delete(holder)
    this.usageReports.delete(holder)
    return { value: true }
  },

  suspendHolder(caller: string, holder: string) {
    if (!this.isAdmin(caller)) return { error: 100 }
    this.suspendedAccounts.set(holder, true)
    return { value: true }
  },

  reactivateHolder(caller: string, holder: string) {
    if (!this.isAdmin(caller)) return { error: 100 }
    this.suspendedAccounts.delete(holder)
    return { value: true }
  },

  reportUsage(caller: string, amount: number) {
    if (this.suspendedAccounts.has(caller)) return { error: 104 }
    if (!this.waterRights.has(caller)) return { error: 102 }
    const limit = this.waterRights.get(caller)!
    if (amount > limit) return { error: 105 }
    this.usageReports.set(caller, amount)
    return { value: true }
  },

  adjustAllocation(caller: string, holder: string, newAllocation: number) {
    if (!this.isAdmin(caller)) return { error: 100 }
    if (!this.waterRights.has(holder)) return { error: 102 }
    if (newAllocation <= 0) return { error: 103 }
    this.waterRights.set(holder, newAllocation)
    return { value: true }
  },

  getAllocation(holder: string) {
    return this.waterRights.get(holder) ?? 0
  },

  getUsage(holder: string) {
    return this.usageReports.get(holder) ?? 0
  },

  isSuspended(holder: string) {
    return this.suspendedAccounts.has(holder)
  },
}

const admin = 'ST1ADMIN00000000000000000000000000000ADMIN'
const alice = 'ST2ALICE000000000000000000000000000000ALICE'
const bob = 'ST3BOB000000000000000000000000000000000BOB'

describe('Water Rights Registry Contract', () => {
  beforeEach(() => {
    mockContract.admin = admin
    mockContract.waterRights = new Map()
    mockContract.usageReports = new Map()
    mockContract.suspendedAccounts = new Map()
  })

  it('registers a new rights holder', () => {
    const result = mockContract.registerRightsHolder(admin, alice, 1000)
    expect(result).toEqual({ value: true })
    expect(mockContract.getAllocation(alice)).toBe(1000)
  })

  it('prevents duplicate registration', () => {
    mockContract.registerRightsHolder(admin, alice, 1000)
    const result = mockContract.registerRightsHolder(admin, alice, 500)
    expect(result).toEqual({ error: 101 })
  })

  it('rejects non-admin registration', () => {
    const result = mockContract.registerRightsHolder(bob, alice, 1000)
    expect(result).toEqual({ error: 100 })
  })

  it('suspends and prevents usage', () => {
    mockContract.registerRightsHolder(admin, alice, 500)
    mockContract.suspendHolder(admin, alice)
    const usage = mockContract.reportUsage(alice, 100)
    expect(usage).toEqual({ error: 104 })
  })

  it('prevents overuse of water rights', () => {
    mockContract.registerRightsHolder(admin, alice, 200)
    const result = mockContract.reportUsage(alice, 300)
    expect(result).toEqual({ error: 105 })
  })

  it('records valid usage within limits', () => {
    mockContract.registerRightsHolder(admin, alice, 1000)
    const result = mockContract.reportUsage(alice, 900)
    expect(result).toEqual({ value: true })
    expect(mockContract.getUsage(alice)).toBe(900)
  })

  it('adjusts allocation properly', () => {
    mockContract.registerRightsHolder(admin, alice, 500)
    const result = mockContract.adjustAllocation(admin, alice, 800)
    expect(result).toEqual({ value: true })
    expect(mockContract.getAllocation(alice)).toBe(800)
  })

  it('transfers admin rights', () => {
    const result = mockContract.transferAdmin(admin, bob)
    expect(result).toEqual({ value: true })
    expect(mockContract.admin).toBe(bob)
  })

  it('revokes a rights holder', () => {
    mockContract.registerRightsHolder(admin, alice, 1000)
    const result = mockContract.revokeHolder(admin, alice)
    expect(result).toEqual({ value: true })
    expect(mockContract.getAllocation(alice)).toBe(0)
  })

  it('reactivates a suspended account', () => {
    mockContract.registerRightsHolder(admin, alice, 1000)
    mockContract.suspendHolder(admin, alice)
    mockContract.reactivateHolder(admin, alice)
    expect(mockContract.isSuspended(alice)).toBe(false)
  })
})

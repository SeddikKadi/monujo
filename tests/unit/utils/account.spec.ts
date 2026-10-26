import { describe, expect, it, vi } from "vitest"
import {
  getRecipientSearch,
  getSafeWalletRecipient,
  getWalletAuthName,
} from "../../../src/utils/account"

describe("getRecipientSearch", () => {
  it("searches the recipients the account pays", () => {
    const userAccount = {
      searchRecipients: vi.fn(function (this: unknown) {
        return this
      }),
      parent: { searchRecipients: vi.fn() },
    }

    const search = getRecipientSearch(userAccount)

    expect(search("bob")).toBe(userAccount)
    expect(userAccount.searchRecipients).toHaveBeenCalledWith("bob")
    expect(userAccount.parent.searchRecipients).not.toHaveBeenCalled()
  })

  it("searches from the administrator's wallet when inspecting another wallet", () => {
    const inspected = {
      searchRecipients: vi.fn(() => {
        throw new Error("not a wallet of the current user")
      }),
    }
    const caller = {
      searchRecipients: vi.fn(function (this: unknown) {
        return this
      }),
    }

    const search = getRecipientSearch(inspected, caller)

    expect(search("bob")).toBe(caller)
    expect(inspected.searchRecipients).not.toHaveBeenCalled()
  })

  it("searches the currency's recipients with a LokAPI without account search", () => {
    const parent = {
      searchRecipients: vi.fn(function (this: unknown) {
        return this
      }),
    }

    const search = getRecipientSearch({ parent })

    expect(search("bob")).toBe(parent)
    expect(parent.searchRecipients).toHaveBeenCalledWith("bob")
  })
})

describe("getSafeWalletRecipient", () => {
  it("is the safe wallet recipient paid from the account", () => {
    const userAccount = {
      safeWalletRecipient: "own recipient",
      parent: { safeWalletRecipient: "currency recipient" },
    }

    expect(getSafeWalletRecipient(userAccount)).toBe("own recipient")
  })

  it("is the account's own answer, even when it may not reconvert", () => {
    const userAccount = {
      safeWalletRecipient: null,
      parent: { safeWalletRecipient: "currency recipient" },
    }

    expect(getSafeWalletRecipient(userAccount)).toBeNull()
  })

  it("is the currency's with a LokAPI without account safe wallet", () => {
    const userAccount = { parent: { safeWalletRecipient: "currency recipient" } }

    expect(getSafeWalletRecipient(userAccount)).toBe("currency recipient")
  })
})

describe("getWalletAuthName", () => {
  const walletA = { internalId: "comchain:1f337cc2e0d3c08f711a" }
  const walletB = { internalId: "comchain:435f02b25083fdf0acea" }

  it("identifies the wallet when the user has several", () => {
    expect(getWalletAuthName(walletA, [walletA, walletB])).toBe(
      "comchain:1f337c"
    )
  })

  it("gives no name when the user has a single wallet", () => {
    expect(getWalletAuthName(walletA, [walletA])).toBe(false)
  })
})

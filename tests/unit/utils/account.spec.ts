import { describe, expect, it, vi } from "vitest"
import {
  canIssueCredit,
  getAccountBackend,
  getOtherWalletNames,
  validateWalletName,
  getDefaultWalletName,
  getRecipientSearch,
  getRecipientWalletName,
  getSafeWalletRecipient,
  getWalletAuthName,
  getWalletName,
  translateWalletLabel,
} from "../../../src/utils/account"

import { walletTranslations } from "../helpers/walletTranslations"

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

describe("wallet labels in owner displays", () => {
  it("uses the label and follows renames", () => {
    const wallet = { label: "Shop" }
    const name = getWalletName(wallet, (message: string) => message)
    expect(name()).toBe("Shop")
    wallet.label = "Workshop"
    expect(name()).toBe("Workshop")
  })

  it("keeps the translated default for unnamed wallets", () => {
    expect(getWalletName({}, () => "Principal")()).toBe("Principal")
  })

  it("uses the wallet label in both authentication settings and prompts", () => {
    const wallet = { internalId: "comchain:abcd", label: "Shop" }
    expect(getWalletAuthName(wallet, [wallet, {}])).toBe("Shop")
  })
})


describe("getRecipientWalletName", () => {
  const gettext = (message: string) => `[${message}]`

  it("shows the name of a named wallet, translating the reserved one", () => {
    expect(getRecipientWalletName({ walletLabel: "Shop" }, gettext)).toBe("Shop")
    expect(
      getRecipientWalletName(
        { walletLabel: "compte principal", hasSiblingWallets: true },
        gettext
      )
    ).toBe("[main]")
  })

  it("gives an unnamed wallet the default name among the owner's other wallets only", () => {
    expect(getRecipientWalletName({ hasSiblingWallets: true }, gettext)).toBe(
      "[Main]"
    )
    expect(getRecipientWalletName({ hasSiblingWallets: false }, gettext)).toBe("")
    expect(getRecipientWalletName({}, gettext)).toBe("")
    expect(getRecipientWalletName(undefined, gettext)).toBe("")
  })
})

describe("default wallet names across languages", () => {
  it.each([
    ["main", "main", "compte principal"],
    ["Main", "main", "compte principal"],
    ["compte principal", "main", "compte principal"],
    ["Compte principal", "main", "compte principal"],
  ])("translates the saved first wallet name %j in either language", (saved, english, french) => {
    const gettext = walletTranslations()
    expect(translateWalletLabel(saved, gettext.$gettext)).toBe(english)
    gettext.current = "fr-FR"
    expect(translateWalletLabel(saved, gettext.$gettext)).toBe(french)
  })

  it("updates an existing wallet name on language change without rewriting it", () => {
    const gettext = walletTranslations()
    const wallet = { label: "compte principal" }
    const name = getWalletName(wallet, gettext.$gettext)
    expect(name()).toBe("main")
    gettext.current = "fr-FR"
    expect(name()).toBe("compte principal")
    gettext.current = "en"
    expect(name()).toBe("main")
    expect(wallet.label).toBe("compte principal")
    wallet.label = "Boutique"
    expect(name()).toBe("Boutique")
  })

  it.each([
    "Boutique", "Main shop", "secondary savings", "compte principal pro", "Refresh", "",
    // Former default names of later wallets are now ordinary labels.
    "Secondary Wallet", "compte secondaire", "Tertiary Wallet", "account 4", "compte 5",
  ])(
    "leaves the custom label %j unchanged", label => {
      const gettext = walletTranslations()
      expect(translateWalletLabel(label, gettext.$gettext)).toBe(label)
      gettext.current = "fr-FR"
      expect(translateWalletLabel(label, gettext.$gettext)).toBe(label)
    }
  )
})

describe("canIssueCredit", () => {
  it("follows the credit right of the administrator wallet", async () => {
    const admin = { hasCreditRequestValidationRights: vi.fn(async () => true) }
    expect(await canIssueCredit(admin)).toBe(true)
    admin.hasCreditRequestValidationRights.mockResolvedValue(false)
    expect(await canIssueCredit(admin)).toBe(false)
  })

  it("refuses when the right is unknown or cannot be checked", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    expect(await canIssueCredit(undefined)).toBe(false)
    expect(await canIssueCredit({})).toBe(false)
    expect(
      await canIssueCredit({
        hasCreditRequestValidationRights: async () => {
          throw new Error("offline")
        },
      })
    ).toBe(false)
    error.mockRestore()
  })
})

describe("getDefaultWalletName", () => {
  it("names only the first wallet", () => {
    const gettext = walletTranslations()
    expect(getDefaultWalletName(0, gettext.$gettext)).toBe("main")
    gettext.current = "fr-FR"
    expect(getDefaultWalletName(0, gettext.$gettext)).toBe("compte principal")
    for (const count of [1, 2, 3, 10]) {
      expect(getDefaultWalletName(count, gettext.$gettext)).toBe("")
    }
  })
})

const INVALID_CHARACTERS =
  "Use only letters, digits, spaces, hyphens and apostrophes. " +
  "The name must start and end with a letter or a digit."
const NOT_UNIQUE = "You already have a wallet with this name in this currency."

describe("wallet name validation", () => {
  const backends = {
    "comchain:a": { userAccounts: { a1: { label: "Shop" }, a2: {} } },
    "cyclos:b": {
      userAccounts: { b1: { label: "compte principal" }, b2: { label: "Bank" } },
    },
  }

  it("lists the displayed names of the other wallets of one currency", () => {
    const gettext = walletTranslations()
    const currency = backends["comchain:a"]
    const own = currency.userAccounts.a1
    expect(getAccountBackend(backends, own)).toBe(currency)
    expect(getAccountBackend(backends, {})).toBeUndefined()
    expect(getOtherWalletNames(currency, gettext.$gettext, own)).toEqual(["Main"])
    expect(getOtherWalletNames(currency, gettext.$gettext)).toEqual(["Shop", "Main"])
    gettext.current = "fr-FR"
    expect(getOtherWalletNames(backends["cyclos:b"], gettext.$gettext)).toEqual(
      ["compte principal", "Bank"]
    )
    expect(getOtherWalletNames(undefined, gettext.$gettext)).toEqual([])
  })

  it.each([
    ["Workshop", null],
    ["  Work   shop ", null],
    ["", "Please enter a wallet name."],
    ["Caf\u00e9-librairie", null],
    ["L'atelier", null],
    ["L\u2019atelier", null],
    ["x".repeat(30), null],
    // "Bank" is only used in the other currency.
    ["Bank", null],
    ["x".repeat(31), "The wallet name must not exceed 30 characters."],
    ["a/b", INVALID_CHARACTERS],
    ["shop-", INVALID_CHARACTERS],
    ["shop", NOT_UNIQUE],
    ["MAIN", NOT_UNIQUE],
    ["Compte principal", NOT_UNIQUE],
  ])("checks %j", (name, expected) => {
    const gettext = walletTranslations()
    const others = getOtherWalletNames(backends["comchain:a"], gettext.$gettext)
    expect(validateWalletName(name, others, gettext.$gettext)).toBe(expected)
  })
})

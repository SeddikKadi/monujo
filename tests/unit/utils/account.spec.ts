import { describe, expect, it, vi } from "vitest"
import {
  canIssueCredit,
  getAccountBackend,
  getAccountFullName,
  getAccountWalletName,
  getOwnerFullName,
  getRelatedFullName,
  getOwnWalletLine,
  getRecipientWalletLine,
  getRelatedWalletLine,
  getRequestWalletLine,
  getWalletLine,
  hasSeveralWallets,
  toFileNamePart,
  withWalletName,
  getOtherWalletNames,
  validateWalletName,
  getDefaultWalletName,
  getRecipientFullName,
  getRecipientSearch,
  getRecipientWalletName,
  getSafeWalletRecipient,
  getWalletAuthName,
  getWalletName,
  translateWalletLabel,
} from "../../../src/utils/account"

import { createGettext } from "vue3-gettext"

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
      "[main]"
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

describe("getRecipientFullName", () => {
  it.each([
    [{ name: "Alice", walletLabel: "Shop" }, "Alice (Shop)"],
    [{ name: "Alice", hasSiblingWallets: true }, "Alice (main)"],
    [{ name: "Alice" }, "Alice"],
  ])("names the wallet of %j when it has a name to show", (recipient, name) => {
    expect(getRecipientFullName(recipient, (text: string) => text)).toBe(name)
  })
})

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
    expect(getOtherWalletNames(currency, gettext.$gettext, own)).toEqual(["Main", "main"])
    expect(getOtherWalletNames(currency, gettext.$gettext)).toEqual(["Shop", "Main", "main"])
    gettext.current = "fr-FR"
    expect(getOtherWalletNames(backends["cyclos:b"], gettext.$gettext)).toEqual(
      ["compte principal", "Bank"]
    )
    expect(getOtherWalletNames(undefined, gettext.$gettext)).toEqual([])
  })

  it("refuses in French both names an unnamed wallet is displayed with", () => {
    const gettext = createGettext({
      availableLanguages: { "fr-FR": "Français" },
      defaultLanguage: "fr-FR",
      translations: {
        "fr-FR": { main: "compte principal", Main: "Principal" },
      },
    })
    gettext.muted = ["fr-FR"]
    const others = getOtherWalletNames(
      backends["comchain:a"],
      gettext.$gettext,
      backends["comchain:a"].userAccounts.a1
    )
    // The dashboard name and the name used in lists and transaction screens
    expect(others).toEqual(["Principal", "compte principal"])
    for (const name of ["Compte principal", "principal", "Main"]) {
      expect(validateWalletName(name, others, gettext.$gettext)).not.toBeNull()
    }
    expect(validateWalletName("Atelier", others, gettext.$gettext)).toBeNull()
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


describe("wallet line under the name of its owner", () => {
  const $gettext = (message: string, params: any = {}) =>
    message.replace(/%\{\s*(\w+)\s*\}/g, (_, key) => params[key])
  // Wallets of the user as listed on the dashboard: the only one of its
  // currency, and one of two
  const ownWallet = (label: string | undefined, walletCount: number) => {
    const userAccounts: any = {}
    for (let i = 0; i < walletCount; i++) userAccounts[`wallet${i}`] = {}
    return {
      _obj: { label, getTransactions: () => null, parent: { userAccounts } },
    }
  }
  const only = ownWallet("Shop", 1)
  const oneOfTwo = ownWallet("Shop", 2)
  const unnamedOfTwo = ownWallet(undefined, 2)

  it("writes the wallet name after a caption", () => {
    expect(getWalletLine("Shop", $gettext)).toBe("Wallet Shop")
    expect(getWalletLine("", $gettext)).toBe("")
  })

  it("tells whether the user has several wallets in a currency", () => {
    expect(hasSeveralWallets(oneOfTwo)).toBe(true)
    expect(hasSeveralWallets(only)).toBe(false)
    // A balance of a wallet with several balances
    expect(hasSeveralWallets({ _obj: { parent: oneOfTwo._obj } })).toBe(true)
    expect(hasSeveralWallets({ curr: "EUR" })).toBe(false)
    expect(hasSeveralWallets(null)).toBe(false)
  })

  it("names the user's wallet only when the user has several", () => {
    expect(getOwnWalletLine(oneOfTwo, $gettext)).toBe("Wallet Shop")
    expect(getOwnWalletLine(unnamedOfTwo, $gettext)).toBe("Wallet main")
    expect(getOwnWalletLine(only, $gettext)).toBe("")
  })

  it("names the wallet of a recipient only among its other wallets", () => {
    expect(
      getRecipientWalletLine(
        { walletLabel: "Shop", hasSiblingWallets: true },
        $gettext
      )
    ).toBe("Wallet Shop")
    expect(getRecipientWalletLine({ hasSiblingWallets: true }, $gettext)).toBe(
      "Wallet main"
    )
    // The only wallet listed for a person, even named
    expect(getRecipientWalletLine({ walletLabel: "Shop" }, $gettext)).toBe("")
    expect(getRecipientWalletLine(undefined, $gettext)).toBe("")
  })

  it("names the wallets of a payment request or recurring payment", () => {
    // Received by a wallet of the user, paid by Bob
    const request = {
      isSender: false,
      isReceiver: true,
      senderWalletLabel: "Home",
      senderWalletHasSiblings: true,
    }
    // The other party has several wallets: the public name of this one
    expect(getRequestWalletLine(request, "sender", only, $gettext)).toBe(
      "Wallet Home"
    )
    // The user's side follows the user's own wallets
    expect(getRequestWalletLine(request, "receiver", only, $gettext)).toBe("")
    expect(getRequestWalletLine(request, "receiver", oneOfTwo, $gettext)).toBe(
      "Wallet Shop"
    )
    // An unnamed wallet among several gets the name of a first wallet,
    // which is translated when saved as a label
    expect(
      getRequestWalletLine(
        { senderWalletHasSiblings: true },
        "sender",
        only,
        $gettext
      )
    ).toBe("Wallet main")
    expect(
      getRequestWalletLine(
        { senderWalletLabel: "compte principal", senderWalletHasSiblings: true },
        "sender",
        only,
        $gettext
      )
    ).toBe("Wallet main")
    // The only wallet of the other party, even named, and an older server
    expect(
      getRequestWalletLine(
        { senderWalletLabel: "Home", senderWalletHasSiblings: false },
        "sender",
        only,
        $gettext
      )
    ).toBe("")
    expect(
      getRequestWalletLine({ senderWalletLabel: "Home" }, "sender", only, $gettext)
    ).toBe("")
  })
})

describe("wallet line of the other party of a transaction", () => {
  const $gettext = (message: string, params: any = {}) =>
    message.replace(/%\{\s*(\w+)\s*\}/g, (_, key) => params[key])

  it("names the wallet when its owner has several", () => {
    expect(
      getRelatedWalletLine(
        { relatedWalletLabel: "Shop", relatedWalletHasSiblings: true },
        $gettext
      )
    ).toBe("Wallet Shop")
    expect(
      getRelatedWalletLine({ relatedWalletHasSiblings: true }, $gettext)
    ).toBe("Wallet main")
  })

  it("shows nothing for the only wallet of its owner", () => {
    expect(
      getRelatedWalletLine(
        { relatedWalletLabel: "Shop", relatedWalletHasSiblings: false },
        $gettext
      )
    ).toBe("")
    // An older server, an administrative operation
    expect(getRelatedWalletLine({ relatedWalletLabel: "Shop" }, $gettext)).toBe(
      ""
    )
    expect(getRelatedWalletLine({}, $gettext)).toBe("")
  })
})

describe("wallet names outside the dashboard", () => {
  const $gettext = (message: string) => message
  const wallet = (label?: string) => ({ label, getTransactions: () => null })
  // Dashboard entries: a wallet with one balance, and one balance of a
  // wallet with two
  const shop = { name: () => "Shop", _obj: wallet("Shop") }
  const converted = {
    name: () => "Converted",
    _obj: { parent: wallet("Shop") },
  }
  const unnamed = { name: () => "Main", _obj: wallet() }

  it("gives the name of the wallet of a dashboard entry", () => {
    expect(getAccountWalletName(shop, $gettext)).toBe("Shop")
    expect(getAccountWalletName(converted, $gettext)).toBe("Shop")
    expect(getAccountWalletName(unnamed, $gettext)).toBe("main")
    expect(getAccountWalletName({ curr: "EUR" }, $gettext)).toBe("")
    expect(getAccountWalletName(null, $gettext)).toBe("")
  })

  it("names a balance of a wallet with several with its wallet", () => {
    expect(getAccountFullName(converted, $gettext)).toBe("Shop – Converted")
    expect(getAccountFullName(shop, $gettext)).toBe("Shop")
    expect(getAccountFullName(unnamed, $gettext)).toBe("main")
    expect(getAccountFullName({ name: () => "Other" }, $gettext)).toBe("Other")
  })

  it("adds the wallet to a title and to the name of its owner", () => {
    expect(withWalletName("All transactions", shop, $gettext)).toBe(
      "All transactions – Shop"
    )
    expect(withWalletName("All transactions", {}, $gettext)).toBe(
      "All transactions"
    )
    expect(getOwnerFullName("Alice", converted, $gettext)).toBe("Alice (Shop)")
    expect(getOwnerFullName("Alice", {}, $gettext)).toBe("Alice")
  })

  it("names the other party of a transaction with its wallet", () => {
    expect(
      getRelatedFullName({ related: "Bob", relatedWalletLabel: "Shop" }, $gettext)
    ).toBe("Bob (Shop)")
    expect(getRelatedFullName({ related: "Bob" }, $gettext)).toBe("Bob")
    expect(
      getRelatedFullName({ related: "Bob", relatedWalletLabel: null }, $gettext)
    ).toBe("Bob")
  })

  it("makes a wallet name safe for a file name", () => {
    expect(toFileNamePart("Shop")).toBe("Shop")
    expect(toFileNamePart("L'atelier d'Anne-Marie")).toBe(
      "L'atelier d'Anne-Marie"
    )
    expect(toFileNamePart('a/b\\c:d*e?f"g<h>i|j')).toBe("a-b-c-d-e-f-g-h-i-j")
  })
})

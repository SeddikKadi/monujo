import { describe, expect, it } from "vitest"
import {
  getRecipientNames,
  isRequestWithRecipient,
  isTransactionWithRecipient,
} from "../../../src/utils/recipient"

describe("isTransactionWithRecipient", () => {
  const bobShop = { name: "Bob", ident: "bbbb" }

  it("matches the recipient wallet by address", () => {
    expect(
      isTransactionWithRecipient({ related: "Bob", relatedIdent: "BBBB" }, bobShop)
    ).toBe(true)
  })

  it("does not match another wallet of the same person", () => {
    expect(
      isTransactionWithRecipient({ related: "Bob", relatedIdent: "cccc" }, bobShop)
    ).toBe(false)
  })

  it("compares names when an address is unknown", () => {
    expect(isTransactionWithRecipient({ related: "Bob" }, bobShop)).toBe(true)
    expect(
      isTransactionWithRecipient({ related: "Bob", relatedIdent: "cccc" }, {
        name: "Bob",
      })
    ).toBe(true)
  })
})

describe("getRecipientNames", () => {
  const $gettext = (message: string) => message

  it("names each wallet of a person with several wallets", () => {
    expect(
      getRecipientNames(
        [
          { name: "Bob", ident: "bbbb", walletLabel: "Shop" },
          { name: "Bob", ident: "cccc", hasSiblingWallets: true },
          { name: "Alice", ident: "aaaa" },
        ],
        $gettext
      )
    ).toEqual(["Bob (Shop)", "Bob (main)", "Alice"])
  })

  it("adds the start of the address to names still shared by several recipients", () => {
    expect(
      getRecipientNames(
        [
          { name: "Bob", ident: "0x1f337cc2e0d3" },
          { name: "Bob", ident: "435f02b25083" },
          { name: "Carol", ident: "0xAAAA11112222", walletLabel: "Shop" },
          { name: "Carol", ident: "bbbb33334444", walletLabel: "Shop" },
          { name: "Alice", ident: "aaaa" },
        ],
        $gettext
      )
    ).toEqual([
      "Bob (1f337c…)",
      "Bob (435f02…)",
      "Carol (Shop, aaaa11…)",
      "Carol (Shop, bbbb33…)",
      "Alice",
    ])
  })

  it("keeps the name without address when unknown", () => {
    expect(
      getRecipientNames([{ name: "Bob" }, { name: "Bob" }], $gettext)
    ).toEqual(["Bob", "Bob"])
  })
})

describe("isRequestWithRecipient", () => {
  const bobShop = { name: "Bob", userAccountInternalId: "comchain:bbbb" }

  it("matches the wallet on either side of a request", () => {
    for (const side of [
      "senderWalletUri",
      "receiverWalletUri",
      "creatorWalletUri",
    ]) {
      expect(
        isRequestWithRecipient({ [side]: "comchain:bbbb" }, bobShop)
      ).toBe(true)
    }
  })

  it("does not match another wallet of the same person, whatever the names", () => {
    expect(
      isRequestWithRecipient(
        {
          related: "Bob",
          creatorName: "Bob",
          jsonData: { sender_name: "Bob", receiver_name: "Bob" },
          senderWalletUri: "comchain:cccc",
          receiverWalletUri: "comchain:aaaa",
        },
        bobShop
      )
    ).toBe(false)
  })

  it("lets the recipient compare wallet references itself", () => {
    const recipient = {
      name: "Bob",
      userAccountInternalId: "comchain:bbbb",
      isWalletDesignatedBy: (walletRef: string) =>
        walletRef.toLowerCase() === "comchain:0xbbbb",
    }
    expect(
      isRequestWithRecipient({ senderWalletUri: "comchain:0xBBBB" }, recipient)
    ).toBe(true)
    expect(
      isRequestWithRecipient({ senderWalletUri: "comchain:bbbb" }, recipient)
    ).toBe(false)
  })

  it("matches nothing without wallet reference", () => {
    expect(isRequestWithRecipient({}, bobShop)).toBe(false)
  })
})

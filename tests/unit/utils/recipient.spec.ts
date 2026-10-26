import { describe, expect, it } from "vitest"
import {
  getRecipientNames,
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
  it("adds the start of the address to names shared by several recipients", () => {
    expect(
      getRecipientNames([
        { name: "Bob", ident: "0x1f337cc2e0d3" },
        { name: "Bob", ident: "435f02b25083" },
        { name: "Alice", ident: "aaaa" },
      ])
    ).toEqual(["Bob (1f337c…)", "Bob (435f02…)", "Alice"])
  })

  it("keeps the name without address when unknown", () => {
    expect(getRecipientNames([{ name: "Bob" }, { name: "Bob" }])).toEqual([
      "Bob",
      "Bob",
    ])
  })
})

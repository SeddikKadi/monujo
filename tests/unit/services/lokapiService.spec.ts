import { describe, expect, it, vi } from "vitest"

vi.mock("@lokavaluto/lokapi-browser", () => ({
  LokAPIBrowserAbstract: class {},
  e: {},
  t: {},
}))
vi.mock("@lokavaluto/lokapi-backend-comchain", () => ({ default: {} }))
vi.mock("@lokavaluto/lokapi-backend-cyclos", () => ({ default: {} }))

import { makeUIProxyBackend } from "../../../src/services/lokapiService"

describe("makeUIProxyBackend", () => {
  it("searches the recipients the given account pays", async () => {
    const recipient = { name: "Bob" }
    const backend = {
      searchRecipients: vi.fn(async function* () {
        yield recipient
      }),
    }
    const account = { internalId: "comchain:bbbb" }

    const recipients = []
    const proxy = makeUIProxyBackend(backend as any, (s: string) => s, account)
    for await (const r of proxy.searchRecipients("bob")) recipients.push(r)

    expect(backend.searchRecipients).toHaveBeenCalledWith("bob", account)
    expect(recipients).toHaveLength(1)
  })

  it("looks a recipient up paid from the given account", async () => {
    const backend = { searchRecipientByUri: vi.fn(async () => "recipient") }
    const account = { internalId: "comchain:bbbb" }

    const proxy = makeUIProxyBackend(backend as any, (s: string) => s, account)

    expect(await proxy.searchRecipientByUri({ rp: 7, rpb: "comchain:eeee" })).toBe(
      "recipient"
    )
    expect(backend.searchRecipientByUri).toHaveBeenCalledWith(
      { rp: 7, rpb: "comchain:eeee" },
      account
    )
  })
})

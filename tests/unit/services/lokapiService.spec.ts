import { describe, expect, it, vi } from "vitest"
import { flushPromises } from "@vue/test-utils"

vi.mock("@lokavaluto/lokapi-browser", () => ({
  LokAPIBrowserAbstract: class {},
  e: { BackendUnavailableTransient: class extends Error {} },
  t: {},
}))
vi.mock("@lokavaluto/lokapi-backend-comchain", () => ({ default: {} }))
vi.mock("@lokavaluto/lokapi-backend-cyclos", () => ({ default: {} }))

import {
  accountOrder,
  LokAPI,
  makeUIProxyBackend,
} from "../../../src/services/lokapiService"

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

describe("accountOrder", () => {
  const account = (backend: string, name: string, id: string) => ({
    backend,
    name: () => name,
    id,
  })

  it("orders accounts with the same name by id", () => {
    const accounts = [
      account("comchain", "Main", "comchain:bbbb"),
      account("comchain", "Main", "comchain:aaaa"),
    ]

    expect(accounts.sort(accountOrder).map((a) => a.id)).toEqual([
      "comchain:aaaa",
      "comchain:bbbb",
    ])
  })

  it("orders by displayed name within a backend", () => {
    const accounts = [
      account("comchain", "Shop", "comchain:aaaa"),
      account("comchain", "Home", "comchain:bbbb"),
    ]

    expect(accounts.sort(accountOrder).map((a) => a.id)).toEqual([
      "comchain:bbbb",
      "comchain:aaaa",
    ])
  })

  it("orders by backend first", () => {
    const accounts = [
      account("cyclos", "A", "cyclos:1"),
      account("comchain", "Z", "comchain:aaaa"),
    ]

    expect(accounts.sort(accountOrder).map((a) => a.backend)).toEqual([
      "comchain",
      "cyclos",
    ])
  })
})


describe("dashboard wallet order", () => {
  function wallet(id: string, label: string, balanceCount: number) {
    const userAccount: any = {
      internalId: `comchain:${id}`,
      label,
      parent: { internalId: "comchain:Test" },
      jsonData: { wallet: {} },
      active: true,
      status: "active",
    }
    const balances = Array.from({ length: balanceCount }, (_, index) => ({
      internalId: `${userAccount.internalId}:${index}`,
      parent: userAccount,
      getBalance: vi.fn(async () => 0),
      getSymbol: vi.fn(async () => "T"),
    }))
    userAccount.getAccounts = vi.fn(async () => balances)
    return { userAccount, balances }
  }

  it.each([1, 2])(
    "keeps the main wallet first with %i balances, even when it loads last or is renamed",
    async (balanceCount) => {
      const oldest = wallet("zzzz", "main", balanceCount)
      const newest = wallet("aaaa", "Secondary Wallet", balanceCount)
      const api = new LokAPI("", "")
      ;(api as any).getUserAccounts = vi.fn(async () => [
        oldest.userAccount, newest.userAccount,
      ])
      api.getBankAccountName = vi.fn(async (account: any) =>
        () => account.label || account.parent.label
      )
      let finishLoadingOldest!: () => void
      oldest.userAccount.getAccounts.mockImplementationOnce(() => new Promise(resolve => {
        finishLoadingOldest = () => resolve(oldest.balances)
      }))

      const loading = api.buildVirtualAccountTree()
      await flushPromises()
      finishLoadingOldest()
      const { virtualAccountTree } = await loading
      const expected = [oldest.userAccount.internalId, newest.userAccount.internalId]
      expect(virtualAccountTree.map((account: any) => account.id)).toEqual(expected)

      oldest.userAccount.label = "Z renamed original wallet"
      newest.userAccount.label = "A newer wallet"
      const refreshed = await api.buildVirtualAccountTree()
      expect(refreshed.virtualAccountTree.map((account: any) => account.id)).toEqual(expected)
    }
  )

  it("keeps a failed wallet in its position without reordering the other wallets", async () => {
    const oldest = wallet("zzzz", "main", 1)
    const failed = wallet("mmmm", "Unavailable", 1)
    const newest = wallet("aaaa", "Secondary Wallet", 1)
    const failure = new Error("Cannot load wallet")
    failed.userAccount.getAccounts.mockRejectedValue(failure)
    const api = new LokAPI("", "")
    ;(api as any).getUserAccounts = vi.fn(async () => [
      oldest.userAccount, failed.userAccount, newest.userAccount,
    ])
    api.getBankAccountName = vi.fn(async (account: any) =>
      () => account.label || account.parent.label
    )

    const { virtualAccountTree, errors } = await api.buildVirtualAccountTree()
    expect(virtualAccountTree).toHaveLength(3)
    expect(virtualAccountTree[0].id).toBe(oldest.userAccount.internalId)
    expect(virtualAccountTree[1]).toEqual([failure])
    expect(virtualAccountTree[2].id).toBe(newest.userAccount.internalId)
    expect(errors).toEqual([failure])
  })

})

import { describe, expect, it, vi } from "vitest"
import { flushPromises } from "@vue/test-utils"
import { lokapiStoreFactory } from "../../../src/store/lokapi"

describe("wallet creation store action", () => {
  it("passes the name to the selected connector and refreshes the wallets", async () => {
    const wallet = { label: "Shop" }
    const backend = { createUserAccount: vi.fn(async () => wallet) }
    const api = { clearCaches: vi.fn() }
    const dispatch = vi.fn()
    const store = lokapiStoreFactory(api, {})
    const result = await store.actions.createUserAccount({
      state: { backends: { selected: backend } }, dispatch,
    }, ["password", "selected", "Shop"])
    expect(backend.createUserAccount).toHaveBeenCalledWith({ password: "password", label: "Shop" })
    expect(result).toBe(wallet)
    expect(api.clearCaches).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith("fetchAccounts", { flushBackendCaches: false })
  })
})


describe("wallet creation eligibility and refresh", () => {
  it("offers supported currencies whether they have no wallets, active wallets or pending wallets", () => {
    const store = lokapiStoreFactory({}, {})
    const backends = {
      empty: { userAccounts: {}, createUserAccount: vi.fn() },
      active: { userAccounts: { first: { active: true } }, createUserAccount: vi.fn() },
      pending: { userAccounts: { first: { active: false } }, createUserAccount: vi.fn() },
      unsupported: { userAccounts: { first: { active: true } } },
    }
    expect(store.getters.getCreatableBackends({ backends })()).toEqual(["empty", "active", "pending"])
  })

  it("finishes refreshing the registered wallets before resolving creation", async () => {
    let finishBackends!: () => void
    let finishAccounts!: () => void
    const backendsReady = new Promise<void>(resolve => { finishBackends = resolve })
    const accountsReady = new Promise<void>(resolve => { finishAccounts = resolve })
    const dispatch = vi.fn(action => action === "setBackends" ? backendsReady : accountsReady)
    const store = lokapiStoreFactory({ clearCaches: vi.fn() }, {})
    const backend = { createUserAccount: vi.fn(async () => ({ label: "secondary" })) }
    let finished = false
    const creation = store.actions.createUserAccount({
      state: { backends: { selected: backend } }, dispatch,
    }, ["password", "selected", "secondary"]).then(() => { finished = true })
    await flushPromises()
    expect(dispatch).toHaveBeenCalledWith("setBackends")
    expect(dispatch).not.toHaveBeenCalledWith("fetchAccounts", expect.anything())
    expect(finished).toBe(false)
    finishBackends()
    await flushPromises()
    expect(dispatch).toHaveBeenCalledWith("fetchAccounts", { flushBackendCaches: false })
    expect(finished).toBe(false)
    finishAccounts()
    await creation
    expect(finished).toBe(true)
  })
})

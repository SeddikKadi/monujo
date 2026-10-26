import { describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import AuthChallenge from "../../../src/components/AuthChallenge.vue"
import { AccountAuthService } from "../../../src/services/AuthService"

/** Mount the dialog and return the credentials request it registered. */
function mountChallenge() {
  let requestCredentials: any
  const wrapper = mount(AuthChallenge, {
    global: {
      stubs: { ChallengeStub: true },
      mocks: {
        $auth: {
          registerRequestCredentials: (fn: any) => (requestCredentials = fn),
        },
        $gettext: (message: string, params?: any) =>
          params ? message.replace("%{ name }", params.name) : message,
        $msg: { warning: vi.fn() },
      },
    },
  })
  const handler = { Ui: { Challenge: { name: "ChallengeStub" } } }
  return { wrapper, ask: (name?: any) => requestCredentials("firstTry", handler, name) }
}

describe("AuthChallenge", () => {
  it("names the wallet being unlocked", async () => {
    const { wrapper, ask } = mountChallenge()

    ask("comchain:1f337c")
    await flushPromises()

    expect(wrapper.get("#auth-account-name").text()).toBe(
      "Wallet: comchain:1f337c"
    )
  })

  it("names no wallet when none is given", async () => {
    const { wrapper, ask } = mountChallenge()

    ask(false)
    await flushPromises()

    expect(wrapper.find(".modal-card").exists()).toBe(true)
    expect(wrapper.find("#auth-account-name").exists()).toBe(false)
  })
})

describe("AccountAuthService.requestCredentials", () => {
  it("gives the wallet name to the credentials request", async () => {
    const _requestCredentials = vi.fn(async (..._args: any[]) => "secret")
    const Handler = vi.fn()
    const authService: any = {
      _requestCredentials,
      AuthRegistry: { Retention: { Handler, Ui: {} } },
    }
    const service = new AccountAuthService(
      authService,
      "comchain:1f337cc2e0d3c08f711a",
      [["Retention", {}], null],
      "comchain:1f337c"
    )

    await service.requestCredentials("firstTry")

    expect(_requestCredentials.mock.calls[0][2]).toBe("comchain:1f337c")
  })
})

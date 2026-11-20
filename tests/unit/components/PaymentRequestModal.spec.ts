import { describe, expect, it, vi } from "vitest"
import { mount } from "@vue/test-utils"
import PaymentRequestModal from "../../../src/components/PaymentRequestModal.vue"

vi.mock("vuex", () => ({
  mapGetters: () => ({
    numericFormat: () => (value: number) => value.toString(),
  }),
}))

vi.mock("@/utils/account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/account")>()),
  getUserAccount: () => ({ parent: {} }),
}))

vi.mock("@/services/lokapiService", () => ({
  makeUIProxyBackend: () => ({}),
}))

/** A wallet of the user, who has ``walletCount`` wallets in its currency. */
function ownWallet(walletCount: number) {
  const userAccounts: any = {}
  for (let i = 0; i < walletCount; i++) userAccounts[`wallet${i}`] = {}
  return { _obj: { getTransactions: vi.fn(), parent: { userAccounts } } }
}

function mountModal(step = 2, requestData: any = {}, account: any = {}) {
  const paymentRequest = {
    amount: "10",
    creatorName: "Alice",
    date: "2026-01-01T00:00:00Z",
    isCreator: false,
    isSender: true,
    jsonData: {
      receiver_name: "Bob",
      sender_name: "Alice",
    },
    message: "",
    refuse: vi.fn(),
    state: "open",
    ...requestData,
  }
  const modal = {
    args: {
      value: [{ account: { curr: "EUR", ...account }, paymentRequest }],
    },
    back: vi.fn(),
    close: vi.fn(),
    next: vi.fn(),
    step: { value: step },
  }

  return {
    modal,
    paymentRequest,
    wrapper: mount(PaymentRequestModal, {
      global: {
        stubs: {
          "fa-icon": true,
        },
        mocks: {
          $gettext: (message: string, params: any = {}) =>
            message.replace(/%\{\s*(\w+)\s*\}/g, (_, key) => params[key]),
          $modal: modal,
          $msg: { success: vi.fn() },
        },
      },
    }),
  }
}

describe("PaymentRequestModal.vue", () => {
  it("names the wallet of each side whose owner has several", () => {
    // The user pays from one of their two wallets, unnamed, to the "Shop"
    // wallet of Bob, who has several too
    const { wrapper } = mountModal(
      1,
      {
        senderWalletLabel: null,
        receiverWalletLabel: "Shop",
        receiverWalletHasSiblings: true,
      },
      ownWallet(2)
    )

    expect(wrapper.findAll(".party-wallet").map((p) => p.text())).toEqual([
      "Wallet main",
      "Wallet Shop",
    ])
  })

  it("shows the owners alone when each has a single wallet", () => {
    // Even named, the only wallet of its owner needs no line
    const { wrapper } = mountModal(
      1,
      { receiverWalletLabel: "Shop", receiverWalletHasSiblings: false },
      ownWallet(1)
    )

    expect(wrapper.findAll(".party-wallet")).toHaveLength(0)
  })

  it("requires a refusal explanation with at least ten trimmed characters", async () => {
    const { wrapper } = mountModal()

    await wrapper.setData({ actionType: "refuse", explanation: " too short " })
    expect((wrapper.vm as any).explanationError).toBe(
      "Please enter an explanation of at least 10 characters"
    )

    await wrapper.setData({ explanation: " valid explanation " })
    expect((wrapper.vm as any).explanationError).toBe("")
  })

  it("trims the explanation before refusing a payment request", async () => {
    const { modal, paymentRequest, wrapper } = mountModal()
    await wrapper.setData({
      actionType: "refuse",
      explanation: "  a valid explanation  ",
    })

    await (wrapper.vm as any).confirmAction()

    expect(paymentRequest.refuse).toHaveBeenCalledWith("a valid explanation")
    expect(modal.close).toHaveBeenCalledOnce()
  })
})

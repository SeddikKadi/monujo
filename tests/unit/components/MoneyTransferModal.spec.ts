import { describe, expect, it, vi } from "vitest"
import { flushPromises, mount } from "@vue/test-utils"
import { defineComponent, reactive } from "vue"
import MoneyTransferModal from "../../../src/components/MoneyTransferModal.vue"

vi.mock("@/services/lokapiService", () => ({
  makeUIProxyBackend: () => ({}),
}))

const MoneyTransactionStub = defineComponent({
  name: "MoneyTransaction",
  props: ["account"],
  emits: [
    "update:amount",
    "update:senderMemo",
    "update:recipientMemo",
    "update:isValid",
    "change",
  ],
  template: "<div class='money-transaction-stub' />",
})

const RecurrenceOptionsStub = defineComponent({
  name: "RecurrenceOptions",
  template: "<div class='recurrence-options-stub' />",
})

function makeRecipient(sourceWalletId = "selected-wallet") {
  return {
    backendId: "comchain:test",
    fromUserAccount: { internalId: `comchain:${sourceWalletId}` },
    is_favorite: true,
    getSymbol: vi.fn(async () => "LKC"),
    prepareTransfer: vi.fn<unknown[], Promise<unknown[]>>(async () => []),
    preparePledge: vi.fn<unknown[], Promise<unknown[]>>(async () => []),
  }
}

function makeAccount(walletId = "selected-wallet", isSubAccount = false) {
  const userAccount = {
    internalId: `comchain:${walletId}`,
    parent: { internalId: "comchain:test" },
    getTransactions: vi.fn(),
  }
  return {
    id: isSubAccount ? `${userAccount.internalId}/Nant` : userAccount.internalId,
    userAccountId: userAccount.internalId,
    currencyId: userAccount.parent.internalId,
    curr: "LKC",
    isPaymentRequestAllowed: true,
    _obj: isSubAccount ? { parent: userAccount } : userAccount,
    safeWalletRecipient: makeRecipient(walletId),
  }
}

type ModalVm = {
  isValid: boolean
  transactionType: string | null
  handleClickRecipient: (config: unknown) => Promise<void>
  openCreateRecurrenceModal: () => Promise<void>
}

async function mountModal(
  transactionType?: string,
  options: {
    ownAccount?: ReturnType<typeof makeAccount>
    activeAccounts?: ReturnType<typeof makeAccount>[]
    recipient?: ReturnType<typeof makeRecipient>
    senderWalletId?: string
  } = {}
) {
  const recipient = options.recipient || makeRecipient()
  const ownAccount = options.ownAccount || makeAccount()
  const paymentRequest = {
    senderWalletUri: options.senderWalletId || ownAccount.userAccountId,
    markAsPaid: vi.fn(async () => undefined),
  }
  const modal = reactive({
    args: {
      value: [
        {
          account: ownAccount,
          recipient,
          transactionType,
          paymentRequest,
          config: {
            amount: "10",
            senderMemo: "Invoice",
            recipientMemo: "Invoice",
          },
        },
      ],
    },
    back: vi.fn(),
    close: vi.fn(),
    open: vi.fn(),
    next: vi.fn(() => {
      modal.step.value = 2
    }),
    step: { value: 1 },
  })
  const msg = { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
  const dialog = { show: vi.fn(async (_options: unknown) => "add") }
  const wrapper = mount(MoneyTransferModal, {
    global: {
      stubs: {
        MoneyTransaction: MoneyTransactionStub,
        RecurrenceOptions: RecurrenceOptionsStub,
        TransactionItem: true,
        RecipientSelector: true,
      },
      mocks: {
        $gettext: (message: string, params: Record<string, string> = {}) =>
          message.replace(/%{\s*(\w+)\s*}/g, (_, key) => params[key]),
        $dialog: dialog,
        $modal: modal,
        $msg: msg,
        $store: {
          getters: {
            activeVirtualAccounts: options.activeAccounts || [ownAccount],
          },
          dispatch: vi.fn(),
        },
      },
    },
  })
  if (!transactionType) {
    await (wrapper.vm as unknown as ModalVm).handleClickRecipient({ recipient })
  }
  await flushPromises()
  return { wrapper, recipient, msg, modal, dialog, ownAccount, paymentRequest }
}

describe("MoneyTransferModal", () => {
  describe("single-wallet compatibility", () => {
    it.each(["payment", "reconversion", "paymentRequest", "adminCredit"])(
      "prepares and confirms %s with one wallet",
      async (transactionType) => {
        const { wrapper, recipient, msg, modal, ownAccount, paymentRequest } =
          await mountModal(
            transactionType === "payment" ? undefined : transactionType
          )
        const target = transactionType === "reconversion"
          ? ownAccount.safeWalletRecipient
          : recipient
        const payment = { id: "comchain://test/tx/single-wallet-payment" }
        const execute = vi.fn(async () => payment)
        target.prepareTransfer.mockResolvedValue([{ execute }])
        target.preparePledge.mockResolvedValue([{ execute }])

        const form = wrapper.findComponent(MoneyTransactionStub)
        expect(form.props("account")).toEqual(ownAccount)
        form.vm.$emit("update:amount", "10")
        await flushPromises()

        const sendButton = wrapper.get("#send-money-button")
        expect(sendButton.attributes("disabled")).toBeUndefined()
        await sendButton.trigger("click")
        await flushPromises()

        expect(execute).toHaveBeenCalledOnce()
        expect(modal.open).toHaveBeenCalledWith("ConfirmPaymentModal", {
          transaction: [payment],
          type: transactionType === "reconversion"
            ? "reconversion"
            : "paymentConfirmation",
          // The confirmation names the wallet that paid, among several
          account: ownAccount,
        })
        expect(msg.error).not.toHaveBeenCalled()
        expect(msg.warning).not.toHaveBeenCalled()
        if (transactionType === "paymentRequest") {
          expect(paymentRequest.markAsPaid).toHaveBeenCalledWith(payment.id)
        } else {
          expect(paymentRequest.markAsPaid).not.toHaveBeenCalled()
        }
        if (transactionType === "adminCredit") {
          expect(target.preparePledge).toHaveBeenCalledOnce()
          expect(target.prepareTransfer).not.toHaveBeenCalled()
        } else {
          expect(target.prepareTransfer).toHaveBeenCalledOnce()
          expect(target.preparePledge).not.toHaveBeenCalled()
        }
      }
    )
  })

  describe("favorite offered after a payment", () => {
    async function pay(recipient: Record<string, unknown>) {
      const execute = vi.fn(async () => ({ id: "comchain://test/tx/paid" }))
      const mounted = await mountModal(undefined, {
        recipient: {
          ...makeRecipient(),
          name: "Alice",
          toggleFavorite: vi.fn(async () => undefined),
          prepareTransfer: vi.fn(async () => [{ execute }]),
          ...recipient,
        } as unknown as ReturnType<typeof makeRecipient>,
      })
      mounted.wrapper
        .findComponent(MoneyTransactionStub)
        .vm.$emit("update:amount", "10")
      await flushPromises()
      await mounted.wrapper.get("#send-money-button").trigger("click")
      await flushPromises()
      return mounted
    }

    it("offers the wallet just paid, named with its owner", async () => {
      const { dialog, recipient, msg } = await pay({
        is_favorite: false,
        walletLabel: "Shop",
      })

      expect(dialog.show).toHaveBeenCalledOnce()
      expect(dialog.show.mock.calls[0][0]).toMatchObject({
        content: "Do you want to add Alice (Shop) to your favorite list ?",
      })
      expect(
        (recipient as unknown as { toggleFavorite: unknown }).toggleFavorite
      ).toHaveBeenCalledOnce()
      expect(msg.success).toHaveBeenCalledWith(
        "Alice (Shop) was added to your favorite list"
      )
    })

    it("keeps the owner's name alone for a wallet without a name to show", async () => {
      const { dialog } = await pay({ is_favorite: false })

      expect(dialog.show.mock.calls[0][0]).toMatchObject({
        content: "Do you want to add Alice to your favorite list ?",
      })
    })

    it("offers nothing for a wallet already favorite", async () => {
      const { dialog, recipient } = await pay({ is_favorite: true })

      expect(dialog.show).not.toHaveBeenCalled()
      expect(
        (recipient as unknown as { toggleFavorite: unknown }).toggleFavorite
      ).not.toHaveBeenCalled()
    })
  })

  describe("source wallet selection", () => {
    it.each(["payment", "reconversion", "paymentRequest"])(
      "keeps the selected wallet for %s when another wallet uses the same currency",
      async (transactionType) => {
        const firstAccount = makeAccount("first-wallet")
        const selectedAccount = makeAccount("selected-wallet")
        const { wrapper, modal, msg } = await mountModal(
          transactionType === "payment" ? undefined : transactionType,
          {
            ownAccount: selectedAccount,
            activeAccounts: [firstAccount, selectedAccount],
          }
        )

        expect(modal.next).toHaveBeenCalledOnce()
        expect(
          wrapper.findComponent(MoneyTransactionStub).props("account")
        ).toEqual(selectedAccount)
        expect(msg.error).not.toHaveBeenCalled()
      }
    )

    it("keeps the same source when choosing another recipient", async () => {
      const selectedAccount = makeAccount("selected-wallet")
      const { wrapper, modal } = await mountModal(undefined, {
        ownAccount: selectedAccount,
        activeAccounts: [makeAccount("first-wallet"), selectedAccount],
      })

      modal.step.value = 1
      await (wrapper.vm as unknown as ModalVm).handleClickRecipient({
        recipient: makeRecipient(),
      })
      await flushPromises()

      expect(
        wrapper.findComponent(MoneyTransactionStub).props("account")
      ).toEqual(selectedAccount)
    })

    it("passes the selected wallet to recurrence creation", async () => {
      const selectedAccount = makeAccount("selected-wallet")
      const { wrapper, modal, recipient } = await mountModal(undefined, {
        ownAccount: selectedAccount,
        activeAccounts: [makeAccount("first-wallet"), selectedAccount],
      })

      await (wrapper.vm as unknown as ModalVm).openCreateRecurrenceModal()

      expect(modal.open).toHaveBeenCalledWith(
        "RecurrentContractModal",
        expect.objectContaining({
          account: selectedAccount,
          selectedRecipient: recipient,
        })
      )
    })

    it.each([true, false])(
      "uses the selected wallet's recurrence permission (%s)",
      async (allowed) => {
        const firstAccount = makeAccount("first-wallet")
        const selectedAccount = makeAccount("selected-wallet")
        firstAccount.isPaymentRequestAllowed = !allowed
        selectedAccount.isPaymentRequestAllowed = allowed
        const { wrapper } = await mountModal(undefined, {
          ownAccount: selectedAccount,
          activeAccounts: [firstAccount, selectedAccount],
        })

        expect(wrapper.findComponent(RecurrenceOptionsStub).exists()).toBe(allowed)
      }
    )

    it("rejects a recipient in another currency without switching source accounts", async () => {
      const recipient = makeRecipient()
      recipient.backendId = "comchain:other-currency"
      const otherAccount = makeAccount("other-wallet")
      otherAccount.currencyId = recipient.backendId
      const { wrapper, modal, msg } = await mountModal(undefined, {
        recipient,
        activeAccounts: [otherAccount],
      })

      expect(modal.next).not.toHaveBeenCalled()
      expect(wrapper.findComponent(MoneyTransactionStub).exists()).toBe(false)
      expect(msg.error).toHaveBeenCalledWith(
        "The selected account and recipient must use the same currency."
      )
      expect(recipient.prepareTransfer).not.toHaveBeenCalled()
    })

    it("rejects a payment request addressed to another source wallet", async () => {
      const { wrapper, modal, msg, recipient } = await mountModal(
        "paymentRequest",
        { senderWalletId: "comchain:another-wallet" }
      )

      expect(modal.next).not.toHaveBeenCalled()
      expect(wrapper.findComponent(MoneyTransactionStub).exists()).toBe(false)
      expect(msg.error).toHaveBeenCalledWith(
        "This payment request must be paid from its designated sender account."
      )
      expect(recipient.prepareTransfer).not.toHaveBeenCalled()
    })

    it.each(["payment", "reconversion", "paymentRequest"])(
      "rejects for %s a recipient bound to another source wallet",
      async (transactionType) => {
        const recipient = makeRecipient("first-wallet")
        const selectedAccount = makeAccount("selected-wallet")
        selectedAccount.safeWalletRecipient = recipient
        const { wrapper, modal, msg } = await mountModal(
          transactionType === "payment" ? undefined : transactionType,
          {
            recipient,
            ownAccount: selectedAccount,
            activeAccounts: [makeAccount("first-wallet"), selectedAccount],
          }
        )

        expect(modal.next).not.toHaveBeenCalled()
        expect(wrapper.findComponent(MoneyTransactionStub).exists()).toBe(false)
        expect(msg.error).toHaveBeenCalledWith(
          "This recipient can not be paid from the selected account."
        )
        expect(recipient.prepareTransfer).not.toHaveBeenCalled()
      }
    )

    it("lets an admin credit be signed by the issuing admin wallet", async () => {
      const recipient = makeRecipient("admin-wallet")
      const { wrapper, modal, msg } = await mountModal("adminCredit", {
        recipient,
      })

      expect(modal.next).toHaveBeenCalledOnce()
      expect(wrapper.findComponent(MoneyTransactionStub).exists()).toBe(true)
      expect(msg.error).not.toHaveBeenCalled()
    })

    it("explains a credit refused because the admin wallet may not credit", async () => {
      const recipient = makeRecipient("admin-wallet")
      recipient.preparePledge.mockRejectedValue(
        Object.assign(new Error("refused"), { name: "PermissionDenied" })
      )
      const { wrapper, msg } = await mountModal("adminCredit", { recipient })

      wrapper.findComponent(MoneyTransactionStub).vm.$emit("update:amount", "10")
      await flushPromises()

      expect((wrapper.vm as any).errors).toBe(
        "The selected administrator wallet is not allowed to credit money."
      )
      expect(msg.error).not.toHaveBeenCalled()
      expect(
        wrapper.get("#send-money-button").attributes("disabled")
      ).toBeDefined()
    })

    it("keeps the send button disabled when a credit cannot be prepared", async () => {
      const recipient = makeRecipient("admin-wallet")
      recipient.preparePledge.mockRejectedValue(new Error("network"))
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
      const { wrapper, msg } = await mountModal("adminCredit", { recipient })

      wrapper.findComponent(MoneyTransactionStub).vm.$emit("update:amount", "10")
      await flushPromises()

      expect(msg.error).toHaveBeenCalledOnce()
      expect(
        wrapper.get("#send-money-button").attributes("disabled")
      ).toBeDefined()
      error.mockRestore()
    })

    it("matches a payment request's sender to the wallet owning a selected subaccount", async () => {
      const selectedAccount = makeAccount("selected-wallet", true)
      const { wrapper, modal, msg } = await mountModal("paymentRequest", {
        ownAccount: selectedAccount,
        activeAccounts: [makeAccount("first-wallet"), selectedAccount],
        senderWalletId: selectedAccount.userAccountId,
      })

      expect(modal.next).toHaveBeenCalledOnce()
      expect(
        wrapper.findComponent(MoneyTransactionStub).props("account")
      ).toEqual(selectedAccount)
      expect(msg.error).not.toHaveBeenCalled()
    })
  })

  describe("description typed before the amount", () => {
    it("does not check the transfer nor report an error", async () => {
      const { wrapper, recipient, msg } = await mountModal()
      const tx = wrapper.findComponent(MoneyTransactionStub)
      const rejections: unknown[] = []
      const onRejection = (reason: unknown) => rejections.push(reason)
      process.on("unhandledRejection", onRejection)
      try {
        tx.vm.$emit("update:senderMemo", "A description before any amount")
        tx.vm.$emit("update:recipientMemo", "A reference before any amount")
        await flushPromises()
        await new Promise((resolve) => setTimeout(resolve, 0))
      } finally {
        process.off("unhandledRejection", onRejection)
      }

      expect(rejections).toEqual([])
      expect(recipient.prepareTransfer).not.toHaveBeenCalled()
      expect(msg.error).not.toHaveBeenCalled()
      expect((wrapper.vm as unknown as ModalVm).isValid).toBe(false)
    })

    it("still re-checks the transfer when the description changes after a valid amount", async () => {
      const { wrapper, recipient, msg } = await mountModal()
      const tx = wrapper.findComponent(MoneyTransactionStub)

      tx.vm.$emit("update:amount", "10")
      await flushPromises()
      tx.vm.$emit("update:senderMemo", "Rent")
      await flushPromises()

      expect(recipient.prepareTransfer).toHaveBeenCalledTimes(2)
      expect(recipient.prepareTransfer.mock.lastCall?.slice(0, 2)).toEqual([
        "10",
        "Rent",
      ])
      expect(msg.error).not.toHaveBeenCalled()
    })
  })

  describe("recurring payment option", () => {
    it("is offered for a regular payment when the account allows it", async () => {
      const { wrapper } = await mountModal()
      expect(wrapper.findComponent(RecurrenceOptionsStub).exists()).toBe(true)
    })

    it("is not offered when an administrator credits an account", async () => {
      const { wrapper } = await mountModal("adminCredit")
      expect((wrapper.vm as unknown as ModalVm).transactionType).toBe(
        "adminCredit"
      )
      expect(wrapper.findComponent(RecurrenceOptionsStub).exists()).toBe(false)
    })
  })
})

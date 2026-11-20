import { getRecipientWalletName } from "./account"

const normalizeIdent = (ident: any) =>
  `${ident}`.toLowerCase().replace(/^0x/, "")

/**
 * Whether ``transaction`` is with the wallet of ``recipient``: compared by
 * wallet address when both are known, otherwise by name.
 */
export function isTransactionWithRecipient(
  transaction: any,
  recipient: any
): boolean {
  if (transaction.relatedIdent && recipient.ident) {
    return (
      normalizeIdent(transaction.relatedIdent) ===
      normalizeIdent(recipient.ident)
    )
  }
  return transaction.related === recipient.name
}

/**
 * Return the names to show for ``recipients``, one per wallet: the name of
 * the person with the name of the wallet when it has one to show, as in
 * "Bob (Shop)". The beginning of the wallet address is added to the names
 * that are still shared by several of them.
 */
export function getRecipientNames(recipients: any[], $gettext: any): string[] {
  const walletNames = recipients.map((recipient) =>
    getRecipientWalletName(recipient, $gettext)
  )
  const names = recipients.map((recipient, idx) =>
    walletNames[idx]
      ? `${recipient.name} (${walletNames[idx]})`
      : recipient.name
  )
  const counts = new Map<string, number>()
  for (const name of names) counts.set(name, (counts.get(name) || 0) + 1)
  return recipients.map((recipient, idx) => {
    if ((counts.get(names[idx]) || 0) < 2 || !recipient.ident) {
      return names[idx]
    }
    const address = `${normalizeIdent(recipient.ident).slice(0, 6)}…`
    return walletNames[idx]
      ? `${recipient.name} (${walletNames[idx]}, ${address})`
      : `${recipient.name} (${address})`
  })
}

/** Whether the wallet reference ``walletRef`` designates ``recipient``. */
function isWalletOfRecipient(walletRef: any, recipient: any): boolean {
  if (!walletRef) return false
  if (typeof recipient.isWalletDesignatedBy === "function") {
    return recipient.isWalletDesignatedBy(walletRef)
  }
  return walletRef === recipient.userAccountInternalId
}

/**
 * Whether the wallet of ``recipient`` takes part in ``request``, a payment
 * request or a recurring payment. Wallets are compared, not names: two
 * wallets of a person, or two persons with the same name, are different
 * recipients.
 */
export function isRequestWithRecipient(request: any, recipient: any): boolean {
  return [
    request.senderWalletUri,
    request.receiverWalletUri,
    request.creatorWalletUri,
  ].some((walletRef) => isWalletOfRecipient(walletRef, recipient))
}

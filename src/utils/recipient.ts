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
 * Return the names to show for ``recipients``: their name, followed by the
 * beginning of their wallet address when several of them share it.
 */
export function getRecipientNames(recipients: any[]): string[] {
  const counts = new Map<string, number>()
  for (const recipient of recipients) {
    counts.set(recipient.name, (counts.get(recipient.name) || 0) + 1)
  }
  return recipients.map((recipient) =>
    (counts.get(recipient.name) || 0) > 1 && recipient.ident
      ? `${recipient.name} (${normalizeIdent(recipient.ident).slice(0, 6)}…)`
      : recipient.name
  )
}

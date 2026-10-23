type UIAccount = {
  _obj?: {
    getTransactions?: (...args: any[]) => AsyncGenerator<any>
    parent?: any
  }
}

export function getUserAccount(account: UIAccount): any {
  const accountObject = account?._obj

  if (accountObject?.getTransactions) return accountObject
  if (accountObject?.parent?.getTransactions) return accountObject.parent

  throw new TypeError("Unable to resolve user account")
}

/**
 * Return the recipient search of ``userAccount``: the recipients this
 * account pays or, with a LokAPI not providing that search yet, the
 * recipients of its currency.
 *
 * An administrator looking at somebody else's wallet cannot search from
 * that wallet: give the administrator's own wallet as ``caller`` and the
 * search is made from it.
 */
export function getRecipientSearch(userAccount: any, caller?: any) {
  const source = caller || userAccount
  if (source.searchRecipients) {
    return source.searchRecipients.bind(source)
  }
  return source.parent.searchRecipients.bind(source.parent)
}

/**
 * Return the safe wallet recipient, used for reconversions, paid from
 * ``userAccount`` or, with a LokAPI not providing it per account yet, the
 * one of its currency.
 */
export function getSafeWalletRecipient(userAccount: any) {
  return "safeWalletRecipient" in userAccount
    ? userAccount.safeWalletRecipient
    : userAccount.parent.safeWalletRecipient
}

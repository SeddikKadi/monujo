import { walletLabel } from "@lokavaluto/lokapi"

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

/**
 * Return the name identifying a wallet in the authentication settings and
 * prompts, or ``false`` when the user has a single wallet requiring
 * authentication.
 */
export function getWalletAuthName(userAccount: any, userAccounts: any[]) {
  return (
    userAccounts.length !== 1 &&
    (userAccount.label || userAccount.internalId.substring(0, 15))
  )
}

/** Return the owner-facing name of a wallet. */
export function getWalletName(userAccount: any, $gettext: any) {
  return () =>
    userAccount?.label
      ? translateWalletLabel(userAccount.label, $gettext)
      : $gettext("Main")
}

/**
 * Return the name of a recipient's wallet as shown to the person paying.
 *
 * A wallet created before names existed has none: it gets the default
 * name its owner sees, but only when other wallets of that person are
 * listed with it, where it has to be told apart from them.
 */
export function getRecipientWalletName(recipient: any, $gettext: any): string {
  if (recipient?.walletLabel) {
    return translateWalletLabel(recipient.walletLabel, $gettext)
  }
  return recipient?.hasSiblingWallets ? $gettext("Main") : ""
}

/** Return the backend, that is the currency, holding ``userAccount``. */
export function getAccountBackend(
  backends: { [id: string]: any },
  userAccount: any
): any {
  return Object.values(backends || {}).find((backend: any) =>
    Object.values(backend?.userAccounts || {}).includes(userAccount)
  )
}

/**
 * Displayed names of the user's wallets in the currency of ``backend``,
 * except ``exceptAccount``. A name only has to be unique in its currency.
 */
export function getOtherWalletNames(
  backend: any,
  $gettext: any,
  exceptAccount?: any
): string[] {
  return Object.values(backend?.userAccounts || {})
    .filter((account: any) => account !== exceptAccount)
    .map((account: any) => getWalletName(account, $gettext)())
}

/** Explain why a wallet name was refused (see LokAPI's ``walletLabel``). */
export function walletNameErrorMessage(
  reason: walletLabel.WalletLabelError,
  $gettext: (message: string) => string
): string {
  switch (reason) {
    case "required":
      return $gettext("Please enter a wallet name.")
    case "too-long":
      return $gettext("The wallet name must not exceed 30 characters.")
    case "invalid-characters":
      return $gettext(
        "Use only letters, digits, spaces, hyphens and apostrophes. " +
          "The name must start and end with a letter or a digit."
      )
    case "not-unique":
      return $gettext(
        "You already have a wallet with this name in this currency."
      )
  }
}

/**
 * Return why a wallet name is refused, or null. Besides the format rules,
 * the name must differ from the displayed name of the user's other wallets
 * in the same currency (``otherNames``), ignoring case. Odoo checks again
 * when the name is saved.
 */
export function validateWalletName(
  name: string,
  otherNames: string[],
  $gettext: (message: string) => string
): string | null {
  const reason = walletLabel.checkWalletLabelFormat(name)
  if (reason) return walletNameErrorMessage(reason, $gettext)
  const displayed = translateWalletLabel(
    walletLabel.normalizeWalletLabel(name),
    $gettext
  ).toLowerCase()
  if (otherNames.some((other) => other.toLowerCase() === displayed)) {
    return walletNameErrorMessage("not-unique", $gettext)
  }
  return null
}

/**
 * Translate the reserved name of the first wallet, including labels already
 * saved in French or English. User-defined labels are displayed verbatim.
 */
export function translateWalletLabel(
  label: string,
  $gettext: (message: string) => string
): string {
  switch (label) {
    case "main":
    case "Main":
    case "compte principal":
    case "Compte principal":
      return $gettext("main")
  }
  return label
}

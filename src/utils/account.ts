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

/**
 * Tell whether the administrator wallet ``adminAccount`` may credit
 * money to accounts. A wallet can be listed in the administration
 * (for instance to search every recipient) without that right.
 */
export async function canIssueCredit(adminAccount: any): Promise<boolean> {
  try {
    return !!(await adminAccount?.hasCreditRequestValidationRights?.())
  } catch (err) {
    console.error("Failed to check the right to credit money", err)
    return false
  }
}

/**
 * Return the name of a wallet created before names existed, as shown in
 * lists and screens about transactions: the reserved name of a first
 * wallet ("compte principal" in French). The dashboard keeps its own
 * shorter name for it (see ``getWalletName``).
 */
export function getUnnamedWalletName($gettext: any): string {
  return $gettext("main")
}

/** Return the name of a wallet on the dashboard of its owner. */
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
  return recipient?.hasSiblingWallets ? getUnnamedWalletName($gettext) : ""
}

/**
 * Return the name of a recipient with the name of its wallet, when it
 * has one to show: a favorite is one wallet of a person, not the person.
 */
export function getRecipientFullName(recipient: any, $gettext: any): string {
  const walletName = getRecipientWalletName(recipient, $gettext)
  return walletName ? `${recipient.name} (${walletName})` : recipient.name
}

/**
 * Return the owner-facing name of the wallet of ``account``, a wallet or
 * one of its balances as listed on the dashboard. Empty when ``account``
 * is not such an account.
 */
export function getAccountWalletName(account: any, $gettext: any): string {
  let userAccount
  try {
    userAccount = getUserAccount(account)
  } catch (err) {
    return ""
  }
  return userAccount?.label
    ? translateWalletLabel(userAccount.label, $gettext)
    : getUnnamedWalletName($gettext)
}

/**
 * Return the name of ``account`` for a screen showing it alone. A wallet
 * with several balances names them "Converted" and "Mutual": away from the
 * list of its wallet, such a balance is named with its wallet, as in
 * "Shop – Converted".
 */
export function getAccountFullName(account: any, $gettext: any): string {
  const name = typeof account?.name === "function" ? account.name() : ""
  const walletName = getAccountWalletName(account, $gettext)
  if (!walletName) return name
  // The entry of the wallet itself carries its dashboard name
  const dashboardName = getWalletName(getUserAccount(account), $gettext)()
  if (name === walletName || name === dashboardName) return walletName
  return name ? `${walletName} – ${name}` : walletName
}

/**
 * Return ``text`` followed by the name of the wallet of ``account``, for
 * the title of a list or of a screen about one wallet.
 */
export function withWalletName(
  text: string,
  account: any,
  $gettext: any
): string {
  const walletName = getAccountWalletName(account, $gettext)
  return walletName ? `${text} – ${walletName}` : text
}

/**
 * Return the name of the owner of the wallet ``account`` with the name of
 * that wallet, as in "Alice (Shop)".
 */
export function getOwnerFullName(
  ownerName: string,
  account: any,
  $gettext: any
): string {
  const walletName = getAccountWalletName(account, $gettext)
  return walletName ? `${ownerName} (${walletName})` : ownerName
}

/**
 * Return the line naming a wallet under the name of its owner in a
 * summary, as in "Wallet Shop". Empty without wallet name.
 *
 * The line is for an owner who has several wallets: the owner of a
 * single wallet is shown alone (see the functions below).
 */
export function getWalletLine(walletName: string, $gettext: any): string {
  return walletName ? $gettext("Wallet %{ name }", { name: walletName }) : ""
}

/**
 * Return the line naming somebody else's wallet from what the server
 * tells about it: its public name ``label`` and whether its owner has
 * several wallets. Empty for the only wallet of its owner; an unnamed
 * wallet among several gets the name of a first wallet.
 */
function getPublicWalletLine(
  label: string | null | undefined,
  hasSiblings: boolean | undefined,
  $gettext: any
): string {
  if (!hasSiblings) return ""
  return getWalletLine(
    label
      ? translateWalletLabel(label, $gettext)
      : getUnnamedWalletName($gettext),
    $gettext
  )
}

/**
 * Tell whether the user has several wallets in the currency of
 * ``account``, a wallet or one of its balances as listed on the dashboard.
 */
export function hasSeveralWallets(account: any): boolean {
  let userAccount
  try {
    userAccount = getUserAccount(account)
  } catch (err) {
    return false
  }
  return Object.keys(userAccount?.parent?.userAccounts || {}).length > 1
}

/**
 * Return the line naming the user's own wallet ``account``, or "" when
 * the user has no other wallet in its currency.
 */
export function getOwnWalletLine(account: any, $gettext: any): string {
  return hasSeveralWallets(account)
    ? getWalletLine(getAccountWalletName(account, $gettext), $gettext)
    : ""
}

/**
 * Return the line naming the wallet of ``recipient``, or "" when no other
 * wallet of that person is listed with it.
 */
export function getRecipientWalletLine(recipient: any, $gettext: any): string {
  return recipient?.hasSiblingWallets
    ? getWalletLine(getRecipientWalletName(recipient, $gettext), $gettext)
    : ""
}

/**
 * Return the line naming the wallet on one side of ``request``, a payment
 * request or a recurring payment listed for the user's wallet ``account``,
 * or "" when the owner of that side has a single wallet. The server tells
 * it for the other party, with the public name of the wallet.
 */
export function getRequestWalletLine(
  request: any,
  side: "sender" | "receiver",
  account: any,
  $gettext: any
): string {
  const isOwn = side === "sender" ? request?.isSender : request?.isReceiver
  if (isOwn) return getOwnWalletLine(account, $gettext)
  return getPublicWalletLine(
    request?.[`${side}WalletLabel`],
    request?.[`${side}WalletHasSiblings`],
    $gettext
  )
}

/**
 * Return the line naming the wallet of the other party of ``transaction``,
 * or "" when that party has a single wallet.
 */
export function getRelatedWalletLine(transaction: any, $gettext: any): string {
  return getPublicWalletLine(
    transaction?.relatedWalletLabel,
    transaction?.relatedWalletHasSiblings,
    $gettext
  )
}

/**
 * Return the name of the other party of ``transaction``, a transaction, a
 * payment request or a recurring payment, with the name of its wallet
 * when it has one, as in "Bob (Shop)".
 */
export function getRelatedFullName(transaction: any, $gettext: any): string {
  const label = transaction?.relatedWalletLabel
  return label
    ? `${transaction.related} (${translateWalletLabel(label, $gettext)})`
    : transaction?.related
}

/**
 * Return ``name`` made safe for a file name: the characters refused by
 * file systems are replaced.
 */
export function toFileNamePart(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "-").trim()
}

/**
 * Return the default name of a new wallet: only the first wallet has one,
 * every later wallet must be named by its owner.
 */
export function getDefaultWalletName(
  existingWalletCount: number,
  $gettext: (message: string) => string
): string {
  return existingWalletCount === 0 ? $gettext("main") : ""
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
 * A wallet without name counts with both names it is displayed with.
 */
export function getOtherWalletNames(
  backend: any,
  $gettext: any,
  exceptAccount?: any
): string[] {
  return Object.values(backend?.userAccounts || {})
    .filter((account: any) => account !== exceptAccount)
    .flatMap((account: any) =>
      account?.label
        ? [getWalletName(account, $gettext)()]
        : [getWalletName(account, $gettext)(), getUnnamedWalletName($gettext)]
    )
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

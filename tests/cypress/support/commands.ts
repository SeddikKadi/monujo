export {}

Cypress.Commands.add("login", (username: string, password: string) => {
  cy.loginForm().within(() => {
    cy.get("input").first().type(username)
    cy.get('input[type="password"]').type(password)
    cy.get("button[type='submit']").click()
  })
})

Cypress.Commands.add("loginForm", () => {
  return cy.get("section#login form")
})

Cypress.Commands.add("account", () => {
  cy.get(".accounts").should("be.visible")
  cy.get(".accounts > .active > .button").should("be.visible")
})

Cypress.Commands.add("accountsPane", () => {
  return cy.get(".accounts")
})

Cypress.Commands.add("account", () => {
  return cy.get(".account")
})

Cypress.Commands.add("transactionsPane", () => {
  return cy.get(".mt-5 > .columns > :nth-child(2)")
})

Cypress.Commands.add("transactions", () => {
  return cy.get(".transactions")
})

Cypress.Commands.add("payButton", () => {
  return cy.get(".is-payer")
})

Cypress.Commands.add("requestButton", () => {
  return cy.get(".is-recevoir")
})

Cypress.Commands.add("topUpButton", () => {
  return cy.get(".is-recharger")
})

Cypress.Commands.add("menu", () => {
  return cy.get("#app > nav.navbar")
})

Cypress.Commands.add("isLogged", () => {
  cy.get(".action-footer:visible")
})

Cypress.Commands.add("loginErrorMessage", () => {
  return cy.get(".has-text-danger")
})

Cypress.Commands.add("logout", () => {
  cy.isLogged() // Wait for element
  cy.get(".navbar-link:visible")
    .should((_) => {}) // Ignore assertion
    .then(($element) => {
      if ($element.length > 0) {
        $element.click()
      } else {
        cy.get(".navbar-burger").click()
        cy.get(".navbar-dropdown > :last").click()
      }
    })
})
Cypress.Commands.add("searchBar", () => {
  return cy.get("p.custom-search-bar")
})
Cypress.Commands.add("firstSearchedRecipient", () => {
  return cy.get(".custom-card > :nth-child(1) >> .recipient-name")
})
Cypress.Commands.add("searchInput", () => {
  return cy.get("input")
})
Cypress.Commands.add("topUpAccount", () => {
  return cy.get("div.custom-montant-input").find("div.account-selector").first()
})
Cypress.Commands.add("loginButton", () => {
  return cy.get("p > .is-login")
})
Cypress.Commands.add("createAccountButton", () => {
  return cy.get("p > .create-account")
})
Cypress.Commands.add("map", () => {
  return cy.get("iframe[data-cy='map-iframe']")
})

Cypress.Commands.add("searchRecipient", (recipient: string) => {
  cy.searchInput().type(recipient)
  cy.firstSearchedRecipient().should("be.visible")
  cy.firstSearchedRecipient().contains(recipient)
  return cy.firstSearchedRecipient()
})
Cypress.Commands.add("takeScreenshot", (title: string) => {
  cy.wait(2000)
  cy.screenshot(title)
})

declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<JQuery<HTMLElement>>
      dashboardLoading(): void
      menu(): Chainable<JQuery<HTMLElement>>
      loginForm(): Chainable<JQuery<HTMLElement>>
      isLogged(): void
      loginErrorMessage(): Chainable<JQuery<HTMLElement>>
      logout(): void
      setViewport(viewport: string | [number, number]): void
      accountsPane(): Chainable<JQuery<HTMLElement>>
      account(): Chainable<JQuery<HTMLElement>>
      payButton(): Chainable<JQuery<HTMLElement>>
      requestButton(): Chainable<JQuery<HTMLElement>>
      topUpButton(): Chainable<JQuery<HTMLElement>>
      transactionsPane(): Chainable<JQuery<HTMLElement>>
      transactions(): Chainable<JQuery<HTMLElement>>
      searchBar(): Chainable<JQuery<HTMLElement>>
      searchInput(): Chainable<JQuery<HTMLElement>>
      firstSearchedRecipient(): Chainable<JQuery<HTMLElement>>
      searchRecipient(recipient: string): Chainable<JQuery<HTMLElement>>
      topUpAccount(): Chainable<JQuery<HTMLElement>>
      createAccountButton(): Chainable<JQuery<HTMLElement>>
      loginButton(): Chainable<JQuery<HTMLElement>>
      map(): Chainable<JQuery<HTMLElement>>
      takeScreenshot(title: string): void
    }
  }
}

const params = Cypress.env("params")
const email = params["email"]
const password = params["password"]
const screenshot = params["screenshot"]
Cypress.Screenshot.defaults({ capture: "viewport", overwrite: true })

describe("Login and logout process", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("start page show base interface and login form", () => {
    cy.loginForm().should("be.visible")
    cy.menu().should("be.visible")
    cy.loginButton().should("be.visible")
    cy.createAccountButton().should("be.visible")
    if (screenshot) cy.takeScreenshot("login")
  })

  it("login with wrong email triggers error messages", () => {
    cy.login("foo", "wrongpassword")
    cy.loginErrorMessage().should("be.visible")
  })

  it("login with correct credentials succeeds, logout", () => {
    cy.login(email, password)
    cy.isLogged()
    cy.loginForm().should("not.exist")
    cy.logout()
  })
})

describe("Dashboard", () => {
  beforeEach(() => {
    cy.visit("/")
    cy.login(email, password)
  })

  it("show base interface", () => {
    cy.menu().should("be.visible")

    cy.accountsPane().within(() => {
      cy.account().should("be.visible")
    })
    cy.accountsPane().within(() => {
      cy.account().should("be.visible")
    })
    cy.transactionsPane().within(() => {
      cy.transactions().should("be.visible")
    })

    cy.payButton().should("be.visible")
    cy.requestButton().should("be.visible")
    cy.topUpButton().should("be.visible")
    if (screenshot) cy.takeScreenshot("dashboard")
  })
})
describe("Pay", () => {
  beforeEach(() => {
    cy.visit("/")
    cy.login(email, password)
  })
  it("Send money process", () => {
    cy.payButton().should("be.visible")
    cy.payButton().click()
    cy.searchBar().within(() => {
      cy.searchInput().should("be.visible")
    })
    cy.searchRecipient("Jesse")
    if (screenshot) cy.takeScreenshot("recipients")
    cy.firstSearchedRecipient().click()
    if (screenshot) cy.takeScreenshot("pay")
  })
})
describe("Top-up", () => {
  beforeEach(() => {
    cy.visit("/")
    cy.login(email, password)
  })
  it("Top-up process", () => {
    cy.topUpButton().should("be.visible")
    cy.topUpButton().click()
    cy.topUpAccount().click()
    if (screenshot) cy.takeScreenshot("topup")
  })
})
describe("map GoGoCarto", () => {
  beforeEach(() => {
    cy.visit("#/carto")
  })
  it("GoGoCarto map", () => {
    cy.url().should("include", "/carto")
    cy.wait(5000)
    if (screenshot) cy.takeScreenshot("map")
  })
})

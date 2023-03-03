import { defineConfig } from "cypress"

export default defineConfig({
  reporter: "../../node_modules/cypress-multi-reporters",
  env: {
    rootUrl: "http://localhost:8080/#/",
  },
  viewportWidth: 375,
  viewportHeight: 667,
  reporterOptions: {
    reporterEnabled: "mochawesome",
    mochawesomeReporterOptions: {
      reportDir: "../tests/cypress/reports/mocha",
      overwrite: false,
      html: false,
      json: true,
      video: false,
    },
  },
  e2e: {
    baseUrl: "http://localhost:8080",
    experimentalStudio: true,
    defaultCommandTimeout: 20000,
  },
})

/**
 * E2E — Contrôle d'accès par rôle (RBAC)
 */
describe("RBAC — redirection si non authentifié", () => {
  it("redirige vers /login depuis / sans token", () => {
    cy.clearLocalStorage();
    cy.visit("/");
    cy.url({ timeout: 5000 }).should("include", "/login");
  });

  it("redirige vers /login depuis /storage sans token", () => {
    cy.clearLocalStorage();
    cy.visit("/storage");
    cy.url({ timeout: 5000 }).should("include", "/login");
  });

  it("redirige vers /login depuis /reports sans token", () => {
    cy.clearLocalStorage();
    cy.visit("/reports");
    cy.url({ timeout: 5000 }).should("include", "/login");
  });
});

describe("RBAC — admin a accès à toutes les pages protégées", () => {
  before(() => {
    cy.login("admin@futurekawa.com", "Admin1234!");
  });

  it("peut accéder à /storage", () => {
    cy.visit("/storage");
    cy.url().should("not.include", "/login");
    cy.url().should("not.include", "/unauthorized");
  });

  it("peut accéder à /reports", () => {
    cy.visit("/reports");
    cy.url().should("not.include", "/login");
    cy.url().should("not.include", "/unauthorized");
  });
});

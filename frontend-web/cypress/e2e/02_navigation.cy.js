/**
 * E2E — Navigation et accès aux pages
 * Vérifie que toutes les pages sont accessibles après login admin.
 */
describe("Navigation — admin", () => {
  before(() => {
    cy.login("admin@futurekawa.com", "Admin1234!");
  });

  it("affiche le dashboard", () => {
    cy.visit("/");
    cy.url().should("not.include", "/login");
  });

  it("navigue vers la page Entrepôts", () => {
    cy.visit("/storage");
    cy.url().should("include", "storage");
  });

  it("navigue vers la page Alertes", () => {
    cy.visit("/alerts");
    cy.url().should("include", "alert");
  });

  it("navigue vers la page Rapports", () => {
    cy.visit("/reports");
    cy.url().should("include", "report");
  });

  it("navigue vers la page Lots", () => {
    cy.visit("/lots");
    cy.url().should("include", "lots");
  });
});

/**
 * E2E — Gestion des lots (admin)
 */
describe("Lots — admin", () => {
  before(() => {
    cy.login("admin@futurekawa.com", "Admin1234!");
  });

  it("affiche la liste des lots", () => {
    cy.visit("/lots");
    cy.url().should("include", "/lots");
    // La page doit charger sans erreur
    cy.get(".ant-table, .ant-empty, h1, h2", { timeout: 8000 }).should("exist");
  });

  it("la page lots n'affiche pas d'erreur 403 ou 401", () => {
    cy.visit("/lots");
    cy.contains(/unauthorized|403|401/i).should("not.exist");
  });
});

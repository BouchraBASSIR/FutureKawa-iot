/**
 * E2E — Authentification
 */
describe("Login", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("affiche le formulaire de connexion", () => {
    cy.get("input[placeholder='Email']").should("exist");
    cy.get("input[type='password']").should("exist");
    cy.contains("button", "Se connecter").should("exist");
  });

  it("reste sur /login avec des identifiants invalides", () => {
    cy.get("input[placeholder='Email']").type("faux@test.com");
    cy.get("input[type='password']").type("mauvais_mot_de_passe");
    cy.contains("button", "Se connecter").click();
    // La 401 est reçue — on vérifie juste qu'on reste sur la page login
    cy.url({ timeout: 4000 }).should("include", "/login");
  });

  it("redirige après un login admin réussi", () => {
    cy.get("input[placeholder='Email']").type("admin@futurekawa.com");
    cy.get("input[type='password']").type("Admin1234!");
    cy.contains("button", "Se connecter").click();
    cy.url({ timeout: 8000 }).should("not.include", "/login");
  });
});

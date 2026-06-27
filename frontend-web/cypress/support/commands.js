// Commande custom : login via l'API et injection du token en localStorage
Cypress.Commands.add("login", (email, password) => {
  cy.request("POST", "http://localhost:9000/auth/login", {
    email,
    mot_de_passe: password,
  }).then(({ body }) => {
    // La clé doit correspondre à TOKEN_KEY dans auth.services.js
    window.localStorage.setItem("futurekawa_token", body.access_token);
  });
});

// Alias pratique pour les appels API centraux
Cypress.Commands.add("apiGet", (path) =>
  cy.request({
    method: "GET",
    url: `http://localhost:9000${path}`,
    headers: {
      Authorization: `Bearer ${window.localStorage.getItem("token")}`,
    },
  })
);

import React from "react";
import { EnvironmentOutlined } from "@ant-design/icons";
import "./ScopeBadge.scss";

const FLAG   = { bresil: "🇧🇷", equateur: "🇪🇨", colombie: "🇨🇴" };
const LABELS = { bresil: "Brésil", equateur: "Équateur", colombie: "Colombie" };

/**
 * Pastille contextuelle qui indique le périmètre de données de l'utilisateur.
 * Affiché à la place du sélecteur de pays pour les utilisateurs à accès restreint.
 *
 * @param {string}      pays        - identifiant pays (ex: "bresil")
 * @param {number|null} entrepotId  - id de l'entrepôt assigné (optionnel)
 */
const ScopeBadge = ({ pays, entrepotId }) => {
  if (!pays) return null;

  return (
    <div className="scope-badge">
      <EnvironmentOutlined className="scope-badge__icon" />
      <span className="scope-badge__pays">
        {FLAG[pays] || ""} {LABELS[pays] || pays}
      </span>
      {entrepotId != null && (
        <span className="scope-badge__entrepot">
          Entrepôt n°{entrepotId}
        </span>
      )}
    </div>
  );
};

export default ScopeBadge;

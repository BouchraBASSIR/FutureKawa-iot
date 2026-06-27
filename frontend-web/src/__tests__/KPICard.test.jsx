import { render, screen } from "@testing-library/react";

// KPICard est défini inline dans Dashboard et Storage — on le teste ici en standalone
const KPICard = ({ label, value, color, sub }) => (
  <div className="kpi-card" style={{ borderLeftColor: color }}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value" style={{ color }}>{value ?? "—"}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

describe("KPICard", () => {
  it("affiche le label et la valeur", () => {
    render(<KPICard label="Total lots" value={42} color="#1677ff" />);
    expect(screen.getByText("Total lots")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("affiche '—' quand la valeur est null", () => {
    render(<KPICard label="Alertes" value={null} color="#ff4d4f" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("affiche le sous-texte quand fourni", () => {
    render(<KPICard label="Total" value={10} color="#52c41a" sub="5 conformes · 2 périmés" />);
    expect(screen.getByText("5 conformes · 2 périmés")).toBeInTheDocument();
  });

  it("n'affiche pas de sous-texte quand absent", () => {
    const { container } = render(<KPICard label="Total" value={10} color="#52c41a" />);
    expect(container.querySelector(".kpi-sub")).toBeNull();
  });

  it("applique la couleur de bordure via style", () => {
    const { container } = render(<KPICard label="Test" value={5} color="#fa8c16" />);
    const card = container.querySelector(".kpi-card");
    expect(card.style.borderLeftColor).toBe("rgb(250, 140, 22)");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renderiza el título", () => {
    render(<PageHeader title="Oportunidades" />);
    expect(
      screen.getByRole("heading", { name: "Oportunidades" }),
    ).toBeInTheDocument();
  });

  it("muestra la descripción cuando se provee", () => {
    render(<PageHeader title="Ranking" description="Los mejores nodos" />);
    expect(screen.getByText("Los mejores nodos")).toBeInTheDocument();
  });

  it("renderiza acciones hijas", () => {
    render(
      <PageHeader title="Perfil">
        <button>Editar</button>
      </PageHeader>,
    );
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });
});

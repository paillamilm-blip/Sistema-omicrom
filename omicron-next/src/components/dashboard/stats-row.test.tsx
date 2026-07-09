import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StatCard } from "@/types";

import { StatsRow } from "./stats-row";

const stats: StatCard[] = [
  { id: "s1", label: "XP este mes", value: "3.480", change: 24.5, icon: "Zap" },
  {
    id: "s2",
    label: "Proyectos activos",
    value: "3",
    change: 0,
    icon: "Briefcase",
  },
];

describe("StatsRow", () => {
  it("renderiza el valor y la etiqueta de cada stat", () => {
    render(<StatsRow stats={stats} />);
    expect(screen.getByText("3.480")).toBeInTheDocument();
    expect(screen.getByText("XP este mes")).toBeInTheDocument();
    expect(screen.getByText("Proyectos activos")).toBeInTheDocument();
  });

  it("muestra la variación cuando es distinta de cero", () => {
    render(<StatsRow stats={stats} />);
    expect(screen.getByText("24.5%")).toBeInTheDocument();
  });

  it("oculta la variación cuando es cero", () => {
    render(<StatsRow stats={stats} />);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});

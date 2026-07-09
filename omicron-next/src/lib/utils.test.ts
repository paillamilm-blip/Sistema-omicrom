import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cn, formatCurrency, formatDate, formatNumber, timeAgo } from "./utils";

describe("cn", () => {
  it("une clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
      "text-sm font-bold",
    );
  });
});

describe("formatCurrency", () => {
  it("formatea USD sin decimales", () => {
    expect(formatCurrency(4820, "USD")).toBe("$4,820");
  });

  it("respeta la moneda indicada", () => {
    const result = formatCurrency(1000, "USD");
    expect(result).toContain("1,000");
  });
});

describe("formatNumber", () => {
  it("agrega separadores de miles", () => {
    expect(formatNumber(12840)).toBe("12,840");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });
});

describe("formatDate", () => {
  it("formatea una fecha ISO de forma legible", () => {
    const result = formatDate("2026-07-08T00:00:00.000Z", "en-US");
    expect(result).toMatch(/2026/);
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve minutos para diferencias recientes", () => {
    const iso = new Date("2026-07-09T11:30:00.000Z").toISOString();
    expect(timeAgo(iso)).toBe("hace 30 min");
  });

  it("devuelve horas para el mismo día", () => {
    const iso = new Date("2026-07-09T09:00:00.000Z").toISOString();
    expect(timeAgo(iso)).toBe("hace 3 h");
  });

  it("devuelve días para diferencias mayores", () => {
    const iso = new Date("2026-07-06T12:00:00.000Z").toISOString();
    expect(timeAgo(iso)).toBe("hace 3 d");
  });
});

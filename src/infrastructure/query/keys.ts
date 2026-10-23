// infrastructure/query/keys.ts
// Centralized query key factory for type-safe cache invalidation.
//
// Pattern: each domain exports a key factory that produces consistent
// arrays for use with useQuery/useMutation/queryClient.invalidateQueries.
//
// Solo viven los grupos que hoy tiene la app: los empleos que alimentan la
// Red Viva y la propia Red Viva. El recorte de la Fase 5 borró los del
// mercado, la billetera y el chat junto con sus pantallas.

export const queryKeys = {
  // === JOBS (fuente de evidencia de la Red Viva; ya no hay pantalla de Empleos) ===
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: Record<string, unknown>) => ['jobs', 'list', filters] as const,
  },

  // === RED VIVA ===
  redviva: {
    all: ['redviva'] as const,
    /** Habilidades DEMOSTRADAS por nombre (tabla omicron_skill_proofs). */
    proofs: (userId: string) => ['redviva', 'proofs', userId] as const,
    /** Saldo del Fondo de Conocimiento (RPC omicron_fund_balance). */
    fondo: () => ['redviva', 'fondo'] as const,
    /** Cotización de la recompensa de una habilidad (RPC omicron_fund_quote). */
    quote: (skill: string) => ['redviva', 'quote', skill] as const,
  },
} as const;

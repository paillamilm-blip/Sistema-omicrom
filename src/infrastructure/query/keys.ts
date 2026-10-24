// infrastructure/query/keys.ts
// Centralized query key factory for type-safe cache invalidation.
//
// Pattern: each domain exports a key factory that produces consistent
// arrays for use with useQuery/useMutation/queryClient.invalidateQueries.
//
// Solo vive la Red Viva: el recorte de la Fase 5 borró las pantallas del mercado,
// la billetera y el chat, y la Fase 6B sacó los empleos que la alimentaban.

export const queryKeys = {
  // === RED VIVA ===
  redviva: {
    all: ['redviva'] as const,
    /** Habilidades DEMOSTRADAS por nombre (tabla omicron_skill_proofs). */
    proofs: (userId: string) => ['redviva', 'proofs', userId] as const,
  },
} as const;

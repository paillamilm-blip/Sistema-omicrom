// types/index.ts
// ═══════════════════════════════════════════════════════════════════════
// BARREL RE-EXPORT — Mantiene compatibilidad completa.
//
// Todos los archivos que hacen `import { X } from '../types'` siguen
// funcionando. Para imports más granulares (menos peso, mejor tree-shaking):
//
//   import type { Profile } from '@/types/profile';
//   import type { SkillTreeNode } from '@/types/skills';
//   import type { JobPosting } from '@/types/jobs';
// ═══════════════════════════════════════════════════════════════════════

export * from './common';
export * from './profile';
export * from './skills';
export * from './jobs';
export * from './chat';
export * from './notifications';
export * from './governance';
export * from './market';
export * from './wallet';

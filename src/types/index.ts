// types/index.ts
// ═══════════════════════════════════════════════════════════════════════
// BARREL RE-EXPORT — Mantiene compatibilidad completa.
//
// Todos los archivos que hacen `import { X } from '../types'` siguen
// funcionando. Para imports más granulares (menos peso, mejor tree-shaking):
//
//   import type { Profile } from '@/types/profile';
//   import type { SkillTreeNode } from '@/types/skills';
// ═══════════════════════════════════════════════════════════════════════

export * from './common';
export * from './profile';
export * from './skills';

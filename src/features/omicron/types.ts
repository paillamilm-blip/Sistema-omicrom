// =====================================================================
// Tipos compartidos de la feature Ómicrom.
//
// OrbNode representa un nodo navegable del shell (hub/tab) o un nodo de
// conocimiento del Gemelo Digital. Vivía en OrbNeuronal.tsx (el render 3D
// ya retirado); se reubicó aquí para desacoplarlo del código 3D. No tiene
// dependencias de three/@react-three: es un contrato de datos puro.
// =====================================================================
import type { TabId } from '@/types';

export interface OrbNode {
  id: string;
  label: string;
  tab: TabId;
  icon: string;
  level?: number;
  nextStep?: string;
}

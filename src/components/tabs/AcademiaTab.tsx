import { TrendingUp, Compass, BookOpen } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export function AcademiaTab() {
  const { profile } = useApp();
  const esNodoArquitecto = profile?.node_type === 'Nodo Arquitecto';

  return (
    <div className="flex flex-col h-full bg-omicron-bg p-4 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-omicron-text">Bóveda de Conocimiento</h1>
        <p className="text-sm text-omicron-subtle">
          Ecosistema de capital intelectual, validación y regalías encadenadas.
        </p>
      </div>

      {/* MÓDULO TRANSVERSAL: Exploración para TODOS los Nodos */}
      <div className="p-4 rounded-xl border border-omicron-border bg-omicron-surface mb-6">
        <h3 className="text-sm font-bold text-omicron-text mb-3 flex items-center gap-2">
          <Compass size={16} className="text-omicron-accent" /> Explorar Nuevas Dinámicas
        </h3>
        <p className="text-xs text-omicron-subtle mb-3">Accede a conocimientos indexados y validados por la red.</p>
        <div className="space-y-2">
          {['Automatización IoT en Plantas', 'Optimización de Mermas (Pareto)', 'Teoría de Moldes PET'].map(skill => (
            <button key={skill} className="w-full flex items-center justify-between p-2 rounded-lg bg-omicron-bg border border-omicron-border hover:border-omicron-accent/40 transition">
              <span className="text-xs text-omicron-text">{skill}</span>
              <span className="text-[10px] text-omicron-accent bg-omicron-accent/10 px-2 py-0.5 rounded font-medium">Desbloquear</span>
            </button>
          ))}
        </div>
      </div>


      {/* VISTA SEGMENTADA: Funciones de Rango */}
      <div className="grid grid-cols-1 gap-4">
        {esNodoArquitecto ? (
          /* Funciones exclusivas de Arquitecto */
          <div className="p-4 rounded-xl border border-omicron-green/30 bg-omicron-green/5">
            <h2 className="text-sm font-bold text-omicron-text flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-omicron-green" /> Regalías Encadenadas
            </h2>
            <p className="text-[10px] text-omicron-subtle mb-3">Gestiona tus ingresos pasivos por soluciones indexadas.</p>
            <button className="w-full py-2 bg-omicron-green/20 text-omicron-green border border-omicron-green/40 rounded-lg text-xs font-bold">Reclamar Regalías</button>
          </div>
        ) : (
          /* Funciones de seguimiento para Operativo/Core */
          <div className="p-4 rounded-xl border border-omicron-accent/30 bg-omicron-accent/5">
            <h3 className="text-sm font-bold text-omicron-text mb-2 flex items-center gap-2">
              <BookOpen size={16} className="text-omicron-accent" /> Ruta de Nivelación
            </h3>
            <p className="text-xs text-omicron-subtle">Completa validaciones para ascender en el escalafón.</p>
          </div>
        )}
      </div>
    </div>
  );
}

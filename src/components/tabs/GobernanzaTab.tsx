export function GobernanzaTab() {
  return (
    <div className="flex flex-col h-full bg-omicron-bg p-4 overflow-y-auto">
      <h1 className="text-2xl font-bold text-omicron-text mb-6">Centro de Gobernanza</h1>
      
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-omicron-border bg-omicron-surface">
          <h2 className="text-lg font-semibold text-omicron-text">Tribunal de Pares</h2>
          <p className="text-sm text-omicron-subtle mt-1">Auditoría de disputas y justicia descentralizada.</p>
          <button className="mt-3 px-4 py-2 bg-omicron-accent text-white rounded-lg text-sm font-medium">Entrar al Tribunal</button>
        </div>

        <div className="p-4 rounded-xl border border-omicron-border bg-omicron-surface">
          <h2 className="text-lg font-semibold text-omicron-text">Staking de Talento</h2>
          <p className="text-sm text-omicron-subtle mt-1">Venture Capital Humano y financiamiento de Nodos Novatos.</p>
          <button className="mt-3 px-4 py-2 bg-omicron-accent/20 text-omicron-accent border border-omicron-accent/40 rounded-lg text-sm font-medium">Mercado de Staking</button>
        </div>
      </div>
    </div>
  );
}

// components/tabs/EmpleosTab.tsx
// Empleos con Matchmaking automático (Regla 80/20 + Terna Expresa)

import { useEffect, useState } from 'react';
import { Briefcase, Zap, Clock, DollarSign, Flame, CheckCircle } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { supabase } from '../../lib/supabase';
import type { JobPosting, JobMatch } from '../../types';

interface JobPostingWithMatches extends JobPosting {
  matches?: JobMatch[];
  isMatched?: boolean;
  myMatchRank?: number;
}

export function EmpleosTab() {
  const { profile } = useApp();
  const [jobs, setJobs] = useState<JobPostingWithMatches[]>([]);
  const [myMatches, setMyMatches] = useState<Map<string, JobMatch>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobPostingWithMatches | null>(null);
  const [filter, setFilter] = useState<'all' | 'matched' | 'applied'>('all');

  // Cargar empleos publicados
  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('job_postings')
          .select('*')
          .eq('status', 'OPEN')
          .order('published_at', { ascending: false });

        if (error) {
          console.error('Error loading jobs:', error);
          return;
        }

        setJobs(data || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadJobs();
  }, []);


  // Cargar matches para el usuario actual
  useEffect(() => {
    if (!profile?.id) return;

    const loadMyMatches = async () => {
      const { data, error } = await supabase
        .from('job_matches')
        .select('*')
        .eq('user_id', profile.id);

      if (!error && data) {
        const matchMap = new Map(data.map(m => [m.job_id, m]));
        setMyMatches(matchMap);
      }
    };

    loadMyMatches();
  }, [profile?.id]);

  // Cargar candidatos sugeridos para cada job (solo si lo vemos)
  const loadJobMatches = async (jobId: string) => {
    const { data, error } = await supabase
      .from('job_matches')
      .select('*')
      .eq('job_id', jobId)
      .order('rank', { ascending: true });

    if (!error && data) {
      setJobs(prev =>
        prev.map(j =>
          j.id === jobId
            ? {
                ...j,
                matches: data,
                myMatchRank: myMatches.get(jobId)?.rank,
                isMatched: myMatches.has(jobId),
              }
            : j
        )
      );
    }
  };

  const handleJobSelect = async (job: JobPostingWithMatches) => {
    setSelectedJob(job);
    if (!job.matches) {
      await loadJobMatches(job.id);
    }
  };


  const filteredJobs = jobs.filter(job => {
    if (filter === 'matched') return myMatches.has(job.id);
    if (filter === 'applied') return false; // TODO: implementar applications
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Briefcase size={32} className="mx-auto mb-4 text-omicron-subtle opacity-50" />
          <p className="text-omicron-subtle">Cargando empleos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-omicron-bg overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 border-b border-omicron-border">
        <h1 className="text-2xl font-bold text-omicron-text">Empleos Disponibles</h1>
        <p className="text-sm text-omicron-subtle mt-1">
          {filteredJobs.length} oportunidades esperándote
        </p>
      </div>

      {/* Tabs de filtro */}
      <div className="flex-none flex gap-2 px-4 py-3 border-b border-omicron-border overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
            filter === 'all'
              ? 'bg-omicron-accent text-omicron-bg'
              : 'bg-omicron-card text-omicron-text hover:bg-omicron-surface'
          }`}
        >
          Todos ({jobs.length})
        </button>
        <button
          onClick={() => setFilter('matched')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
            filter === 'matched'
              ? 'bg-omicron-accent text-omicron-bg'
              : 'bg-omicron-card text-omicron-text hover:bg-omicron-surface'
          }`}
        >
          <Flame size={14} />
          Match ({myMatches.size})
        </button>
        <button
          onClick={() => setFilter('applied')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${
            filter === 'applied'
              ? 'bg-omicron-accent text-omicron-bg'
              : 'bg-omicron-card text-omicron-text hover:bg-omicron-surface'
          }`}
        >
          Aplicados (0)
        </button>
      </div>


      {/* Contenido principal */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Lista de empleos */}
        <div className="flex-1 overflow-y-auto border-r border-omicron-border">
          {filteredJobs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Briefcase size={32} className="mx-auto mb-4 text-omicron-subtle opacity-50" />
                <p className="text-omicron-subtle">No hay empleos disponibles</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredJobs.map(job => {
                const isMatched = myMatches.has(job.id);
                const myRank = myMatches.get(job.id)?.rank;

                return (
                  <button
                    key={job.id}
                    onClick={() => handleJobSelect(job)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition active:scale-95 ${
                      selectedJob?.id === job.id
                        ? 'border-omicron-accent bg-omicron-accent/10'
                        : 'border-omicron-border bg-omicron-surface hover:bg-omicron-card'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-omicron-text">{job.title}</h3>
                      {isMatched && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <Flame size={12} className="text-amber-500" />
                          <span className="text-xs font-bold text-amber-500">Top {myRank}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="flex items-center gap-1 text-omicron-subtle text-xs">
                        <DollarSign size={12} />
                        <span>${job.budget_usd}</span>
                      </div>
                      <div className="flex items-center gap-1 text-omicron-subtle text-xs">
                        <Clock size={12} />
                        <span>{job.time_limit_hours}h</span>
                      </div>
                      <div className="flex items-center gap-1 text-omicron-subtle text-xs">
                        <Zap size={12} />
                        <span>Nivel {job.required_node_level}</span>
                      </div>
                    </div>

                    <p className="text-xs text-omicron-subtle line-clamp-2">{job.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>


        {/* Panel de detalles */}
        {selectedJob ? (
          <div className="w-96 border-l border-omicron-border flex flex-col overflow-hidden">
            {/* Header del panel */}
            <div className="flex-none p-4 border-b border-omicron-border">
              <h2 className="font-bold text-omicron-text">{selectedJob.title}</h2>
              <p className="text-xs text-omicron-subtle mt-1">Detalles de la oportunidad</p>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Detalles principales */}
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-omicron-card">
                  <p className="text-xs text-omicron-subtle mb-1">Presupuesto</p>
                  <p className="text-xl font-bold text-omicron-accent">${selectedJob.budget_usd}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-omicron-card">
                    <p className="text-xs text-omicron-subtle mb-1">Tiempo Límite</p>
                    <p className="text-lg font-bold text-omicron-text">{selectedJob.time_limit_hours}h</p>
                  </div>
                  <div className="p-3 rounded-lg bg-omicron-card">
                    <p className="text-xs text-omicron-subtle mb-1">Nivel Requerido</p>
                    <p className="text-lg font-bold text-omicron-text">N{selectedJob.required_node_level}</p>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <p className="text-xs text-omicron-subtle uppercase font-semibold mb-2">Descripción</p>
                <p className="text-sm text-omicron-text leading-relaxed">{selectedJob.description}</p>
              </div>


              {/* Terna Expresa (Top 3 Candidatos) */}
              {selectedJob.matches && selectedJob.matches.length > 0 && (
                <div>
                  <p className="text-xs text-omicron-subtle uppercase font-semibold mb-2">
                    Terna Expresa - Top 3 Candidatos
                  </p>
                  <div className="space-y-2">
                    {selectedJob.matches.map(match => (
                      <div
                        key={match.id}
                        className={`p-2.5 rounded-lg border-2 ${
                          match.user_id === profile?.id
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-omicron-border bg-omicron-card'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-omicron-accent flex items-center justify-center text-xs font-bold text-omicron-bg">
                              {match.rank}
                            </div>
                            <span className="text-sm font-semibold text-omicron-text">
                              {match.user_id === profile?.id ? '👤 Tú' : 'Candidato'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-omicron-accent">
                            {Math.round(match.match_score)}%
                          </span>
                        </div>
                        <p className="text-xs text-omicron-subtle">{match.match_reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Estado del usuario */}
              <div>
                <p className="text-xs text-omicron-subtle uppercase font-semibold mb-2">Tu Estado</p>
                <div className="p-3 rounded-lg bg-omicron-card border border-omicron-border">
                  {myMatches.has(selectedJob.id) ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      <div>
                        <p className="text-sm font-bold text-green-500">¡Eres candidato!</p>
                        <p className="text-xs text-omicron-subtle">
                          Posición #{myMatches.get(selectedJob.id)?.rank}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-omicron-subtle">
                      No cumples los requisitos mínimos para esta oportunidad.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer - Botón de acción */}
            {myMatches.has(selectedJob.id) && (
              <div className="flex-none p-4 border-t border-omicron-border">
                <button className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-bold transition active:scale-95">
                  Iniciar Chat Seguro
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-96 border-l border-omicron-border flex items-center justify-center">
            <p className="text-omicron-subtle text-sm">Selecciona un empleo para ver detalles</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { Modal } from '../shared/Modal';
import { Plus, X } from 'lucide-react';
import { NODE_TYPES, NODE_LEVELS, formatNodeLevel } from '../../config/nodes';

interface Props { onClose: () => void }

export function EditProfileModal({ onClose }: Props) {
  const { profile, refreshProfile } = useApp();
  const [form, setForm] = useState({
    username:  profile?.username  ?? '',
    full_name: profile?.full_name ?? '',
    bio:       profile?.bio       ?? '',
    location:  profile?.location  ?? '',
    node_type: profile?.node_type ?? 'Nodo Operativo',
    node_level: profile?.node_level ?? 1,
  });
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 10) {
      setSkills([...skills, s]);
      setSkillInput('');
    }
  }

  function removeSkill(s: string) {
    setSkills(skills.filter(x => x !== s));
  }


  async function handleSave() {
    if (!profile) return;
    setError(null);
    setSaving(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ ...form, skills })
      .eq('id', profile.id);

    if (err) {
      setError(err.message);
    } else {
      await refreshProfile();
      onClose();
    }
    setSaving(false);
  }

  function field(label: string, key: keyof typeof form, type = 'text', placeholder = '') {
    return (
      <div>
        <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">{label}</label>
        {key === 'bio' ? (
          <textarea
            value={form[key]}
            onChange={e => setForm({ ...form, [key]: e.target.value })}
            placeholder={placeholder}
            rows={3}
            className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition resize-none"
          />
        ) : (
          <input
            type={type}
            value={form[key]}
            onChange={e => setForm({ ...form, [key]: e.target.value })}
            placeholder={placeholder}
            className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
          />
        )}
      </div>
    );
  }


  return (
    <Modal title="Editar Perfil" onClose={onClose}>
      <div className="px-5 py-4 space-y-4">

        {field('Nombre completo', 'full_name', 'text', 'Tu nombre')}
        {field('Username', 'username', 'text', 'tu_nodo')}
        {field('Ubicación', 'location', 'text', 'Santiago, Chile')}
        {field('Biografía', 'bio', 'textarea', 'Cuéntanos sobre ti y tu expertise...')}

        {/* Node Type */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Tipo de Nodo</label>
          <div className="grid grid-cols-2 gap-2">
            {NODE_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setForm({ ...form, node_type: t })}
                className={`py-2 rounded-xl text-xs font-medium border transition ${
                  form.node_type === t
                    ? 'border-omicron-accent bg-omicron-accent/20 text-omicron-accent'
                    : 'border-omicron-border bg-omicron-surface text-omicron-subtle hover:text-omicron-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Node Level */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Nivel</label>
          <div className="flex gap-2">
            {NODE_LEVELS.map(l => (
              <button
                key={l}
                onClick={() => setForm({ ...form, node_level: l })}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition ${
                  form.node_level === l
                    ? 'border-omicron-accent bg-omicron-accent/20 text-omicron-accent'
                    : 'border-omicron-border bg-omicron-surface text-omicron-subtle hover:text-omicron-text'
                }`}
              >
                {formatNodeLevel(l)}
              </button>
            ))}
          </div>
        </div>


        {/* Skills */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-2 block">
            Habilidades ({skills.length}/10)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="React, Figma, Python..."
              className="flex-1 bg-omicron-surface border border-omicron-border rounded-xl px-3 py-2.5 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
            />
            <button
              onClick={addSkill}
              className="w-10 h-10 bg-omicron-accent rounded-xl flex items-center justify-center text-white hover:bg-violet-600 transition"
            >
              <Plus size={16} />
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s} className="flex items-center gap-1 bg-omicron-surface border border-omicron-border rounded-lg px-3 py-1 text-sm text-omicron-text">
                  {s}
                  <button onClick={() => removeSkill(s)} className="text-omicron-subtle hover:text-omicron-red ml-1 transition">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>


        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pb-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-omicron-surface border border-omicron-border text-omicron-subtle text-sm font-medium hover:text-omicron-text transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-omicron-accent text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-60 transition active:scale-95"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

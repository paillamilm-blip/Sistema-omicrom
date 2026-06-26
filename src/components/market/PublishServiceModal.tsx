import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { Modal } from '../shared/Modal';

interface Props {
  onClose: () => void;
  onPublished: () => void;
}

const CATEGORIES = [
  { key: 'dev',     label: '💻 Dev' },
  { key: 'diseño',  label: '🎨 Diseño' },
  { key: 'consulta',label: '🏳️ Consulta' },
  { key: 'marketing',label: '📣 Marketing' },
  { key: 'data',    label: '📊 Data' },
];

export function PublishServiceModal({ onClose, onPublished }: Props) {
  const { profile } = useApp();
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'dev',
  });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 6) {
      setTags([...tags, t]);
      setTagInput('');
    }
  }


  async function handlePublish() {
    if (!profile) return;
    if (!form.title.trim() || !form.price) return setError('Completa título y precio.');
    const price = parseInt(form.price);
    if (isNaN(price) || price < 10) return setError('El precio mínimo es 10 tokens.');

    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('market_services').insert({
      seller_id:   profile.id,
      title:       form.title.trim(),
      description: form.description.trim() || null,
      price,
      category:    form.category,
      tags:        tags.length > 0 ? tags : null,
      is_active:   true,
    });
    setSaving(false);
    if (err) return setError(err.message);
    onPublished();
    onClose();
  }

  return (
    <Modal title="Publicar Servicio" onClose={onClose}>
      <div className="px-5 py-4 space-y-4">

        {/* Title */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Título del servicio *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Desarrollo App React, Diseño UI/UX..."
            className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
          />
        </div>


        {/* Description */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Descripción</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Describe qué incluye tu servicio, entregables, plazos..."
            rows={3}
            className="w-full bg-omicron-surface border border-omicron-border rounded-xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition resize-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-1 block">Precio en Tokens *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🪙</span>
            <input
              type="number"
              min="10"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              placeholder="100"
              className="w-full bg-omicron-surface border border-omicron-border rounded-xl pl-10 pr-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
            />
          </div>
        </div>


        {/* Category */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-2 block">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setForm({ ...form, category: c.key })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  form.category === c.key
                    ? 'border-omicron-accent bg-omicron-accent/20 text-omicron-accent'
                    : 'border-omicron-border bg-omicron-surface text-omicron-subtle hover:text-omicron-text'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-omicron-subtle text-xs uppercase tracking-wide mb-2 block">
            Tecnologías / Tags ({tags.length}/6)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="React, Figma..."
              className="flex-1 bg-omicron-surface border border-omicron-border rounded-xl px-3 py-2.5 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
            />
            <button onClick={addTag} className="w-10 h-10 bg-omicron-accent rounded-xl flex items-center justify-center text-white hover:bg-violet-600 transition">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 bg-omicron-surface border border-omicron-border rounded-lg px-3 py-1 text-sm text-omicron-text">
                {t}
                <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-omicron-subtle hover:text-omicron-red ml-1 transition">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>


        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pb-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle text-sm font-medium hover:text-omicron-text transition">
            Cancelar
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-omicron-accent text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-60 transition active:scale-95"
          >
            {saving ? 'Publicando...' : 'Publicar Servicio'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

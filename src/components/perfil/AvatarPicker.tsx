// components/perfil/AvatarPicker.tsx
// ═══════════════════════════════════════════════════════════════════════
// SELECTOR DE AVATAR: gradientes predefinidos + opción de subir imagen.
// ═══════════════════════════════════════════════════════════════════════

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { C } from '../../theme';
import type { AnalyzedProfile } from '../../lib/cvAnalyzer';

interface Props {
  selected?: AnalyzedProfile['avatar'];
  onChange: (avatar: AnalyzedProfile['avatar']) => void;
}

const AVATAR_PALETTES = [
  ['#5cc8ff', '#5e5ce6'],
  ['#3fd0c9', '#5cc8ff'],
  ['#ffb02e', '#ff6a3d'],
  ['#b98bff', '#5e5ce6'],
  ['#ff8fb0', '#ff375f'],
  ['#8b9dff', '#3fd0c9'],
];

export function AvatarPicker({ selected, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleGradientSelect(index: number) {
    onChange({ type: 'grad', v: index });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 2MB)
    if (file.size > 2200000) {
      alert('Imagen muy grande (máx 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange({ type: 'img', v: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  const isImgSelected = selected?.type === 'img';

  return (
    <div style={S.wrap}>
      {/* Botón de upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...S.slot,
          ...(isImgSelected && selected?.type === 'img'
            ? {
                backgroundImage: `url(${selected.v})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `1.5px solid ${C.cyan}`,
                boxShadow: `0 0 0 3px rgba(92,200,255,0.25)`,
              }
            : {
                borderStyle: 'dashed',
              }),
        }}
        aria-label="Subir avatar"
      >
        {!isImgSelected && <Plus size={22} />}
      </button>

      {/* Gradientes predefinidos */}
      {AVATAR_PALETTES.map(([c1, c2], i) => {
        const isSelected = selected?.type === 'grad' && selected.v === i;
        return (
          <button
            key={i}
            onClick={() => handleGradientSelect(i)}
            style={{
              ...S.slot,
              background: `linear-gradient(140deg, ${c1}, ${c2})`,
              border: isSelected ? `1.5px solid ${C.cyan}` : `1.5px solid ${C.line}`,
              boxShadow: isSelected ? `0 0 0 3px rgba(92,200,255,0.25)` : 'none',
            }}
            aria-label={`Gradiente ${i + 1}`}
          />
        );
      })}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  slot: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    cursor: 'pointer',
    border: `1.5px solid ${C.line}`,
    background: C.glass,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: C.mut,
    transition: 'all 0.15s',
    flexShrink: 0,
  },
};

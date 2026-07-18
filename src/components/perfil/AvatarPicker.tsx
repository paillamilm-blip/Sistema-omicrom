// components/perfil/AvatarPicker.tsx
// ═══════════════════════════════════════════════════════════════════════
// SELECTOR DE AVATAR: gradientes predefinidos + opción de subir imagen.
// Las imágenes se suben al bucket "avatars" de Supabase Storage y se
// devuelve la URL pública. Fallback a base64 si Storage no disponible.
// ═══════════════════════════════════════════════════════════════════════

import { useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useApp();

  function handleGradientSelect(index: number) {
    onChange({ type: 'grad', v: index });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 2MB)
    if (file.size > 2200000) {
      setError('Imagen muy grande (máx 2MB)');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const userId = profile?.id;
      if (!userId) {
        // Fallback: usar base64 local si no hay usuario autenticado
        const reader = new FileReader();
        reader.onload = () => {
          onChange({ type: 'img', v: String(reader.result) });
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Generar nombre único para evitar conflictos de caché
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/avatar-${Date.now()}.${ext}`;

      // Subir a Supabase Storage (bucket: avatars)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.warn('Supabase Storage upload failed, using base64 fallback:', uploadError.message);
        // Fallback a base64 si el bucket no existe o falla
        const reader = new FileReader();
        reader.onload = () => {
          onChange({ type: 'img', v: String(reader.result) });
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      // Obtener URL pública
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicData?.publicUrl;

      if (publicUrl) {
        onChange({ type: 'img', v: publicUrl });

        // Guardar en el perfil del usuario
        await supabase.from('profiles').update({
          avatar_url: publicUrl,
        }).eq('id', userId);
      } else {
        // Fallback si no se puede obtener URL pública
        const reader = new FileReader();
        reader.onload = () => {
          onChange({ type: 'img', v: String(reader.result) });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Error al subir la imagen');
      // Fallback final a base64
      const reader = new FileReader();
      reader.onload = () => {
        onChange({ type: 'img', v: String(reader.result) });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  }

  const isImgSelected = selected?.type === 'img';

  return (
    <div style={S.wrap}>
      {/* Botón de upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
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
          opacity: uploading ? 0.6 : 1,
        }}
        aria-label="Subir avatar"
      >
        {uploading ? <Loader2 size={20} style={{ animation: 'cp-spin 1s linear infinite' }} /> : (!isImgSelected && <Plus size={22} />)}
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

      {error && (
        <div style={S.error}>{error}</div>
      )}
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
  error: {
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    color: '#f87171',
    marginTop: 4,
  },
};

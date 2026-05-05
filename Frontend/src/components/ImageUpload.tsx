import React, { useState, useRef } from 'react';
import { getApiUrl, adminFetch, validateFileType, validateFileSize } from '../utils/security';


interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  currentImage?: string;
  label?: string;
}

export default function ImageUpload({ onImageUploaded, currentImage, label = 'Image' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileType(file, ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])) {
      setError('Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.');
      return;
    }

    if (!validateFileSize(file, 5)) {
      setError('L\'image est trop grande (max 5 Mo).');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl?.split(',')[1];
        if (!base64) {
          setError('Erreur lors de la lecture du fichier');
          setUploading(false);
          return;
        }

        const mimeType = file.type || 'image/jpeg';
        const apiUrl = getApiUrl();
        const response = await adminFetch(`${apiUrl}/api/admin/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            name: file.name.slice(0, 255).replace(/[^a-zA-Z0-9._-]/g, '_'),
            mimeType: mimeType,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error((data as { detail?: string }).detail || 'Erreur lors de l\'upload');
        }

        const data = await response.json();
        const url = (data as { url?: string }).url;
        if (url) {
          onImageUploaded(url);
        } else {
          throw new Error('URL d\'image non reçue');
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
      setUploading(false);
    }
    e.target.value = '';
  };

  const triggerFileInput = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
        aria-hidden
      />
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {currentImage ? (
        <div className="relative">
          <img src={currentImage} alt="Aperçu" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              type="button"
              onClick={triggerFileInput}
              disabled={uploading}
              className="p-1.5 bg-white/95 text-gray-900 rounded-full border border-gray-200 hover:bg-white shadow hover:scale-105 transition-all"
              title="Remplacer l'image"
            >
              📤
            </button>
            <button
              type="button"
              onClick={() => onImageUploaded('')}
              className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
              title="Supprimer l'image"
            >
              ✕
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
              <span className="text-sm text-white font-medium">Upload en cours...</span>
            </div>
          )}
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={triggerFileInput}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerFileInput(); } }}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/50 transition-colors"
        >
          <span className="text-3xl">📤</span>
          <p className="text-sm text-gray-600 mt-2">Cliquez pour envoyer une image</p>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG ou WebP — max 5 Mo</p>
          {uploading && <p className="text-sm text-gray-500 mt-2">Upload en cours...</p>}
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';
import { getOutfitLabel } from '@/lib/outfit-label';

export default function ImageLightbox({ outfit, onClose }) {
  const { closing, requestClose } = useAnimatedClose(onClose, 240);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [requestClose]);

  if (!outfit) return null;

  return (
    <div
      className={`image-lightbox${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={getOutfitLabel(outfit)}
      onClick={requestClose}
    >
      <button
        type="button"
        className="image-lightbox-close"
        aria-label="Close"
        onClick={requestClose}
      >
        ×
      </button>
      <div
        className="image-lightbox-frame"
        onClick={(event) => event.stopPropagation()}
      >
        <SmoothImage
          src={outfit.image}
          alt={getOutfitLabel(outfit)}
          className="image-lightbox-image"
          priority
        />
        <div className="image-lightbox-caption">{getOutfitLabel(outfit)}</div>
      </div>
    </div>
  );
}

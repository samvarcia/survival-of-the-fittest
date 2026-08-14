'use client';

import { useEffect, useRef, useState } from 'react';

export default function SmoothImage({
  src,
  alt,
  className = '',
  priority = false,
  onError,
}) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`smooth-image ${loaded ? 'is-loaded' : ''} ${className}`}
      decoding="async"
      fetchPriority={priority ? 'high' : 'low'}
      onLoad={() => setLoaded(true)}
      onError={onError}
    />
  );
}

export function preloadImages(urls = []) {
  urls.forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  });
}

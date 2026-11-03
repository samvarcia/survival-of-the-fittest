'use client';

import { useEffect, useRef, useState } from 'react';

const warmed = new Set();
const inflight = new Map();

function warmUrl(url, { priority = false } = {}) {
  if (!url || warmed.has(url)) return Promise.resolve(url);
  if (inflight.has(url)) return inflight.get(url);

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    if (priority) {
      try {
        img.fetchPriority = 'high';
      } catch {
        // ignore unsupported
      }
    }
    const done = () => {
      warmed.add(url);
      inflight.delete(url);
      resolve(url);
    };
    img.onload = done;
    img.onerror = done;
    img.src = url;
  });

  inflight.set(url, promise);
  return promise;
}

export function preloadImages(urls = [], { priority = false, concurrency = 6 } = {}) {
  const list = urls.filter(Boolean);
  if (!list.length) return Promise.resolve();

  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (index < list.length) {
      const currentIndex = index;
      const current = list[currentIndex];
      index += 1;
      await warmUrl(current, { priority: priority || currentIndex < 8 });
    }
  });

  return Promise.all(workers);
}

export function isImageWarmed(url) {
  return Boolean(url && warmed.has(url));
}

export default function SmoothImage({
  src,
  alt,
  className = '',
  priority = false,
  eager = false,
  fade = true,
  onError,
}) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(() => isImageWarmed(src));

  useEffect(() => {
    if (isImageWarmed(src)) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      warmed.add(src);
      setLoaded(true);
      return;
    }

    warmUrl(src, { priority });
  }, [src, priority]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={`smooth-image ${fade ? '' : 'no-fade'} ${loaded ? 'is-loaded' : ''} ${className}`}
      decoding={priority || eager ? 'sync' : 'async'}
      loading={priority || eager ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={() => {
        warmed.add(src);
        setLoaded(true);
      }}
      onError={onError}
    />
  );
}

'use client';

import { useCallback, useRef, useState } from 'react';

export default function useAnimatedClose(onClose, duration = 320) {
  const [closing, setClosing] = useState(false);
  const locked = useRef(false);

  const requestClose = useCallback(() => {
    if (locked.current) return;
    locked.current = true;
    setClosing(true);
    window.setTimeout(onClose, duration);
  }, [onClose, duration]);

  return { closing, requestClose };
}

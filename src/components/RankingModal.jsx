'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';
import { getOutfitLabel } from '@/lib/outfit-label';

export default function RankingModal({ stats, outfits, onClose }) {
  const ranked = outfits
    .map((outfit) => {
      const stat = stats.find((item) => item.outfitId === outfit.id);
      return {
        ...outfit,
        votes: stat?.votes || 0,
        percentage: stat?.percentage || 0,
      };
    })
    .sort((a, b) => b.votes - a.votes);

  const topThree = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const { closing, requestClose } = useAnimatedClose(onClose, 280);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [requestClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) requestClose();
  };

  const rankLabel = (index) => {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `#${index + 1}`;
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="theme-main ranking-portal">
      <div
        className={`modal-overlay ranking-overlay${closing ? ' is-closing' : ''}`}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label="Ranking"
      >
        <div className="ranking-modal">
          <div className="ranking-modal-grabber" aria-hidden="true" />
          <div className="ranking-modal-header">
            <h2>RANKING</h2>
            <button type="button" className="ranking-close" onClick={requestClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="ranking-modal-body">
            {topThree.length > 0 && (
              <div className="ranking-podium">
                {topThree.map((outfit, index) => (
                  <div key={outfit.id} className={`ranking-podium-item rank-${index + 1}`}>
                    <SmoothImage
                      src={outfit.image}
                      alt={getOutfitLabel(outfit)}
                      className="ranking-podium-image"
                      priority={index === 0}
                    />
                    <div className="ranking-podium-place">{rankLabel(index)}</div>
                    <div className="ranking-podium-handle">{getOutfitLabel(outfit)}</div>
                    <div className="ranking-podium-votes">{outfit.votes}</div>
                  </div>
                ))}
              </div>
            )}

            {rest.length > 0 && (
              <div className="ranking-list">
                {rest.map((outfit, index) => (
                  <div key={outfit.id} className="ranking-row">
                    <div className="ranking-row-place">{index + 4}</div>
                    <SmoothImage
                      src={outfit.image}
                      alt={getOutfitLabel(outfit)}
                      className="ranking-row-image"
                    />
                    <div className="ranking-row-handle">{getOutfitLabel(outfit)}</div>
                    <div className="ranking-row-votes">{outfit.votes}</div>
                  </div>
                ))}
              </div>
            )}

            {ranked.length === 0 && (
              <div className="ranking-empty">No votes yet</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

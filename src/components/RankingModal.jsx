'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';
import { getOutfitLabel } from '@/lib/outfit-label';

export default function RankingModal({ outfits, onClose }) {
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(true);
  const { closing, requestClose } = useAnimatedClose(onClose, 280);

  useEffect(() => {
    let cancelled = false;

    const loadRanking = async () => {
      try {
        const response = await fetch('/api/ranking', {
          signal: AbortSignal.timeout(6000),
        });
        if (!response.ok) throw new Error('Failed to load ranking');
        const data = await response.json();
        if (cancelled || !data.success) return;

        const byId = new Map(outfits.map((outfit) => [outfit.id, outfit]));
        const next = (data.ranking || [])
          .map((row) => {
            const outfit = byId.get(row.outfitId);
            if (!outfit) return null;
            return {
              ...outfit,
              votes: Number(row.votes) || 0,
              place: row.place,
            };
          })
          .filter(Boolean);

        setRanked(next);
      } catch (error) {
        console.error('Ranking load failed:', error);
        if (!cancelled) setRanked([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRanking();
    return () => {
      cancelled = true;
    };
  }, [outfits]);

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

  const rankLabel = (place) => {
    if (place === 1) return '1st';
    if (place === 2) return '2nd';
    if (place === 3) return '3rd';
    return `#${place}`;
  };

  const topThree = ranked.slice(0, 3);
  const rest = ranked.slice(3);

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
            {loading && <div className="ranking-empty">Loading…</div>}

            {!loading && topThree.length > 0 && (
              <div className="ranking-podium">
                {topThree.map((outfit) => (
                  <div key={outfit.id} className={`ranking-podium-item rank-${outfit.place}`}>
                    <SmoothImage
                      src={outfit.image}
                      alt={getOutfitLabel(outfit)}
                      className="ranking-podium-image"
                      priority={outfit.place === 1}
                    />
                    <div className="ranking-podium-place">{rankLabel(outfit.place)}</div>
                    <div className="ranking-podium-handle">{getOutfitLabel(outfit)}</div>
                    <div className="ranking-podium-votes">{outfit.votes}</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && rest.length > 0 && (
              <div className="ranking-list">
                {rest.map((outfit) => (
                  <div key={outfit.id} className="ranking-row">
                    <div className="ranking-row-place">{outfit.place}</div>
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

            {!loading && ranked.length === 0 && (
              <div className="ranking-empty">No votes yet</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

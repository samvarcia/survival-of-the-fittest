'use client';

import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';

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
  const { closing, requestClose } = useAnimatedClose(onClose);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) requestClose();
  };

  const rankLabel = (index) => {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return '';
  };

  return (
    <div className={`modal-overlay ranking-overlay${closing ? ' is-closing' : ''}`} onClick={handleOverlayClick}>
      <div className="ranking-modal">
        <div className="ranking-modal-header">
          <h2>🏆 RANKING</h2>
          <button type="button" className="ranking-close" onClick={requestClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ranking-modal-body">
          <div className="ranking-podium">
            {topThree.map((outfit, index) => (
              <div key={outfit.id} className={`ranking-podium-item rank-${index + 1}`}>
                <SmoothImage
                  src={outfit.image}
                  alt={`@${outfit.participantInstagram}`}
                  className="ranking-podium-image"
                  priority={index === 0}
                />
                <div className="ranking-podium-place">{rankLabel(index)}</div>
                <div className="ranking-podium-handle">@{outfit.participantInstagram}</div>
                <div className="ranking-podium-votes">{outfit.votes}</div>
              </div>
            ))}
          </div>

          <div className="ranking-list">
            {ranked.map((outfit, index) => (
              <div key={outfit.id} className="ranking-row">
                <span className="ranking-row-place">{index + 1}</span>
                <SmoothImage
                  src={outfit.image}
                  alt={`@${outfit.participantInstagram}`}
                  className="ranking-row-image"
                />
                <span className="ranking-row-handle">@{outfit.participantInstagram}</span>
                <span className="ranking-row-votes">{outfit.votes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

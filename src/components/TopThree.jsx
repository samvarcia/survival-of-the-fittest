import Link from 'next/link';
import { useState } from 'react';

export default function TopThree({ stats, outfits }) {
  const [imageErrors, setImageErrors] = useState({});

  // Get top 3 outfits by vote count
  const topThree = stats
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3)
    .map(stat => ({
      ...stat,
      outfit: outfits.find(outfit => outfit.id === stat.outfitId)
    }));

  const handleImageError = (outfitId) => {
    setImageErrors(prev => ({ ...prev, [outfitId]: true }));
  };

  if (topThree.length === 0) {
    return null;
  }

  const getRankLabel = (index) => {
    switch (index) {
      case 0: return '1st';
      case 1: return '2nd';
      case 2: return '3rd';
      default: return '';
    }
  };

  const getRankClass = (index) => {
    switch (index) {
      case 0: return 'first';
      case 1: return 'second';
      case 2: return 'third';
      default: return '';
    }
  };

  return (
    <div className="top-three-section">
      <h2 className="section-title">TOP 3</h2>
      
      <div className="podium">
        {topThree.map((item, index) => (
          <div key={item.outfitId} className="podium-item">
            {!imageErrors[item.outfitId] ? (
              <img
                src={item.outfit?.image}
                alt={`Top ${index + 1}: @${item.outfit?.participantInstagram}`}
                className="podium-image"
                onError={() => handleImageError(item.outfitId)}
                loading="lazy"
              />
            ) : (
              <div className="podium-image" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '12px',
                color: 'var(--dark-gray)'
              }}>
                @{item.outfit?.participantInstagram}
              </div>
            )}
            
            <div className={`podium-rank ${getRankClass(index)}`}>
              {getRankLabel(index)}
            </div>
            
            <div className="podium-handle">
              @{item.outfit?.participantInstagram}
            </div>
            
            <div className="podium-votes">
              {item.votes} votes
            </div>
          </div>
        ))}
      </div>

      {/* <Link href="/dashboard" className="view-full-chart">
        View Full Chart
      </Link> */}
    </div>
  );
}
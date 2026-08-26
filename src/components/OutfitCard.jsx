import { useState } from 'react';
import { getOutfitLabel } from '@/lib/outfit-label';

export default function OutfitCard({ outfit, onVote, hasVoted }) {
  const [imageError, setImageError] = useState(false);
  const label = getOutfitLabel(outfit);

  const handleClick = () => {
    onVote(outfit);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div 
      className={`outfit-card ${hasVoted ? 'voted' : ''}`}
      onClick={handleClick}
    >
      <div className="vote-indicator"></div>
      
      {!imageError ? (
        <img
          src={outfit.image}
          alt={`Outfit ${label}`}
          className="outfit-image"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <div className="outfit-image" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '12px',
          color: 'var(--dark-gray)'
        }}>
          {label}
        </div>
      )}
      
      <div className="outfit-handle">
      {label}
      </div>
    </div>
  );
}

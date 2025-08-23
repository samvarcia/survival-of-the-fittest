import { useState } from 'react';

export default function OutfitCard({ outfit, onVote, hasVoted }) {
  const [imageError, setImageError] = useState(false);

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
          alt={`Outfit by @${outfit.participantInstagram}`}
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
          @{outfit.participantInstagram}
        </div>
      )}
      
      <div className="outfit-handle">
        @{outfit.participantInstagram}
      </div>
    </div>
  );
}
import { useState } from 'react';

export default function VoteModal({ outfit, onClose, onSubmit }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);

    try {
      const result = await onSubmit(outfit.id, username.trim());
      
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Handle error (you might want to show an error message)
        console.error('Vote failed:', result.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Vote error:', error);
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (showSuccess) {
    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal-content">
          <div className="success-message">
            <div className="success-title">Thanks for voting!</div>
            <div className="success-subtitle">Your vote has been recorded</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        {/* Outfit Image */}
        <div className="modal-image-container">
          {!imageError ? (
            <img
              src={outfit.image}
              alt={`Outfit by @${outfit.participantInstagram}`}
              className="modal-outfit-image"
              onError={handleImageError}
            />
          ) : (
            <div className="modal-outfit-image modal-image-fallback">
              @{outfit.participantInstagram}
            </div>
          )}
          {/* <div className="modal-outfit-id">#{outfit.id}</div> */}
        </div>

        {/* Content with background */}
        <div className="modal-content-wrapper">
          <div className="modal-title">
            Vote for #{outfit.id} - @{outfit.participantInstagram}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Your IG Handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="vote-button"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? 'Voting...' : 'Vote'}
            </button>
          </form>

          <div className="disclaimer">
            YOUR VOTE DOESN'T COUNT IF YOU DON'T FOLLOW @WHAKANDMO
          </div>
        </div>
      </div>
    </div>
  );
}
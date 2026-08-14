import { useState } from 'react';
import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';
import { VOTE_PACKS } from '@/data/votePacks';

export default function VoteModal({ outfit, onClose, onSubmit, followHandle = '@survivalofthefittttest' }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);
  const { closing, requestClose } = useAnimatedClose(onClose);

  const handleName = followHandle.replace(/^@/, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      if (selectedPack) setError('Enter your IG handle');
      return;
    }

    setIsLoading(true);
    setError('');

    if (selectedPack) {
      if (!selectedPack.stripeUrl) {
        setError('Payment link coming soon');
        setIsLoading(false);
        return;
      }

      const url = new URL(selectedPack.stripeUrl);
      url.searchParams.set('outfitId', String(outfit.id));
      url.searchParams.set('username', username.trim());
      url.searchParams.set('votes', String(selectedPack.votes));
      window.location.href = url.toString();
      return;
    }

    try {
      const result = await onSubmit(outfit.id, username.trim());
      
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          requestClose();
        }, 1600);
      } else {
        setError(result.error || 'Vote failed');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Network error');
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      requestClose();
    }
  };

  if (showSuccess) {
    return (
      <div className={`modal-overlay${closing ? ' is-closing' : ''}`} onClick={handleOverlayClick}>
        <div className="modal-content vote-modal-content">
          <div className="success-message">
            <div className="success-title">Thanks for voting</div>
            <div className="success-subtitle">Your vote has been recorded</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`modal-overlay${closing ? ' is-closing' : ''}`} onClick={handleOverlayClick}>
      <div className="modal-content vote-modal-content">
        <div className="vote-modal-grabber" />
        <button type="button" className="vote-modal-close" onClick={requestClose} aria-label="Close">
          ×
        </button>

        <div className="modal-image-container">
          {!imageError ? (
            <SmoothImage
              src={outfit.image}
              alt={`Outfit by @${outfit.participantInstagram}`}
              className="modal-outfit-image"
              priority
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="modal-outfit-image modal-image-fallback">
              @{outfit.participantInstagram}
            </div>
          )}
        </div>

        <div className="modal-content-wrapper">
          <p className="vote-modal-kicker">Vote for</p>
          <div className="modal-title">
            @{outfit.participantInstagram}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                className="form-input"
                placeholder="Your IG handle"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div className="vote-packs">
              {VOTE_PACKS.map((pack) => {
                const active = selectedPack?.votes === pack.votes;
                return (
                  <button
                    key={pack.votes}
                    type="button"
                    className={`vote-pack ${active ? 'is-active' : ''}`}
                    onClick={() => setSelectedPack(active ? null : pack)}
                    disabled={isLoading}
                  >
                    <span className="vote-pack-count">{pack.votes}</span>
                    <span className="vote-pack-label">votes</span>
                  </button>
                );
              })}
            </div>

            {error && <div className="vote-modal-error">{error}</div>}

            <button
              type="submit"
              className="vote-button"
              disabled={isLoading || (!username.trim() && !selectedPack)}
            >
              {isLoading ? (selectedPack ? 'Redirecting…' : 'Voting…') : selectedPack ? 'Pay' : 'Vote'}
            </button>
          </form>

          <div className="disclaimer">
            Follow{' '}
            <a
              href={`https://www.instagram.com/${handleName}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{handleName}
            </a>{' '}
            for your vote to count
          </div>
        </div>
      </div>
    </div>
  );
}

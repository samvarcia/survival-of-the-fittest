import { useState, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';
import { VOTE_PACKS } from '@/data/votePacks';

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function VoteModal({ outfit, onClose, onSubmit, followHandle = '@survivalofthefittttest' }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState('');
  const [selectedPack, setSelectedPack] = useState(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef(null);
  const { closing, requestClose } = useAnimatedClose(onClose);

  const handleName = followHandle.replace(/^@/, '');

  const resetCaptcha = () => {
    setCaptchaToken('');
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      if (selectedPack) setError('Enter your IG handle');
      return;
    }

    if (!captchaToken) {
      setError('Complete the captcha');
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
      const result = await onSubmit(outfit.id, username.trim(), captchaToken);

      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => {
          requestClose();
        }, 2200);
      } else {
        setError(result.error || 'Vote failed');
        resetCaptcha();
        setIsLoading(false);
      }
    } catch {
      setError('Network error');
      resetCaptcha();
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
            <div className="success-title">Vote submitted</div>
            <div className="success-subtitle">
              Pending review — we&apos;ll approve once you follow @{handleName}
            </div>
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

            <div className="turnstile-wrap">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={setCaptchaToken}
                onExpire={() => setCaptchaToken('')}
                onError={() => setCaptchaToken('')}
                options={{ theme: 'light', size: 'normal' }}
              />
            </div>

            {error && <div className="vote-modal-error">{error}</div>}

            <button
              type="submit"
              className="vote-button"
              disabled={isLoading || (!username.trim() && !selectedPack) || !captchaToken}
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
            — all votes are manually approved
          </div>
        </div>
      </div>
    </div>
  );
}

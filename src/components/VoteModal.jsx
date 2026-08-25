import { useState, useRef, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';
import { VOTE_PACKS } from '@/data/votePacks';

const BUILD_TIME_SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim();

const SUCCESS_DISPLAY_MS = 5500;

const FREE_PACK = VOTE_PACKS.find((pack) => pack.price === 0) || VOTE_PACKS[0];

export default function VoteModal({ outfit, onClose, onSubmit, followHandle = '@survivalofthefittttest' }) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [error, setError] = useState('');
  const [selectedPack, setSelectedPack] = useState(FREE_PACK);
  const [captchaToken, setCaptchaToken] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(BUILD_TIME_SITE_KEY);
  const [turnstileConfigLoading, setTurnstileConfigLoading] = useState(!BUILD_TIME_SITE_KEY);
  const [turnstileLoadError, setTurnstileLoadError] = useState(false);
  const turnstileRef = useRef(null);
  const { closing, requestClose } = useAnimatedClose(onClose);

  useEffect(() => {
    if (BUILD_TIME_SITE_KEY) {
      return;
    }

    let cancelled = false;

    fetch('/api/turnstile/config', { signal: AbortSignal.timeout(8000) })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Turnstile config unavailable');
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) {
          return;
        }
        if (data?.siteKey) {
          setTurnstileSiteKey(String(data.siteKey).trim());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTurnstileLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTurnstileConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleName = followHandle.replace(/^@/, '');
  const isPaid = selectedPack?.price > 0;

  const resetCaptcha = () => {
    setCaptchaToken('');
    turnstileRef.current?.reset();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Enter your IG handle');
      return;
    }

    if (!captchaToken) {
      setError('Complete the captcha');
      return;
    }

    setIsLoading(true);
    setError('');

    if (isPaid) {
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
        }, SUCCESS_DISPLAY_MS);
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
            <div className="success-badge">Pending approval</div>
            <div className="success-title">Your vote was received</div>
            <p className="success-body">
              Every vote is reviewed by hand. Yours will only be approved if you follow{' '}
              <a
                href={`https://www.instagram.com/${handleName}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{handleName}
              </a>
              .
            </p>
            <p className="success-note">Follow now so your vote counts.</p>
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

            <p className="vote-packs-heading">Choose your votes</p>
            <div className="vote-packs">
              {VOTE_PACKS.map((pack) => {
                const active = selectedPack?.votes === pack.votes;
                return (
                  <button
                    key={pack.votes}
                    type="button"
                    className={`vote-pack ${active ? 'is-active' : ''}`}
                    onClick={() => setSelectedPack(pack)}
                    disabled={isLoading}
                  >
                    <span className="vote-pack-count">{pack.votes}</span>
                    <span className="vote-pack-label">
                      {pack.votes === 1 ? 'vote' : 'votes'}
                    </span>
                    <span className="vote-pack-price">{pack.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="turnstile-wrap">
              {turnstileConfigLoading ? (
                <div className="turnstile-loading">Loading captcha…</div>
              ) : turnstileSiteKey ? (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={turnstileSiteKey}
                  onSuccess={setCaptchaToken}
                  onExpire={() => {
                    setCaptchaToken('');
                    setTurnstileLoadError(false);
                  }}
                  onError={() => {
                    setCaptchaToken('');
                    setTurnstileLoadError(true);
                  }}
                  options={{
                    theme: 'light',
                    size: 'flexible',
                    action: 'vote',
                  }}
                />
              ) : turnstileLoadError ? (
                <div className="vote-modal-error">
                  Captcha failed to load. Disable content blockers and refresh.
                </div>
              ) : (
                <div className="vote-modal-error">Captcha not configured</div>
              )}
            </div>

            {turnstileLoadError && turnstileSiteKey && (
              <div className="vote-modal-error">
                Captcha failed to load. Disable content blockers and refresh.
              </div>
            )}

            {error && <div className="vote-modal-error">{error}</div>}

            <button
              type="submit"
              className="vote-button"
              disabled={isLoading || !username.trim() || !captchaToken}
            >
              {isLoading
                ? isPaid
                  ? 'Redirecting…'
                  : 'Voting…'
                : isPaid
                  ? `Pay ${selectedPack.label} · ${selectedPack.votes} votes`
                  : 'Cast 1 free vote'}
            </button>
          </form>

          <div className="disclaimer">
            You must follow{' '}
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

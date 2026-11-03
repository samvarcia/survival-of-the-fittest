'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import SmoothImage from '@/components/SmoothImage';
import useAnimatedClose from '@/hooks/useAnimatedClose';
import { VOTE_PACKS } from '@/data/votePacks';
import { getOutfitLabel } from '@/lib/outfit-label';

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
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const { closing, requestClose } = useAnimatedClose(onClose, 280);

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

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);

    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      touchAction: document.body.style.touchAction,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.touchAction = previous.touchAction;
      window.scrollTo(0, scrollY);
    };
  }, [requestClose]);

  const handleName = followHandle.replace(/^@/, '');
  const isPaid = selectedPack?.price > 0;

  const resetCaptcha = () => {
    setCaptchaToken('');
    turnstileRef.current?.reset();
  };

  const scrollInputIntoSheet = () => {
    const input = inputRef.current;
    const scroller = scrollRef.current;
    if (!input || !scroller) return;
    const inputRect = input.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const delta = inputRect.top - scrollerRect.top - 16;
    if (Math.abs(delta) > 8) {
      scroller.scrollBy({ top: delta, behavior: 'smooth' });
    }
  };

  const handleInputFocus = () => {
    // Keep focus scroll inside the sheet — don't yank the page behind it
    window.requestAnimationFrame(scrollInputIntoSheet);
    window.setTimeout(scrollInputIntoSheet, 280);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Enter your IG handle');
      inputRef.current?.focus();
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

      try {
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outfitId: outfit.id,
            username: username.trim(),
            votes: selectedPack.votes,
            captchaToken,
          }),
        });

        const data = await response.json();

        if (data.success && data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        setError(data.error || 'Checkout failed');
        resetCaptcha();
        setIsLoading(false);
      } catch {
        setError('Network error');
        resetCaptcha();
        setIsLoading(false);
      }
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

  if (typeof document === 'undefined') return null;

  const sheet = showSuccess ? (
    <div
      className={`modal-overlay vote-overlay${closing ? ' is-closing' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Vote received"
    >
      <div className="modal-content vote-modal-content vote-modal-success">
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
  ) : (
    <div
      className={`modal-overlay vote-overlay${closing ? ' is-closing' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Vote for ${getOutfitLabel(outfit)}`}
    >
      <div className="modal-content vote-modal-content">
        <div className="vote-modal-chrome">
          <div className="vote-modal-grabber" aria-hidden="true" />
          <button type="button" className="vote-modal-close" onClick={requestClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="vote-modal-scroll" ref={scrollRef}>
          <div className="modal-image-container">
            {!imageError ? (
              <SmoothImage
                src={outfit.image}
                alt={`Outfit ${getOutfitLabel(outfit)}`}
                className="modal-outfit-image"
                priority
                fade={false}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="modal-outfit-image modal-image-fallback">
                {getOutfitLabel(outfit)}
              </div>
            )}
          </div>

          <div className="modal-content-wrapper">
            <p className="vote-modal-kicker">Vote for</p>
            <div className="modal-title">{getOutfitLabel(outfit)}</div>

            <p className="vote-modal-must">
              YOU MUST FOLLOW{' '}
              <a
                href={`https://www.instagram.com/${handleName}/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{handleName.toUpperCase()}
              </a>{' '}
              FOR YOUR VOTE TO COUNT
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  ref={inputRef}
                  type="text"
                  className="form-input"
                  placeholder="Your IG handle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={handleInputFocus}
                  disabled={isLoading}
                  inputMode="text"
                  enterKeyHint="done"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  spellCheck={false}
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
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="theme-main vote-portal">{sheet}</div>,
    document.body,
  );
}

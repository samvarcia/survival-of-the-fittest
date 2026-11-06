'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import VoteModal from '@/components/VoteModal';
import Header from '@/components/Header';
import VoteWheel from '@/components/VoteWheel';
import { outfits } from '@/data/outfits';
import { getVotingTimeLeft } from '@/lib/voting-window';

export default function HomePage() {
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [votedFor, setVotedFor] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [votingClosed, setVotingClosed] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const { closed, label } = getVotingTimeLeft();
      setTimeLeft(label);
      setVotingClosed(closed);
      if (closed) {
        setSelectedOutfit(null);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVote = (outfit) => {
    if (votingClosed) return;
    setSelectedOutfit(outfit);
  };

  const handleVoteSubmit = async (outfitId, username, captchaToken) => {
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outfitId,
          username,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVotedFor(outfitId);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Vote submission failed:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const closeModal = () => {
    setSelectedOutfit(null);
  };

  useEffect(() => {
    document.documentElement.classList.add('theme-main-page');
    document.body.classList.add('theme-main-page');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute('content');
    themeMeta?.setAttribute('content', '#050505');
    return () => {
      document.documentElement.classList.remove('theme-main-page');
      document.body.classList.remove('theme-main-page');
      if (previousTheme) themeMeta?.setAttribute('content', previousTheme);
    };
  }, []);

  return (
    <div className="theme-main">
      <div className="party-flies" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="party-fly">
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="32" cy="34" rx="5" ry="8" fill="currentColor" />
              <path
                d="M32 28c-8-10-18-12-24-8 6 2 12 10 16 16"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                opacity="0.85"
              />
              <path
                d="M32 28c8-10 18-12 24-8-6 2-12 10-16 16"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="none"
                opacity="0.85"
              />
              <path d="M30 42l-3 8M34 42l3 8M28 38l-6 4M36 38l6 4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        ))}
      </div>

      <main className="main-page-layout">
        <div className="main-page-sidebar">
          <Header />

          <div className="main-page-lead">
            <div className="vote-section-title">VOTE FOR THE BEST FIT:</div>
            <p className="must">
              YOU MUST BE FOLLOWING{' '}
              <a
                href="https://www.instagram.com/survivalofthefittttest/"
                target="_blank"
                rel="noopener noreferrer"
              >
                @SURVIVALOFTHEFITTTEST
              </a>{' '}
              FOR YOUR VOTE TO COUNT
            </p>

            <div className={`timer-block${votingClosed ? ' is-closed' : ''}`}>
              <p className="timer-label">
                {votingClosed ? 'Voting ended' : 'Voting ends in'}
              </p>
              <div className="timer">
                {timeLeft}
              </div>
            </div>
          </div>

          <div className="main-page-foot">
            <div className="intro">
              <p>
                Survival of the Fittest Halloween — vote for the best fit. You must follow @survivalofthefittttest for your vote to count. Who will survive the night?
              </p>
            </div>

            <p className="winner-soon" role="status">
              The winner will be announced soon
            </p>
          </div>
        </div>

        <div className="main-page-carousel">
          {votingClosed ? (
            <div className="voting-closed-panel" role="status" aria-live="polite">
              <p className="voting-closed-message">
                Voting is closed, thanks for participating
              </p>
            </div>
          ) : (
            <VoteWheel
              outfits={outfits}
              onVote={handleVote}
              votedFor={votedFor}
            />
          )}

          <div className="partner-credit" aria-hidden="false">
            <img
              src="/housesofhorror-mark.png"
              alt="Houses of Horror"
              className="partner-credit-logo"
            />
          </div>
        </div>
      </main>

      {selectedOutfit && (
        <VoteModal
          outfit={selectedOutfit}
          onClose={closeModal}
          onSubmit={handleVoteSubmit}
        />
      )}
    </div>
  );
}
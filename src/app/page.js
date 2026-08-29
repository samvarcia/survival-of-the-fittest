'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import VoteModal from '@/components/VoteModal';
import Header from '@/components/Header';
import VoteWheel from '@/components/VoteWheel';
import RankingModal from '@/components/RankingModal';
import { outfits } from '@/data/outfits';
import { getVotingTimeLeft } from '@/lib/voting-window';

export default function HomePage() {
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [votedFor, setVotedFor] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [votingClosed, setVotingClosed] = useState(false);
  const [showRanking, setShowRanking] = useState(false);

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

  // Load initial stats
  useEffect(() => {
    loadStats();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stats', {
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
        // Reload stats immediately
        loadStats();
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
    themeMeta?.setAttribute('content', '#FFEDC5');
    return () => {
      document.documentElement.classList.remove('theme-main-page');
      document.body.classList.remove('theme-main-page');
      if (previousTheme) themeMeta?.setAttribute('content', previousTheme);
    };
  }, []);

  if (loading) {
    return (
      <div className="theme-main">
        <main className="main-page-layout">
          <div className="loading">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="theme-main">
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
                Survival of the Fittest exceeded all expectations — 150+ contestants, incredible fashion, unforgettable energy. Now, 26 finalists remain standing. You decide who takes home $1000. Only 48 hours. You must follow @survivalofthefittttest for your vote to count. Vote now. Who will survive?
              </p>
            </div>

            <button type="button" className="ranking-button" onClick={() => setShowRanking(true)}>
              🏆 RANKING
            </button>
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
        </div>
      </main>

      {showRanking && (
        <RankingModal
          stats={stats}
          outfits={outfits}
          onClose={() => setShowRanking(false)}
        />
      )}

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
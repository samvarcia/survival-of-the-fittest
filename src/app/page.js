'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import OutfitCard from '@/components/OutfitCard';
import VoteModal from '@/components/VoteModal';
import TopThree from '@/components/TopThree';
import { outfits } from '@/data/outfits';

export default function HomePage() {
  const [selectedOutfit, setSelectedOutfit] = useState(null);
  const [votedFor, setVotedFor] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Timer logic
  useEffect(() => {
    const updateTimer = () => {
      // End time: August 26, 2025 at noon NY time (more robust timezone handling)
      const endTime = new Date('2025-08-26T16:00:00.000Z'); // 12:00 PM EDT = 4:00 PM UTC
      const now = new Date();
      const difference = endTime.getTime() - now.getTime();

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('00:00:00');
        setIsExpired(true);
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
      const response = await fetch('/api/stats');
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
    if (votedFor) return; // Already voted
    setSelectedOutfit(outfit);
  };

  const handleVoteSubmit = async (outfitId, username) => {
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outfitId,
          username,
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

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Show expired state when timer hits zero
  if (isExpired) {
    return (
      <div className="container">
        <Image 
          src="https://v87ndduxgx.ufs.sh/f/ICfxMhSFP5GlcLdcXWQIFnWalKbj5yqv3GsEVpm91BixD6dk" 
          alt="SOTF" 
          className="logo-image"
          width={150}
          height={100}
          priority
        />
        
        <div className="timer">00:00:00</div>
        
        <div className="expired-message">
          <h2>See you in the next</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <Image 
        src="https://v87ndduxgx.ufs.sh/f/ICfxMhSFP5GlcLdcXWQIFnWalKbj5yqv3GsEVpm91BixD6dk" 
        alt="SOTF" 
        className="logo-image"
        width={150}
        height={100}
        priority
      />
       {/* Timer */}
       <div className="timer">
        {timeLeft}
      </div>
      <div className="intro">
        <p>
        Survival of the Fittest exceeded all expectations — 150+ contestants, incredible fashion, unforgettable energy. Now, 26 finalists remain standing. You decide who takes home $1000. Only 48 hours. You must follow @whakandmo for your vote to count. Vote now. Who will survive?
        </p>
        <Image 
          src="https://v87ndduxgx.ufs.sh/f/ICfxMhSFP5GlO7hgJ0LZKfS9sadLroeTAbYCBIQyMj32150G" 
          alt="Price Tag" 
          className="price-tag"
          width={90}
          height={90}
        />
      </div>

      {/* Top 3 */}
      <TopThree stats={stats} outfits={outfits} />
      {/* Vote Section Title */}

      <div className="vote-section-title">VOTE FOR THE BEST FIT:</div>
      <p className='must'>
        YOU MUST BE FOLLOWING{' '}
        <a 
          href="https://www.instagram.com/whakandmo/" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          @WHAKANDMO
        </a>{' '}
        FOR YOUR VOTE TO COUNT
      </p>

      {/* Outfits Grid */}
      <div className="outfits-grid">
        {outfits.map((outfit) => (
          <OutfitCard
            key={outfit.id}
            outfit={outfit}
            onVote={handleVote}
            hasVoted={votedFor === outfit.id}
          />
        ))}
      </div>

      <div className="vote-section-title">THANK YOU FOR PARTICIPATING</div>


      {/* Vote Modal */}
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
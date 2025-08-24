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
      
      <div className="intro">
        <p>
        Survival of the Fittest exceeded all expectations — 150+ contestants, incredible fashion, unforgettable energy. Now, 24 finalists remain standing. You decide who takes home $1000. Only 48 hours. You must follow @whakandmo for your vote to count. Vote now. Who will survive?
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
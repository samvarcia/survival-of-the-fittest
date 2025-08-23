'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { outfits } from '@/data/outfits';

export default function AdminDashboard() {
  const [stats, setStats] = useState([]);
  const [pendingVotes, setPendingVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [processingVotes, setProcessingVotes] = useState(new Set());

  const loadData = useCallback(async () => {
    await Promise.all([loadStats(), loadPendingVotes()]);
  }, [adminPassword]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadData]);

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

  const loadPendingVotes = async () => {
    try {
      const response = await fetch('/api/approve', {
        headers: {
          'Authorization': `Bearer ${adminPassword}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPendingVotes(data.votes);
        }
      }
    } catch (error) {
      console.error('Failed to load pending votes:', error);
    }
  };

  const handleAuth = (e) => {
    e.preventDefault();
    setIsAuthenticated(true);
    loadData();
  };

  const handleVoteAction = async (voteId, action) => {
    if (processingVotes.has(voteId)) return;
    
    setProcessingVotes(prev => new Set([...prev, voteId]));
    
    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPassword}`
        },
        body: JSON.stringify({ action, voteId })
      });

      if (response.ok) {
        await loadData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to process vote:', error);
    } finally {
      setProcessingVotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(voteId);
        return newSet;
      });
    }
  };

  const getOutfitByParticipant = (username) => {
    return outfits.find(outfit => outfit.participantInstagram === username);
  };

  const sortedStats = [...stats].sort((a, b) => b.votes - a.votes);
  const totalVotes = stats.reduce((sum, stat) => sum + stat.votes, 0);

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="logo">Admin Dashboard</div>
        
        <form onSubmit={handleAuth} style={{ maxWidth: '300px', margin: '40px auto' }}>
          <div className="form-group">
            <input
              type="password"
              className="form-input"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="vote-button">
            Login
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="logo">Admin Dashboard</div>
      
      {/* Summary */}
      <div style={{ 
        background: 'var(--gray)', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          {totalVotes}
        </div>
        <div style={{ color: 'var(--dark-gray)' }}>
          Total Votes • {pendingVotes.length} Pending
        </div>
      </div>

      {/* Pending Votes */}
      {pendingVotes.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Pending Approval ({pendingVotes.length})
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingVotes.map((vote) => {
              const outfit = outfits.find(o => o.id === vote.outfitId);
              const isProcessing = processingVotes.has(vote.id);
              
              return (
                <div key={vote.id} style={{
                  background: 'var(--white)',
                  border: '1px solid var(--light-gray)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      @{vote.username}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                      Voting for @{outfit?.participantInstagram}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleVoteAction(vote.id, 'approve')}
                      disabled={isProcessing}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--yellow)',
                        color: 'var(--black)',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        opacity: isProcessing ? 0.5 : 1
                      }}
                    >
                      {isProcessing ? '...' : 'Approve'}
                    </button>
                    
                    <button
                      onClick={() => handleVoteAction(vote.id, 'reject')}
                      disabled={isProcessing}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--light-gray)',
                        color: 'var(--dark-gray)',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        opacity: isProcessing ? 0.5 : 1
                      }}
                    >
                      {isProcessing ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Results */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Live Results
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedStats.map((stat, index) => {
            const outfit = outfits.find(o => o.id === stat.outfitId);
            const percentage = totalVotes > 0 ? Math.round((stat.votes / totalVotes) * 100) : 0;
            
            return (
              <div key={stat.outfitId} style={{
                background: 'var(--white)',
                border: '1px solid var(--light-gray)',
                borderRadius: '8px',
                padding: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Progress bar background */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: `${percentage}%`,
                  background: index === 0 ? 'var(--yellow)' : 'var(--gray)',
                  opacity: 0.2,
                  transition: 'width 0.3s ease'
                }} />
                
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      #{index + 1} @{outfit?.participantInstagram}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                      {outfit?.title}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      {stat.votes}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                      {percentage}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Back to voting */}
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <Link href="/" style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: 'var(--gray)',
          color: 'var(--black)',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          ← Back to Voting
        </Link>
      </div>
    </div>
  );
}
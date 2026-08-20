'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { outfits } from '@/data/outfits';

function formatVoteTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState([]);
  const [pendingVotes, setPendingVotes] = useState([]);
  const [approvedVotes, setApprovedVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [processingVotes, setProcessingVotes] = useState(new Set());
  const [authError, setAuthError] = useState('');
  const [voteFilter, setVoteFilter] = useState('all');

  const loadStats = useCallback(async () => {
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
    }
  }, []);

  const loadVotes = useCallback(async () => {
    try {
      const response = await fetch('/api/approve', {
        headers: {
          Authorization: `Bearer ${adminPassword}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPendingVotes(data.pending || data.votes || []);
          setApprovedVotes(data.approved || []);
        }
      }
    } catch (error) {
      console.error('Failed to load votes:', error);
    }
  }, [adminPassword]);

  const loadData = useCallback(async () => {
    await Promise.all([loadStats(), loadVotes()]);
    setLoading(false);
  }, [loadStats, loadVotes]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadData]);

  const handleAuth = (e) => {
    e.preventDefault();
    setAuthError('');

    if (adminPassword === 'YVL') {
      setIsAuthenticated(true);
      loadData();
    } else {
      setAuthError('Invalid password');
      setAdminPassword('');
    }
  };

  const handleVoteAction = async (voteId, action) => {
    if (processingVotes.has(voteId)) return;

    setProcessingVotes((prev) => new Set([...prev, voteId]));

    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminPassword}`,
        },
        body: JSON.stringify({ action, voteId }),
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to process vote:', error);
    } finally {
      setProcessingVotes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(voteId);
        return newSet;
      });
    }
  };

  const getParticipant = (outfitId) => {
    const outfit = outfits.find((o) => o.id === outfitId);
    return outfit?.participantInstagram || 'unknown';
  };

  const sortedStats = [...stats].sort((a, b) => b.votes - a.votes);
  const totalVotes = stats.reduce((sum, stat) => sum + stat.votes, 0);

  const sortedApproved = [...approvedVotes].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );
  const sortedPending = [...pendingVotes].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );

  const allVotes = [
    ...sortedPending.map((v) => ({ ...v, status: 'pending' })),
    ...sortedApproved.map((v) => ({ ...v, status: 'approved' })),
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const filteredVotes =
    voteFilter === 'pending'
      ? allVotes.filter((v) => v.status === 'pending')
      : voteFilter === 'approved'
        ? allVotes.filter((v) => v.status === 'approved')
        : allVotes;

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
            {authError && (
              <div
                style={{
                  color: 'red',
                  fontSize: '12px',
                  marginTop: '8px',
                  textAlign: 'center',
                }}
              >
                {authError}
              </div>
            )}
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

      <div
        style={{
          background: 'var(--gray)',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          {totalVotes}
        </div>
        <div style={{ color: 'var(--dark-gray)' }}>
          Approved Votes • {pendingVotes.length} Pending • {approvedVotes.length} in log
        </div>
      </div>

      {/* Vote log */}
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            Vote Log ({filteredVotes.length})
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'pending', 'approved'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setVoteFilter(filter)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--light-gray)',
                  borderRadius: '999px',
                  background: voteFilter === filter ? 'var(--yellow)' : 'var(--white)',
                  fontSize: '12px',
                  fontWeight: voteFilter === filter ? '600' : '400',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {filteredVotes.length === 0 ? (
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--light-gray)',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              color: 'var(--dark-gray)',
              fontSize: '14px',
            }}
          >
            No votes yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredVotes.map((vote) => {
              const isProcessing = processingVotes.has(vote.id);
              const participant = getParticipant(vote.outfitId);

              return (
                <div
                  key={vote.id}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--light-gray)',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      @{vote.username}
                      <span style={{ color: 'var(--dark-gray)', fontWeight: '400' }}> → </span>
                      @{participant}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>
                      {formatVoteTime(vote.timestamp)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '4px 8px',
                        borderRadius: '999px',
                        background:
                          vote.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(76, 175, 80, 0.15)',
                        color: vote.status === 'pending' ? '#856404' : '#2e7d32',
                      }}
                    >
                      {vote.status}
                    </span>

                    {vote.status === 'pending' && (
                      <>
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
                            opacity: isProcessing ? 0.5 : 1,
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
                            opacity: isProcessing ? 0.5 : 1,
                          }}
                        >
                          {isProcessing ? '...' : 'Reject'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Results */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Live Results
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedStats.map((stat, index) => {
            const outfit = outfits.find((o) => o.id === stat.outfitId);
            const percentage = totalVotes > 0 ? Math.round((stat.votes / totalVotes) * 100) : 0;
            const votersForOutfit = sortedApproved
              .filter((v) => v.outfitId === stat.outfitId)
              .map((v) => `@${v.username}`);

            return (
              <div
                key={stat.outfitId}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--light-gray)',
                  borderRadius: '8px',
                  padding: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${percentage}%`,
                    background: index === 0 ? 'var(--yellow)' : 'var(--gray)',
                    opacity: 0.2,
                    transition: 'width 0.3s ease',
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      #{index + 1} @{outfit?.participantInstagram}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--dark-gray)', marginBottom: '8px' }}>
                      {outfit?.title}
                    </div>
                    {votersForOutfit.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--dark-gray)', lineHeight: 1.5 }}>
                        {votersForOutfit.join(', ')}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stat.votes}</div>
                    <div style={{ fontSize: '12px', color: 'var(--dark-gray)' }}>{percentage}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'var(--gray)',
            color: 'var(--black)',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          ← Back to Voting
        </Link>
      </div>
    </div>
  );
}

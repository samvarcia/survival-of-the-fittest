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

function ChevronIcon({ open = false }) {
  return (
    <svg
      className={`dash-chevron${open ? ' is-open' : ''}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 9.5 12 15l5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapsibleSection({ id, title, meta, badge, defaultOpen = false, open, onToggle, children }) {
  const isOpen = open ?? defaultOpen;

  return (
    <section className="dash-section">
      <button
        type="button"
        className="dash-section-header"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        <div>
          <div className="dash-section-title">
            {title}
            {badge != null && ` (${badge})`}
          </div>
          {meta && <div className="dash-section-meta">{meta}</div>}
        </div>
        <ChevronIcon open={isOpen} />
      </button>
      {isOpen && <div className="dash-section-body">{children}</div>}
    </section>
  );
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
  const [openSections, setOpenSections] = useState(() => new Set(['pending', 'log', 'results']));
  const [expandedOutfits, setExpandedOutfits] = useState(() => new Set());

  const toggleSection = (id) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleOutfit = (outfitId) => {
    setExpandedOutfits((prev) => {
      const next = new Set(prev);
      if (next.has(outfitId)) next.delete(outfitId);
      else next.add(outfitId);
      return next;
    });
  };

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadVotes = useCallback(async () => {
    try {
      const response = await fetch('/api/approve', {
        headers: { Authorization: `Bearer ${adminPassword}` },
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

  useEffect(() => {
    if (pendingVotes.length > 0) {
      setOpenSections((prev) => new Set([...prev, 'pending']));
    }
  }, [pendingVotes.length]);

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

      if (response.ok) await loadData();
    } catch (error) {
      console.error('Failed to process vote:', error);
    } finally {
      setProcessingVotes((prev) => {
        const next = new Set(prev);
        next.delete(voteId);
        return next;
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
              <div style={{ color: 'red', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
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

      <div className="dash-summary">
        <div className="dash-summary-stat">
          <div className="dash-summary-value">{totalVotes}</div>
          <div className="dash-summary-label">Approved</div>
        </div>
        <div className="dash-summary-stat">
          <div className="dash-summary-value">{pendingVotes.length}</div>
          <div className="dash-summary-label">Pending</div>
        </div>
        <div className="dash-summary-stat">
          <div className="dash-summary-value">{allVotes.length}</div>
          <div className="dash-summary-label">Total</div>
        </div>
      </div>

      <CollapsibleSection
        id="log"
        title="Vote log"
        badge={filteredVotes.length}
        open={openSections.has('log')}
        onToggle={toggleSection}
      >
        <div className="dash-filters">
          {['all', 'pending', 'approved'].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`dash-filter-btn${voteFilter === filter ? ' is-active' : ''}`}
              onClick={() => setVoteFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {filteredVotes.length === 0 ? (
          <div className="dash-empty">No votes yet</div>
        ) : (
          filteredVotes.map((vote) => {
            const participant = getParticipant(vote.outfitId);
            return (
              <div key={vote.id} className="dash-row">
                <div className="dash-row-main">
                  <div className="dash-row-title">
                    @{vote.username} → @{participant}
                  </div>
                  <div className="dash-row-sub">{formatVoteTime(vote.timestamp)}</div>
                </div>
                <span
                  className={`dash-badge ${
                    vote.status === 'pending' ? 'dash-badge-pending' : 'dash-badge-approved'
                  }`}
                >
                  {vote.status}
                </span>
              </div>
            );
          })
        )}
      </CollapsibleSection>

      {pendingVotes.length > 0 && (
        <CollapsibleSection
          id="pending"
          title="Pending approval"
          badge={pendingVotes.length}
          open={openSections.has('pending')}
          onToggle={toggleSection}
        >
          {sortedPending.map((vote) => {
            const isProcessing = processingVotes.has(vote.id);
            const participant = getParticipant(vote.outfitId);

            return (
              <div key={vote.id} className="dash-row">
                <div className="dash-row-main">
                  <div className="dash-row-title">
                    @{vote.username} → @{participant}
                  </div>
                  <div className="dash-row-sub">{formatVoteTime(vote.timestamp)}</div>
                </div>
                <div className="dash-actions">
                  <button
                    type="button"
                    className="dash-btn dash-btn-approve"
                    onClick={() => handleVoteAction(vote.id, 'approve')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    className="dash-btn dash-btn-reject"
                    onClick={() => handleVoteAction(vote.id, 'reject')}
                    disabled={isProcessing}
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      <CollapsibleSection
        id="results"
        title="Live results"
        badge={outfits.length}
        open={openSections.has('results')}
        onToggle={toggleSection}
      >
        {sortedStats.map((stat, index) => {
          const outfit = outfits.find((o) => o.id === stat.outfitId);
          const percentage = totalVotes > 0 ? Math.round((stat.votes / totalVotes) * 100) : 0;
          const votersForOutfit = sortedApproved
            .filter((v) => v.outfitId === stat.outfitId)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          const isExpanded = expandedOutfits.has(stat.outfitId);

          return (
            <div key={stat.outfitId}>
              <button
                type="button"
                className={`dash-result-header${index === 0 && stat.votes > 0 ? ' is-leader' : ''}`}
                onClick={() => toggleOutfit(stat.outfitId)}
                aria-expanded={isExpanded}
              >
                <span className="dash-result-rank">#{index + 1}</span>
                <div className="dash-result-info">
                  <div className="dash-result-name">@{outfit?.participantInstagram}</div>
                </div>
                <div className="dash-result-count">
                  <div className="dash-result-votes">{stat.votes}</div>
                  <div className="dash-result-pct">{percentage}%</div>
                </div>
                <ChevronIcon open={isExpanded} />
              </button>

              {isExpanded && votersForOutfit.length > 0 && (
                <div className="dash-voter-list">
                  {votersForOutfit.map((vote) => (
                    <div key={vote.id} className="dash-voter-item">
                      <strong>@{vote.username}</strong>
                      <span>{formatVoteTime(vote.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CollapsibleSection>

      <div className="dash-back-wrap">
        <Link href="/" className="dash-back-link">
          ← Back to Voting
        </Link>
      </div>
    </div>
  );
}

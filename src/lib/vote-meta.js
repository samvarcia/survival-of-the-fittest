export function isPaidVote(vote) {
  if (!vote) return false;
  return vote.voteType === 'paid' || Number(vote.amount) > 0;
}

export function getVoteCount(vote) {
  const count = Number(vote?.voteCount);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

export function getVoteTypeBadge(vote) {
  if (isPaidVote(vote)) {
    const count = getVoteCount(vote);
    const amount = Number(vote.amount);
    const currency = vote.currency || 'CAD';
    const amountLabel =
      Number.isFinite(amount) && amount > 0
        ? currency === 'CAD'
          ? `CA$${amount}`
          : `$${amount}`
        : null;

    return {
      className: 'dash-badge-paid',
      label: amountLabel
        ? `Paid · ${count} vote${count === 1 ? '' : 's'} · ${amountLabel}`
        : `Paid · ${count} vote${count === 1 ? '' : 's'}`,
    };
  }

  return {
    className: 'dash-badge-free',
    label: 'Free',
  };
}

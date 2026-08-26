const VOTING_TIME_ZONE = 'America/Toronto';
/** Local wall time in Toronto: Friday Aug 28, 2026 at 12:00. */
const VOTING_END_LOCAL = {
  year: 2026,
  month: 8, // August
  day: 28,
  hour: 12,
  minute: 0,
  second: 0,
};

/**
 * Convert a Toronto local date/time to a UTC Date.
 */
function torontoLocalToUtc({ year, month, day, hour, minute, second }) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: VOTING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  // Start with a UTC guess (Toronto is UTC-4 in late August).
  let utcMs = Date.UTC(year, month - 1, day, hour + 4, minute, second);

  for (let i = 0; i < 4; i += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(utcMs))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );

    const asIfUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
    utcMs += wanted - asIfUtc;
  }

  return new Date(utcMs);
}

export function getVotingEndTime() {
  return torontoLocalToUtc(VOTING_END_LOCAL);
}

export function isVotingOpen(now = new Date()) {
  return now.getTime() < getVotingEndTime().getTime();
}

export function getVotingTimeLeft(now = new Date()) {
  const difference = getVotingEndTime().getTime() - now.getTime();

  if (difference <= 0) {
    return { closed: true, label: '0:00:00' };
  }

  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    closed: false,
    label: `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
}

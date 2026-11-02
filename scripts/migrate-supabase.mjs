import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import postgres from 'postgres';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) {
  console.error('Missing POSTGRES_URL_NON_POOLING / POSTGRES_URL');
  process.exit(1);
}

const sql = postgres(url, { ssl: 'require', max: 1 });

await sql`
  create table if not exists parties (
    id text primary key,
    name text not null,
    status text not null default 'active' check (status in ('active', 'archived')),
    voting_end_at timestamptz,
    intro text,
    ranking_label text default 'RANKING',
    outfits jsonb not null default '[]'::jsonb,
    notes text,
    created_at timestamptz not null default now(),
    archived_at timestamptz
  )
`;

await sql`
  create unique index if not exists parties_one_active
  on parties (status)
  where status = 'active'
`;

await sql`
  create table if not exists votes (
    id text primary key,
    party_id text not null references parties(id) on delete cascade,
    outfit_id integer not null,
    username text not null,
    timestamp bigint not null,
    approved boolean not null default false,
    verified boolean not null default false,
    vote_type text not null default 'free',
    vote_count integer not null default 1,
    amount numeric not null default 0,
    currency text default 'CAD',
    stripe_session_id text,
    created_at timestamptz not null default now()
  )
`;

await sql`create index if not exists votes_party_id_idx on votes(party_id)`;
await sql`create index if not exists votes_party_approved_idx on votes(party_id, approved)`;
await sql`
  create unique index if not exists votes_one_free_per_user
  on votes(party_id, username)
  where vote_type = 'free'
`;

await sql`
  create table if not exists vote_stats (
    party_id text not null references parties(id) on delete cascade,
    outfit_id integer not null,
    votes integer not null default 0,
    primary key (party_id, outfit_id)
  )
`;

await sql`
  create table if not exists checkout_pending (
    reference_id text primary key,
    party_id text not null references parties(id) on delete cascade,
    outfit_id integer not null,
    username text not null,
    vote_count integer not null,
    amount numeric not null,
    currency text default 'CAD',
    stripe_url text,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
  )
`;

await sql`
  create table if not exists stripe_processed (
    session_id text primary key,
    processed_at timestamptz not null default now()
  )
`;

const existingActive = await sql`
  select id from parties where status = 'active' limit 1
`;

if (existingActive.length === 0) {
  const archivedId = 'finals-2026-08';
  const activeId = 'party-2026-11';
  const outfitsModule = await import(
    pathToFileURL(path.join(process.cwd(), 'src/data/outfits.js')).href
  );
  const outfitSnapshot = outfitsModule.outfits || [];

  await sql`
    insert into parties (id, name, status, voting_end_at, intro, ranking_label, outfits, notes, archived_at)
    values (
      ${archivedId},
      ${'Finals — August 2026'},
      ${'archived'},
      ${'2026-08-29T16:00:00.000Z'},
      ${'Survival of the Fittest exceeded all expectations — 150+ contestants, incredible fashion, unforgettable energy. Now, 26 finalists remain standing. You decide who takes home $1000. Only 48 hours. You must follow @survivalofthefittttest for your vote to count. Vote now. Who will survive?'},
      ${'FINALS'},
      ${sql.json(outfitSnapshot)},
      ${'Votes from Upstash Redis could not be imported — database account was suspended at reactivation.'},
      ${new Date().toISOString()}
    )
    on conflict (id) do nothing
  `;

  await sql`
    insert into parties (id, name, status, voting_end_at, intro, ranking_label, outfits, notes)
    values (
      ${activeId},
      ${'November 2026'},
      ${'active'},
      ${'2026-11-09T17:00:00.000Z'},
      ${'Survival of the Fittest is back. Vote for the best fit — you must follow @survivalofthefittttest for your vote to count. Who will survive?'},
      ${'RANKING'},
      ${sql.json(outfitSnapshot)},
      ${'Fresh party on Supabase. Update contestants in src/data/outfits.js when ready.'}
    )
    on conflict (id) do nothing
  `;

  console.log('Seeded archived finals shell + active November 2026 party');
} else {
  console.log('Active party already exists:', existingActive[0].id);
}

await sql.end();
console.log('Supabase schema ready');

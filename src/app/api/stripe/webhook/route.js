import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { submitVote } from '@/lib/db-upstash';
import { isRedisConfigured } from '@/lib/redis-config';
import { packAmountInCents } from '@/lib/vote-packs';
import { VOTE_PACKS } from '@/data/votePacks';
import {
  claimStripeSession,
  deletePendingCheckout,
  getPendingCheckout,
} from '@/lib/stripe-pending';

export const runtime = 'nodejs';

function findPackByAmount(amountTotal, currency) {
  const normalizedCurrency = String(currency || '').toLowerCase();
  if (normalizedCurrency !== 'cad') return null;

  return VOTE_PACKS.find(
    (pack) => pack.price > 0 && packAmountInCents(pack) === amountTotal,
  );
}

async function handleCheckoutCompleted(session) {
  if (session.payment_status !== 'paid') {
    return { handled: false, reason: 'payment_not_paid' };
  }

  const sessionId = session.id;
  const claimed = await claimStripeSession(sessionId);
  if (!claimed) {
    return { handled: true, reason: 'already_processed' };
  }

  const referenceId = session.client_reference_id;
  const pending = referenceId ? await getPendingCheckout(referenceId) : null;

  if (!pending) {
    console.error('Stripe webhook: no pending checkout for session', sessionId, referenceId);
    return { handled: false, reason: 'pending_checkout_missing' };
  }

  const pack = findPackByAmount(session.amount_total, session.currency);
  if (!pack || pack.votes !== pending.voteCount) {
    console.error('Stripe webhook: amount mismatch', {
      sessionId,
      amountTotal: session.amount_total,
      expectedVotes: pending.voteCount,
    });
    return { handled: false, reason: 'amount_mismatch' };
  }

  try {
    const vote = await submitVote(pending.outfitId, pending.username, {
      voteType: 'paid',
      voteCount: pending.voteCount,
      amount: pending.amount,
      currency: pending.currency || 'CAD',
      stripeSessionId: sessionId,
    });

    await deletePendingCheckout(referenceId);

    return { handled: true, reason: 'vote_created', voteId: vote.id };
  } catch (error) {
    if (error.message === 'User has already voted') {
      await deletePendingCheckout(referenceId);
      return { handled: true, reason: 'user_already_voted' };
    }
    throw error;
  }
}

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  if (!isRedisConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const result = await handleCheckoutCompleted(event.data.object);
      console.log('Stripe checkout.session.completed:', result);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

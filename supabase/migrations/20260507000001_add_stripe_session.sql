-- Add Stripe session ID to purchases for idempotent upsert
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE;

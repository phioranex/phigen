-- Remove Stripe subscription ID, add unique index on Razorpay subscription ID

ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "stripeSubId";

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_razorpaySubId_key" ON "Subscription"("razorpaySubId");

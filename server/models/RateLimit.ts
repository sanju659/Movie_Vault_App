import { Schema, model, models, type Model } from "mongoose";

type RateLimitDoc = { _id: string; count: number; expiresAt: Date };

const rateLimitSchema = new Schema<RateLimitDoc>(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// MongoDB deletes expired counters by itself
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<RateLimitDoc> =
  (models.RateLimit as Model<RateLimitDoc>) ??
  model<RateLimitDoc>("RateLimit", rateLimitSchema);

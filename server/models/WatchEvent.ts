import { Schema, model, models, type Model, type Types } from "mongoose";

export type WatchEventDoc = {
  userId: Types.ObjectId;
  tmdbId: number;
  mediaType: "movie" | "tv";
  watchedOn: string; // "YYYY-MM-DD", the user's own calendar date
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
export type WatchEventLean = WatchEventDoc & { _id: Types.ObjectId };

const watchEventSchema = new Schema<WatchEventDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tmdbId: { type: Number, required: true },
    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      default: "movie",
      required: true,
    },
    watchedOn: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    notes: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true },
);

// Timeline, newest first
watchEventSchema.index({ userId: 1, watchedOn: -1 });
// All viewings of one title
watchEventSchema.index({ userId: 1, tmdbId: 1, watchedOn: -1 });

export const WatchEvent: Model<WatchEventDoc> =
  (models.WatchEvent as Model<WatchEventDoc>) ??
  model<WatchEventDoc>("WatchEvent", watchEventSchema);

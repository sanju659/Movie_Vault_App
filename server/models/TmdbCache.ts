import { Schema, model, models, type Model } from "mongoose";

type TmdbCacheDoc = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  data: unknown;
  fetchedAt: Date;
};

const tmdbCacheSchema = new Schema<TmdbCacheDoc>({
  tmdbId: { type: Number, required: true },
  mediaType: {
    type: String,
    enum: ["movie", "tv"],
    default: "movie",
    required: true,
  },
  data: { type: Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, required: true },
});

tmdbCacheSchema.index({ mediaType: 1, tmdbId: 1 }, { unique: true });

export const TmdbCache: Model<TmdbCacheDoc> =
  (models.TmdbCache as Model<TmdbCacheDoc>) ??
  model<TmdbCacheDoc>("TmdbCache", tmdbCacheSchema);

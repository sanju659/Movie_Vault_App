import { Schema, model, models, type Model } from "mongoose";

const tmdbCacheSchema = new Schema({
  tmdbId: { type: Number, required: true },
  mediaType: {
    type: String,
    enum: ["movie", "tv"],
    default: "movie",
    required: true,
  },
  data: { type: Schema.Types.Mixed, required: true }, // trimmed details + credits, no user data
  fetchedAt: { type: Date, required: true },
});
tmdbCacheSchema.index({ mediaType: 1, tmdbId: 1 }, { unique: true });

export const TmdbCache: Model<any> =
  (models.TmdbCache as Model<any>) ?? model("TmdbCache", tmdbCacheSchema);

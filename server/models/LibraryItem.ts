import { Schema, model, models, type Model, type Types } from "mongoose";
import { LIBRARY_STATUSES, type LibraryStatus } from "@/lib/library-types";

export type LibraryItemDoc = {
  userId: Types.ObjectId;
  tmdbId: number;
  mediaType: "movie" | "tv";
  status: LibraryStatus;
  personalRating: number | null;
  snapshot: {
    title: string;
    posterPath: string | null;
    releaseDate: string | null;
    runtimeMinutes: number | null;
    genreIds: number[];
    snapshotAt: Date;
  };
  addedAt: Date;
  updatedAt: Date;
};

const snapshotSchema = new Schema(
  {
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    releaseDate: { type: String, default: null },
    runtimeMinutes: { type: Number, default: null },
    genreIds: { type: [Number], default: [] },
    snapshotAt: { type: Date, required: true },
  },
  { _id: false },
);

const librarySchema = new Schema<LibraryItemDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tmdbId: { type: Number, required: true },
    mediaType: {
      type: String,
      enum: ["movie", "tv"],
      default: "movie",
      required: true,
    },
    status: { type: String, enum: LIBRARY_STATUSES, required: true },
    personalRating: {
      type: Number,
      default: null,
      min: 1,
      max: 10,
      validate: {
        validator: (v: number | null) => v === null || Number.isInteger(v),
        message: "Rating must be a whole number from 1 to 10",
      },
    },
    snapshot: { type: snapshotSchema, required: true },
  },
  { timestamps: { createdAt: "addedAt", updatedAt: "updatedAt" } },
);

// One library item per user per title
librarySchema.index({ userId: 1, mediaType: 1, tmdbId: 1 }, { unique: true });
// Tabs: "show my watchlist, newest first"
librarySchema.index({ userId: 1, status: 1, addedAt: -1 });
// Search/sort by title inside the library
librarySchema.index({ userId: 1, "snapshot.title": 1 });

export const LibraryItem: Model<LibraryItemDoc> =
  (models.LibraryItem as Model<LibraryItemDoc>) ??
  model<LibraryItemDoc>("LibraryItem", librarySchema);

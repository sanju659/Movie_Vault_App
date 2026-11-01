import "server-only";
import { getEnv } from "@/server/env";
import { connectDb } from "@/server/db";
import { TmdbCache } from "@/server/models/TmdbCache";
import type {
  MovieDetails,
  MovieSummary,
  SearchResult,
} from "@/lib/movie-types";
import { TmdbError, tmdbFetch } from "./client";
import {
  mapDetails,
  mapSummary,
  type RawList,
  type RawDetails,
} from "./mappers";

const HOUR = 60 * 60;

async function list(path: string): Promise<MovieSummary[]> {
  const raw = await tmdbFetch<RawList>(
    path,
    { language: "en-US", page: 1 },
    { revalidate: HOUR },
  );
  return (raw.results ?? []).map(mapSummary);
}

export const getTrending = () => list("/trending/movie/week");
export const getPopular = () => list("/movie/popular");
export const getTopRated = () => list("/movie/top_rated");
export const getUpcoming = () => list("/movie/upcoming");

export async function searchMovies(
  query: string,
  page: number,
): Promise<SearchResult> {
  const raw = await tmdbFetch<RawList>("/search/movie", {
    query,
    page,
    include_adult: false,
    language: "en-US",
  });
  return {
    results: (raw.results ?? []).map(mapSummary),
    page: raw.page ?? page,
    totalPages: Math.min(raw.total_pages ?? 1, 500), // TMDB caps pages at 500
    totalResults: raw.total_results ?? 0,
  };
}

export async function getMovieDetails(tmdbId: number): Promise<MovieDetails> {
  await connectDb();
  const cached = await TmdbCache.findOne({ mediaType: "movie", tmdbId }).lean();
  const maxAgeMs = getEnv().TMDB_DETAILS_TTL_DAYS * 24 * 60 * 60 * 1000;

  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < maxAgeMs) {
    return cached.data as MovieDetails;
  }

  try {
    const raw = await tmdbFetch<RawDetails>(`/movie/${tmdbId}`, {
      append_to_response: "credits",
      language: "en-US",
    });
    const data = mapDetails(raw);
    try {
      await TmdbCache.updateOne(
        { mediaType: "movie", tmdbId },
        { $set: { data, fetchedAt: new Date() } },
        { upsert: true },
      );
    } catch (err) {
      console.error("TMDB cache write failed:", err); // non-critical (e.g. concurrent upsert)
    }
    return data;
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) throw err;
    if (cached) return cached.data as MovieDetails; // TMDB down: serve the stale copy
    throw err;
  }
}

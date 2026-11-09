import "server-only";
import { getEnv } from "@/server/env";
import { connectDb } from "@/server/db";
import { TmdbCache } from "@/server/models/TmdbCache";
import type {
  MovieDetails,
  MovieSummary,
  PersonDetails,
  PersonSearchResult,
  SearchResult,
} from "@/lib/movie-types";
import type { DiscoverSort } from "@/lib/search";
import { TmdbError, tmdbFetch } from "./client";
import {
  mapDetails,
  mapPersonDetails,
  mapPersonSummary,
  mapSummary,
  type RawDetails,
  type RawList,
  type RawPersonDetails,
  type RawPersonList,
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

function toSearchResult(raw: RawList, page: number): SearchResult {
  return {
    results: (raw.results ?? []).map(mapSummary),
    page: raw.page ?? page,
    totalPages: Math.min(raw.total_pages ?? 1, 500), // TMDB caps pages at 500
    totalResults: raw.total_results ?? 0,
  };
}

export async function searchMovies(
  query: string,
  page: number,
  year?: number,
): Promise<SearchResult> {
  const raw = await tmdbFetch<RawList>("/search/movie", {
    query,
    page,
    include_adult: false,
    language: "en-US",
    primary_release_year: year, // undefined is skipped by tmdbFetch
  });
  return toSearchResult(raw, page);
}

export type DiscoverFilters = {
  genre?: number;
  year?: number;
  minRating?: number; // TMDB community rating, 1-10
  language?: string;
  sort: DiscoverSort;
  page: number;
};

const DISCOVER_SORT: Record<DiscoverSort, string> = {
  popularity: "popularity.desc",
  release: "primary_release_date.desc",
  rating: "vote_average.desc",
};

/** Browse by filters (no title). TMDB can't combine these with a title search. */
export async function discoverMovies(
  f: DiscoverFilters,
): Promise<SearchResult> {
  // Without a vote floor, a movie with a single 10/10 vote tops the rating sort
  const voteFloor =
    f.sort === "rating"
      ? 200
      : f.minRating
        ? 50
        : f.sort === "release"
          ? 5
          : undefined;

  const raw = await tmdbFetch<RawList>(
    "/discover/movie",
    {
      include_adult: false,
      include_video: false,
      language: "en-US",
      page: f.page,
      sort_by: DISCOVER_SORT[f.sort],
      with_genres: f.genre,
      primary_release_year: f.year,
      "vote_average.gte": f.minRating,
      "vote_count.gte": voteFloor,
      with_original_language: f.language,
      // Newest-first would otherwise start with unreleased titles
      "primary_release_date.lte":
        f.sort === "release"
          ? new Date().toISOString().slice(0, 10)
          : undefined,
    },
    { revalidate: HOUR },
  );
  return toSearchResult(raw, f.page);
}

export async function searchPeople(
  query: string,
  page: number,
): Promise<PersonSearchResult> {
  const raw = await tmdbFetch<RawPersonList>("/search/person", {
    query,
    page,
    include_adult: false,
    language: "en-US",
  });
  return {
    results: (raw.results ?? []).map(mapPersonSummary),
    page: raw.page ?? page,
    totalPages: Math.min(raw.total_pages ?? 1, 500),
    totalResults: raw.total_results ?? 0,
  };
}

/** Person plus their movie credits in one call. A 404 surfaces as TmdbError(404). */
export async function getPerson(id: number): Promise<PersonDetails> {
  const raw = await tmdbFetch<RawPersonDetails>(
    `/person/${id}`,
    { append_to_response: "movie_credits", language: "en-US" },
    { revalidate: 24 * HOUR },
  );
  return mapPersonDetails(raw);
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

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
import type { MediaType } from "@/lib/media";
import type { DiscoverSort } from "@/lib/search";
import { TmdbError, tmdbFetch } from "./client";
import {
  mapDetails,
  mapPersonDetails,
  mapPersonSummary,
  mapSummary,
  mapTvDetails,
  mapTvSummary,
  type RawDetails,
  type RawList,
  type RawPersonDetails,
  type RawPersonList,
  type RawTvDetails,
  type RawTvList,
} from "./mappers";

const HOUR = 60 * 60;

type RawAnyList = RawList | RawTvList;

function mapList(mediaType: MediaType, raw: RawAnyList): MovieSummary[] {
  return mediaType === "tv"
    ? ((raw as RawTvList).results ?? []).map(mapTvSummary)
    : ((raw as RawList).results ?? []).map(mapSummary);
}

function toSearchResult(
  mediaType: MediaType,
  raw: RawAnyList,
  page: number,
): SearchResult {
  return {
    results: mapList(mediaType, raw),
    page: raw.page ?? page,
    totalPages: Math.min(raw.total_pages ?? 1, 500), // TMDB caps pages at 500
    totalResults: raw.total_results ?? 0,
  };
}

async function list(
  mediaType: MediaType,
  path: string,
): Promise<MovieSummary[]> {
  const raw = await tmdbFetch<RawAnyList>(
    path,
    { language: "en-US", page: 1 },
    { revalidate: HOUR },
  );
  return mapList(mediaType, raw);
}

export const getTrending = () => list("movie", "/trending/movie/week");
export const getPopular = () => list("movie", "/movie/popular");
export const getTopRated = () => list("movie", "/movie/top_rated");
export const getUpcoming = () => list("movie", "/movie/upcoming");

export const getTrendingTv = () => list("tv", "/trending/tv/week");
export const getPopularTv = () => list("tv", "/tv/popular");
export const getTopRatedTv = () => list("tv", "/tv/top_rated");

export async function searchTitles(
  mediaType: MediaType,
  query: string,
  page: number,
  year?: number,
): Promise<SearchResult> {
  const raw = await tmdbFetch<RawAnyList>(
    mediaType === "tv" ? "/search/tv" : "/search/movie",
    {
      query,
      page,
      include_adult: false,
      language: "en-US",
      ...(mediaType === "tv"
        ? { first_air_date_year: year }
        : { primary_release_year: year }),
    },
  );
  return toSearchResult(mediaType, raw, page);
}

export type DiscoverFilters = {
  genre?: number;
  year?: number;
  minRating?: number; // TMDB community rating, 1-10
  language?: string;
  sort: DiscoverSort;
  page: number;
};

const DISCOVER_SORT: Record<MediaType, Record<DiscoverSort, string>> = {
  movie: {
    popularity: "popularity.desc",
    release: "primary_release_date.desc",
    rating: "vote_average.desc",
  },
  tv: {
    popularity: "popularity.desc",
    release: "first_air_date.desc",
    rating: "vote_average.desc",
  },
};

/** Browse by filters (no title). TMDB can't combine these with a title search. */
export async function discoverTitles(
  mediaType: MediaType,
  f: DiscoverFilters,
): Promise<SearchResult> {
  const isTv = mediaType === "tv";
  // Without a vote floor, a title with a single 10/10 vote tops the rating sort
  const voteFloor =
    f.sort === "rating"
      ? 200
      : f.minRating
        ? 50
        : f.sort === "release"
          ? 5
          : undefined;
  // Newest-first would otherwise start with unreleased titles
  const notAfter =
    f.sort === "release" ? new Date().toISOString().slice(0, 10) : undefined;

  const raw = await tmdbFetch<RawAnyList>(
    isTv ? "/discover/tv" : "/discover/movie",
    {
      include_adult: false,
      language: "en-US",
      page: f.page,
      sort_by: DISCOVER_SORT[mediaType][f.sort],
      with_genres: f.genre,
      "vote_average.gte": f.minRating,
      "vote_count.gte": voteFloor,
      with_original_language: f.language,
      ...(isTv
        ? { first_air_date_year: f.year, "first_air_date.lte": notAfter }
        : {
            include_video: false,
            primary_release_year: f.year,
            "primary_release_date.lte": notAfter,
          }),
    },
    { revalidate: HOUR },
  );
  return toSearchResult(mediaType, raw, f.page);
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

/** Details + credits for a movie or a series, through the shared Mongo cache. */
export async function getMediaDetails(
  mediaType: MediaType,
  tmdbId: number,
): Promise<MovieDetails> {
  await connectDb();
  const cached = await TmdbCache.findOne({ mediaType, tmdbId }).lean();
  const maxAgeMs = getEnv().TMDB_DETAILS_TTL_DAYS * 24 * 60 * 60 * 1000;
  // Entries cached before TV support have no mediaType field, so always set it
  const fromCache = () => ({ ...(cached!.data as MovieDetails), mediaType });

  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < maxAgeMs) {
    return fromCache();
  }

  try {
    const data =
      mediaType === "tv"
        ? mapTvDetails(
            await tmdbFetch<RawTvDetails>(`/tv/${tmdbId}`, {
              append_to_response: "aggregate_credits",
              language: "en-US",
            }),
          )
        : mapDetails(
            await tmdbFetch<RawDetails>(`/movie/${tmdbId}`, {
              append_to_response: "credits",
              language: "en-US",
            }),
          );
    try {
      await TmdbCache.updateOne(
        { mediaType, tmdbId },
        { $set: { data, fetchedAt: new Date() } },
        { upsert: true },
      );
    } catch (err) {
      console.error("TMDB cache write failed:", err); // non-critical (e.g. concurrent upsert)
    }
    return data;
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) throw err;
    if (cached) return fromCache(); // TMDB down: serve the stale copy
    throw err;
  }
}

export const getMovieDetails = (tmdbId: number) =>
  getMediaDetails("movie", tmdbId);

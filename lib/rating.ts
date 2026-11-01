// Ratings are stored as integers 1-10 (no float math in averages).
// The UI shows them as 0.5-5 stars.
export const RATING_MIN = 1;
export const RATING_MAX = 10;

export function isValidRating(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= RATING_MIN &&
    v <= RATING_MAX
  );
}

export const ratingToStars = (rating: number) => rating / 2;
export const starsToRating = (stars: number) => Math.round(stars * 2);

export function formatStars(rating: number | null | undefined) {
  return rating == null ? "Not rated" : `${ratingToStars(rating)} / 5`;
}

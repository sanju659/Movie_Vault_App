import TitleDetails from "@/components/TitleDetails";

type Props = { params: Promise<{ tmdbId: string }> };

export default async function MoviePage({ params }: Props) {
  const { tmdbId } = await params;
  return <TitleDetails mediaType="movie" rawId={tmdbId} />;
}

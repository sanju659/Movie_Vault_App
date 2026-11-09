import TitleDetails from "@/components/TitleDetails";

type Props = { params: Promise<{ tmdbId: string }> };

export default async function TvPage({ params }: Props) {
  const { tmdbId } = await params;
  return <TitleDetails mediaType="tv" rawId={tmdbId} />;
}

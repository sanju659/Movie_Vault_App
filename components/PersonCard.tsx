import Link from "next/link";
import type { PersonSummary } from "@/lib/movie-types";
import PersonPhoto from "./PersonPhoto";

export default function PersonCard({ person }: { person: PersonSummary }) {
  return (
    <Link
      href={`/person/${person.id}`}
      className="group block focus-visible:outline-2 focus-visible:outline-amber-500"
    >
      <PersonPhoto path={person.profilePath} name={person.name} />
      <p className="mt-2 text-sm font-medium group-hover:underline">
        {person.name}
      </p>
      {person.knownForDepartment && (
        <p className="text-xs text-neutral-400">{person.knownForDepartment}</p>
      )}
      {person.knownFor.length > 0 && (
        <p className="line-clamp-2 text-xs text-neutral-500">
          {person.knownFor.join(", ")}
        </p>
      )}
    </Link>
  );
}

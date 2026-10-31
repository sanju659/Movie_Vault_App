export default function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
    >
      {message}
    </div>
  );
}

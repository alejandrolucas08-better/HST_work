export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-line" />
        <div className="h-4 w-96 max-w-full rounded bg-line/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-2xl border border-line bg-surface" />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-line bg-surface" />
      <div className="h-72 rounded-2xl border border-line bg-surface" />
    </div>
  );
}

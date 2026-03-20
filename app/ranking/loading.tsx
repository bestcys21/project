export default function RankingLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-5">
      <div className="px-2 space-y-1">
        <div className="h-7 w-28 bg-toss-border rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-toss-border rounded animate-pulse mt-2" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-24 bg-toss-border rounded-full animate-pulse" />
        <div className="h-10 w-24 bg-toss-border rounded-full animate-pulse" />
      </div>
      <div className="bg-toss-card rounded-2xl shadow-card p-5 space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-toss-border animate-pulse">
            <div className="w-7 h-5 bg-toss-bg rounded" />
            <div className="w-10 h-10 bg-toss-bg rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-toss-bg rounded w-28" />
              <div className="h-3 bg-toss-bg rounded w-16" />
            </div>
            <div className="text-right space-y-1">
              <div className="h-4 bg-toss-bg rounded w-16" />
              <div className="h-3 bg-toss-bg rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

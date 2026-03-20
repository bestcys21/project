// Shimmer 스켈레톤 공통 컴포넌트

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-toss-bg via-gray-200 to-toss-bg bg-[length:200%_100%] rounded-xl ${className}`}
      style={{ animation: "shimmer 1.4s infinite linear" }} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 space-y-4">
      <Shimmer className="h-4 w-24" />
      <Shimmer className="h-8 w-40" />
      <Shimmer className="h-4 w-full" />
      <Shimmer className="h-4 w-3/4" />
    </div>
  );
}

export function SummaryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 space-y-2">
      <Shimmer className="h-3 w-16" />
      <Shimmer className="h-6 w-24" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-[200px] px-2">
        {[60, 90, 40, 120, 80, 110, 50, 95, 70, 130, 85, 100].map((h, i) => (
          <div key={i} className="flex-1 animate-pulse bg-gradient-to-r from-toss-bg via-gray-200 to-toss-bg rounded-t-lg"
            style={{ height: `${h}px`, animationDelay: `${i * 0.05}s`, backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear" }} />
        ))}
      </div>
      <div className="flex justify-between px-1">
        {["1월","3월","5월","7월","9월","11월"].map((m) => (
          <span key={m} className="text-[11px] text-toss-sub">{m}</span>
        ))}
      </div>
    </div>
  );
}

export function HoldingRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-toss-border">
      <div className="flex items-center gap-3">
        <Shimmer className="w-9 h-9 rounded-xl" />
        <div className="space-y-1.5">
          <Shimmer className="h-3.5 w-20" />
          <Shimmer className="h-3 w-14" />
        </div>
      </div>
      <Shimmer className="h-4 w-16" />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Shimmer key={i} className="h-10 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

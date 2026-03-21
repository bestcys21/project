export default function Header() {
  return (
    <header className="bg-toss-card border-b border-toss-border sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-toss-blue rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 8c-2.21 0-4 1.34-4 3s1.79 3 4 3 4 1.34 4 3-1.79 3-4 3m0-15v1.5M12 21v-1.5" />
            </svg>
          </div>
          <span className="text-[17px] font-bold tracking-tight text-toss-text">
            Dividend Insight
          </span>
        </div>
        <span className="text-xs font-medium text-toss-sub bg-toss-bg px-3 py-1 rounded-full">
          BETA
        </span>
      </div>
    </header>
  );
}

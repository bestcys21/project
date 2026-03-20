const INFO = [
  {
    icon: "📅",
    title: "배당락일이란?",
    desc: "이 날 이후 매수하면 이번 배당을 받지 못해요. 반드시 전날까지 매수하세요.",
  },
  {
    icon: "🧾",
    title: "세금 얼마나?",
    desc: "한국 15.4% · 미국 15% 원천징수. 세후 금액을 자동으로 계산해 드려요.",
  },
  {
    icon: "🏆",
    title: "배당 귀족주",
    desc: "25년 이상 연속 배당 증가 기업. 안정성과 성장성을 동시에 확인하세요.",
  },
];

export default function InfoCards() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {INFO.map((item) => (
        <div
          key={item.title}
          className="bg-toss-card rounded-2xl shadow-card p-4 space-y-2
                     hover:shadow-card-hover transition-shadow cursor-pointer"
        >
          <div className="text-2xl">{item.icon}</div>
          <p className="text-[13px] font-bold text-toss-text leading-tight">{item.title}</p>
          <p className="text-[11px] text-toss-sub leading-relaxed">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

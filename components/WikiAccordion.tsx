"use client";

import { useState } from "react";

interface ArticleItem {
  q: string;
  a: string;
}

interface ArticleSection {
  category: string;
  color: string;
  bgColor: string;
  items: ArticleItem[];
}

export default function WikiAccordion({ articles }: { articles: ArticleSection[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-10">
      {articles.map((section) => (
        <div key={section.category} className="space-y-3">
          {/* 섹션 헤더 */}
          <h2 className="text-[26px] font-extrabold text-toss-text mb-4 flex items-center gap-2">
            {section.category}
          </h2>

          {/* 아코디언 목록 */}
          <div className="rounded-2xl overflow-hidden border border-toss-border bg-toss-card shadow-card divide-y divide-toss-border">
            {section.items.map((item) => {
              const key = `${section.category}__${item.q}`;
              const isOpen = openKey === key;

              return (
                <div key={item.q}>
                  {/* 질문 (토글 버튼) */}
                  <button
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span
                      className="text-[18px] font-semibold leading-snug flex-1"
                      style={{ color: isOpen ? section.color : undefined }}
                    >
                      <span className="mr-2 opacity-50 text-[15px] font-bold">Q.</span>
                      {item.q}
                    </span>

                    {/* 화살표 아이콘 */}
                    <svg
                      className="w-5 h-5 flex-shrink-0 transition-transform duration-200 text-toss-sub"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", color: isOpen ? section.color : undefined }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {/* 답변 (아코디언 패널) */}
                  <div
                    className="overflow-hidden transition-all duration-200 ease-in-out"
                    style={{ maxHeight: isOpen ? "600px" : "0px" }}
                  >
                    <div
                      className="mx-6 mb-5 mt-1 rounded-xl border-l-4 pl-5 pr-5 py-4 text-[16px] text-toss-label"
                      style={{ borderColor: section.color, backgroundColor: section.bgColor, lineHeight: "1.75" }}
                    >
                      {item.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect } from "react";

interface ToastProps {
  visible: boolean;
  message: string;
  sub?: string;
  onClose: () => void;
}

export default function Toast({ visible, message, sub, onClose }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
      <div className="bg-[#191F28] text-white rounded-2xl shadow-2xl px-5 py-3.5 min-w-[260px] max-w-[320px]">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-bold leading-snug">{message}</p>
            {sub && <p className="text-[12px] text-white/60 mt-0.5 leading-snug">{sub}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

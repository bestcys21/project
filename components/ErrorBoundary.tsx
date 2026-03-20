"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message ?? "알 수 없는 오류" };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="bg-white rounded-2xl shadow-card p-8 flex flex-col items-center text-center space-y-3">
        <span className="text-4xl">😵</span>
        <p className="text-[15px] font-bold text-toss-text">잠깐, 문제가 생겼어요</p>
        <p className="text-[13px] text-toss-sub leading-relaxed">{this.state.message}</p>
        <button
          onClick={() => this.setState({ hasError: false, message: "" })}
          className="mt-2 px-5 py-2.5 bg-toss-blue text-white text-[13px] font-bold rounded-xl hover:bg-toss-blueDark transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }
}

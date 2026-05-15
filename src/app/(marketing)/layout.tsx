import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#f7faf8] text-[#111827]">{children}</div>;
}

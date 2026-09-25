export type Theme = ReturnType<typeof makeTheme>;

export function makeTheme(dark: boolean) {
  return dark
    ? {
        dark: true,
        chrome: "bg-[#1f1f1f]",
        body: "bg-[#272727]",
        panel: "bg-[#2b2b2b]",
        text: "text-neutral-200",
        sub: "text-neutral-400",
        border: "border-neutral-700",
        hover: "hover:bg-white/10",
        tabActive: "bg-[#2f2f2f]",
        card: "border-neutral-600",
        input: "bg-[#1c1c1c] border-neutral-700 text-neutral-200",
        row: "hover:bg-white/[0.06]",
        head: "bg-[#2f2f2f]",
        bg: "bg-[#1c1c1c]",
      }
    : {
        dark: false,
        chrome: "bg-gradient-to-l from-blue-50 via-white to-rose-50",
        body: "bg-gradient-to-br from-slate-50 via-blue-50/60 to-rose-50/50",
        panel: "bg-white/95",
        text: "text-slate-800",
        sub: "text-slate-500",
        border: "border-blue-100",
        hover: "hover:bg-blue-50/80",
        tabActive: "bg-white shadow-sm",
        card: "border-blue-100 shadow-sm",
        input: "bg-white border-blue-100 text-slate-800 focus:border-sky-300 focus:ring-2 focus:ring-sky-100",
        row: "hover:bg-blue-50/70",
        head: "bg-gradient-to-l from-blue-50 to-rose-50/70",
        bg: "bg-white/95",
      };
}

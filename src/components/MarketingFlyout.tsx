import { useState, useMemo } from "react";
import {
  Star,
  Trash2,
  SquareArrowOutUpRight,
  Search,
  Users,
  FileText,
  Wrench,
  Layers,
  Sparkles,
  Info,
  FolderOpen,
} from "lucide-react";
import { MarketingItem, appStore, useMarketingItems } from "../store";
import { Theme } from "../theme";

interface MarketingFlyoutProps {
  t: Theme;
  dark: boolean;
  onOpenItem: (label: string) => void;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export default function MarketingFlyout({
  t,
  dark,
  onOpenItem,
  onClose: _onClose,
  onShowToast,
}: MarketingFlyoutProps) {
  const marketingItems = useMarketingItems();
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return marketingItems;
    const q = search.trim().toLowerCase();
    return marketingItems.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.section.toLowerCase().includes(q) ||
        (it.groupTitle && it.groupTitle.toLowerCase().includes(q))
    );
  }, [marketingItems, search]);

  // Group by origin section
  const grouped = useMemo(() => {
    const map: Record<string, MarketingItem[]> = {};
    filteredItems.forEach((it) => {
      const sec = it.section || "سایر گزینه‌ها";
      if (!map[sec]) map[sec] = [];
      map[sec].push(it);
    });
    return map;
  }, [filteredItems]);

  const handleToggle = (it: MarketingItem) => {
    appStore.toggleMarketingItem({
      name: it.name,
      section: it.section,
      groupTitle: it.groupTitle,
    });
    onShowToast(`«${it.name}» از دسترسی سریع حذف شد`);
  };

  const handleQuickAdd = (name: string, section: string, groupTitle: string) => {
    appStore.toggleMarketingItem({ name, section, groupTitle });
    onShowToast(`«${name}» به دسترسی سریع اضافه شد ⭐`);
  };

  const getItemIcon = (name: string) => {
    if (name.includes("مشتری")) return <Users size={14} className="text-blue-400" />;
    if (name.includes("قرارداد")) return <FileText size={14} className="text-amber-400" />;
    if (name.includes("سرویس") || name.includes("تعمیر") || name.includes("خرابی"))
      return <Wrench size={14} className="text-emerald-400" />;
    return <Layers size={14} className="text-purple-400" />;
  };

  return (
    <div
      className={`flex h-full flex-col text-right select-none ${t.chrome}`}
      dir="rtl"
    >
      {/* Header */}
      <div className={`border-b p-3 ${t.border} bg-neutral-800/10 backdrop-blur-sm`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Sparkles size={15} />
            </div>
            <div>
              <h3 className={`text-[13px] font-bold ${t.text}`}>منوی دسترسی سریع</h3>
              <p className={`text-[10px] ${t.sub}`}>زیرمجموعه دسترسی‌های برگزیده و نشان‌شده</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 text-[10.5px] font-medium text-amber-300">
            {marketingItems.length} گزینه
          </span>
        </div>

        {/* Search */}
        {marketingItems.length > 3 && (
          <div className={`mt-2 flex h-7 items-center gap-1.5 rounded border px-2 ${t.input}`}>
            <Search size={12} className={t.sub} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در دسترسی سریع..."
              className="w-full bg-transparent text-[11px] outline-none placeholder:text-zinc-500"
            />
          </div>
        )}
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-700/20">
        {marketingItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles size={22} />
            </div>
            <p className={`text-[12.5px] font-semibold ${t.text}`}>
              هنوز گزینه‌ای نشان نشده است
            </p>
            <p className={`mt-1.5 text-[11px] leading-5 text-zinc-400 px-1`}>
              برای افزودن هر گزینه به این بخش، روی آیکون ستاره (⭐) کنار آیتم‌ها در منوهای برنامه کلیک کنید.
            </p>

            <div className="mt-4 w-full rounded-md border border-dashed border-zinc-700/50 bg-zinc-800/20 p-2.5 text-right">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 mb-2">
                <Sparkles size={12} />
                <span>افزودن سریع گزینه‌های پرکاربرد:</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickAdd("مدیریت زمانبندی سرویس ها و خرابی ها", "سرویس و نگهداری", "گزارشات")}
                  className="flex items-center justify-between rounded bg-zinc-800/60 hover:bg-zinc-700/70 border border-zinc-700/50 px-2.5 py-1.5 text-[11px] text-zinc-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Wrench size={12} className="text-amber-400" />
                    <span>مدیریت زمانبندی سرویس‌ها</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">+ افزودن</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd("قرارداد ها", "سرویس و نگهداری", "گزارشات")}
                  className="flex items-center justify-between rounded bg-zinc-800/60 hover:bg-zinc-700/70 border border-zinc-700/50 px-2.5 py-1.5 text-[11px] text-zinc-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText size={12} className="text-amber-400" />
                    <span>قرارداد ها</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">+ افزودن</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd("لیست مشتریان", "پرونده", "مشتریان")}
                  className="flex items-center justify-between rounded bg-zinc-800/60 hover:bg-zinc-700/70 border border-zinc-700/50 px-2.5 py-1.5 text-[11px] text-zinc-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Users size={12} className="text-blue-400" />
                    <span>لیست مشتریان</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold">+ افزودن</span>
                </button>
              </div>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-zinc-400">
            موردی مطابق با «{search}» یافت نشد.
          </div>
        ) : (
          Object.entries(grouped).map(([section, items]) => (
            <div key={section} className="pb-1">
              {/* Group Title */}
              <div
                className={`sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 text-[11px] font-bold ${
                  dark ? "bg-[#282828] text-amber-300" : "bg-neutral-200 text-amber-700"
                }`}
              >
                <span>از بخش {section}</span>
                <span className="text-[9.5px] opacity-75">{items.length} مورد</span>
              </div>

              {/* Items */}
              {items.map((it) => (
                <div
                  key={it.id}
                  className={`group/item flex items-center justify-between gap-1.5 border-b px-3 py-2 text-[12px] transition ${
                    t.border
                  } ${t.hover} ${t.text}`}
                >
                  {/* Click to open */}
                  <button
                    type="button"
                    onClick={() => onOpenItem(it.name)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-right text-inherit"
                  >
                    <span className="shrink-0">{getItemIcon(it.name)}</span>
                    <span className="truncate leading-5 font-medium">{it.name}</span>
                    <SquareArrowOutUpRight
                      size={12}
                      className={`shrink-0 opacity-40 group-hover/item:opacity-90 ${t.sub}`}
                    />
                  </button>

                  {/* Unpin button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(it)}
                    title="حذف از دسترسی سریع"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-amber-400 hover:bg-red-500/20 hover:text-red-400 transition"
                  >
                    <Star size={13} className="fill-amber-400" />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer Info / Controls */}
      {marketingItems.length > 0 && (
        <div
          className={`flex items-center justify-between border-t px-3 py-2 text-[11px] ${t.border} ${t.sub} bg-black/10`}
        >
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Info size={11} className="text-amber-400 shrink-0" />
            <span>کلیک روی ستاره منوها جهت افزودن/حذف</span>
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("آیا مایلید تمام آیتم‌های دسترسی سریع پاک‌سازی شوند؟")) {
                appStore.clearMarketingItems();
                onShowToast("تمام آیتم‌های دسترسی سریع پاک شدند");
              }
            }}
            className="flex items-center gap-1 text-[10.5px] text-red-400 hover:text-red-300 hover:underline"
          >
            <Trash2 size={11} />
            <span>پاک‌سازی</span>
          </button>
        </div>
      )}
    </div>
  );
}

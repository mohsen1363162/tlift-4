import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  Clock,
  WifiOff,
  Check,
  X,
  Radio,
} from "lucide-react";
import {
  subscribeSync,
  syncNow,
  SyncState,
  toggleManualOffline,
  setSyncInterval,
  getSyncInterval,
} from "../cloudSync";

export function useSyncState() {
  const [s, setS] = useState<SyncState>({
    status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle",
    lastSync: null,
    pending: 0,
    offlineServicesCount: 0,
    isManualOffline: false,
    intervalMinutes: getSyncInterval(),
  });
  useEffect(() => subscribeSync(setS), []);
  return s;
}

export const SYNC_INTERVAL_OPTIONS = [
  { value: 0, label: "فقط دستی (بدون چک خودکار)", hint: "همگام‌سازی فقط با لمس دکمه" },
  { value: 2, label: "هر ۲ دقیقه", hint: "بررسی مداوم" },
  { value: 5, label: "هر ۵ دقیقه (پیشنهادی)", hint: "بهینه برای مصرف باتری و اینترنت" },
  { value: 10, label: "هر ۱۰ دقیقه", hint: "فاصله استاندارد" },
  { value: 15, label: "هر ۱۵ دقیقه", hint: "فواصل طولانی‌تر" },
  { value: 30, label: "هر ۳۰ دقیقه", hint: "بررسی نیم‌ساعته" },
  { value: 60, label: "هر ۱ ساعت", hint: "بررسی ساعتی" },
];

interface SyncIndicatorProps {
  compact?: boolean;
  variant?: "header" | "footer" | "mobile" | "button" | "pill";
  onShowToast?: (msg: string) => void;
}

export default function SyncIndicator({
  compact = false,
  variant = "footer",
  onShowToast,
}: SyncIndicatorProps) {
  const s = useSyncState();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasInternet = typeof navigator === "undefined" ? true : navigator.onLine;
  const serverUnavailable = hasInternet && !s.isManualOffline && (s.status === "offline" || s.status === "error");
  const isOffline = s.status === "offline" || s.status === "error" || s.isManualOffline;
  const isSyncing = s.status === "syncing" || busy;
  const isOnline = s.status === "online";

  // بستن منو با کلیک در بیرون
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handleSync = async () => {
    if (isSyncing) return;
    setBusy(true);
    if (onShowToast) onShowToast("در حال همگام‌سازی اطلاعات با سرور...");
    try {
      const res = await syncNow();
      if (onShowToast) {
        onShowToast(res.message);
      }
    } catch {
      if (onShowToast) {
        onShowToast("خطا در همگام‌سازی. اطلاعات در صف آفلاین ذخیره شد.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSelectInterval = (val: number, label: string) => {
    setSyncInterval(val);
    if (onShowToast) {
      onShowToast(`مدت زمان همگام‌سازی خودکار روی «${label}» تنظیم شد.`);
    }
  };

  const time = s.lastSync
    ? new Date(s.lastSync).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })
    : "";

  const currentIntervalLabel =
    SYNC_INTERVAL_OPTIONS.find((o) => o.value === s.intervalMinutes)?.label ||
    (s.intervalMinutes === 0 ? "دستی" : `هر ${s.intervalMinutes} دقیقه`);

  /* منوی کشویی تنظیمات مدت زمان همگام‌سازی */
  const renderDropdown = () => {
    if (!menuOpen) return null;
    return (
      <div
        ref={menuRef}
        className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 rounded-2xl bg-white p-4 shadow-2xl dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-right text-neutral-800 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* هدر منو */}
        <div className="flex items-center justify-between border-b pb-2.5 mb-3 border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 font-bold text-[13px]">
            <Clock size={16} className="text-blue-600 dark:text-blue-400" />
            <span>تنظیمات و مدت زمان همگام‌سازی</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={15} />
          </button>
        </div>

        {/* دکمه همگام‌سازی فوری */}
        <button
          type="button"
          onClick={() => {
            handleSync();
            setMenuOpen(false);
          }}
          disabled={isSyncing}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-[12.5px] font-bold text-white shadow hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 mb-3"
        >
          <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
          <span>{isSyncing ? "در حال همگام‌سازی..." : "همگام‌سازی هم‌اکنون"}</span>
        </button>

        {/* مدت زمان همگام‌سازی خودکار */}
        <div className="space-y-1.5 mb-3.5">
          <div className="text-[11.5px] font-semibold text-neutral-500 dark:text-neutral-400">
            مدت زمان همگام‌سازی خودکار:
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
            {SYNC_INTERVAL_OPTIONS.map((opt) => {
              const isSelected = s.intervalMinutes === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectInterval(opt.value, opt.label)}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-[12px] transition text-right ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-neutral-300 dark:border-neutral-700"
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-[10.5px] text-neutral-400 font-normal">
                    {opt.value === 0 ? "بدون چک" : `${opt.value}د`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* وضعیت آفلاین دستی و جزئیات */}
        <div className="border-t pt-2.5 border-neutral-100 dark:border-neutral-800 space-y-2 text-[11.5px]">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">حالت آفلاین دستی:</span>
            <button
              type="button"
              onClick={() => {
                toggleManualOffline();
                if (onShowToast) {
                  onShowToast(
                    s.isManualOffline
                      ? "حالت آنلاین فعال شد"
                      : "حالت آفلاین دستی فعال شد (برای مناطق بدون آنتن)"
                  );
                }
              }}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                s.isManualOffline
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {s.isManualOffline ? "فعال (آفلاین)" : "غیرفعال"}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span>آخرین همگام‌سازی موفق:</span>
            <span className="font-mono text-neutral-600 dark:text-neutral-300">
              {time || "هنوز ثبت نشده"}
            </span>
          </div>

          {s.offlineServicesCount > 0 && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between">
              <span>سرویس‌های در صف آفلاین:</span>
              <span className="font-bold">{s.offlineServicesCount} مورد</span>
            </div>
          )}

          {s.error && !s.isManualOffline && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-2 text-red-700 dark:text-red-300 text-[10.5px] leading-5">
              <span className="font-bold">دلیل قطع اتصال به سرور: </span>
              <span className="font-mono break-all" dir="ltr">{s.error}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* حالت Header در نسخه دسکتاپ */
  if (variant === "header") {
    return (
      <div className="relative flex items-center">
        <div className="inline-flex rounded-lg shadow-sm border border-neutral-700/60 overflow-hidden">
          {/* دکمه اصلی همگام‌سازی */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            title={
              s.error
                ? `خطا: ${s.error}`
                : isOffline
                ? "آفلاین - برای تلاش مجدد کلیک کنید"
                : `آخرین همگام‌سازی: ${time || "هم‌اکنون"} | فاصله بررسی: ${currentIntervalLabel}`
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-medium transition ${
              isSyncing
                ? "bg-blue-600 text-white animate-pulse"
                : isOffline
                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                : isOnline
                ? "bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                : "bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {isSyncing ? (
              <RefreshCw size={13} className="animate-spin text-blue-200" />
            ) : isOffline ? (
              <CloudOff size={13} className="text-amber-400" />
            ) : (
              <Cloud size={13} className="text-emerald-400" />
            )}

            <span>
              {isSyncing
                ? "همگام‌سازی..."
                : isOffline
                ? s.offlineServicesCount > 0
                  ? `همگام‌سازی (${s.offlineServicesCount})`
                  : serverUnavailable ? "سرور در دسترس نیست" : "آفلاین (همگام‌سازی)"
                : "همگام‌سازی ابری"}
            </span>

            {s.pending > 0 && !isSyncing && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-neutral-950">
                {s.pending}
              </span>
            )}
          </button>

          {/* کلید سه‌گوش (Dropdown Arrow) برای باز کردن مدت زمان همگام‌سازی */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            title="تنظیم مدت زمان همگام‌سازی"
            className={`flex items-center justify-center px-1.5 border-r border-neutral-700/60 transition ${
              isOffline
                ? "bg-amber-500/30 text-amber-300 hover:bg-amber-500/40"
                : isOnline
                ? "bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40"
                : "bg-zinc-700/80 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {renderDropdown()}
      </div>
    );
  }

  /* حالت موبایل تکنسین */
  if (variant === "mobile") {
    return (
      <div className="relative inline-flex items-center">
        <div className="inline-flex rounded-full shadow-sm border border-neutral-200 overflow-hidden">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-bold transition ${
              isSyncing
                ? "bg-blue-100 text-blue-700 animate-pulse"
                : isOffline
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {isSyncing ? (
              <RefreshCw size={12} className="animate-spin text-blue-600" />
            ) : isOffline ? (
              <CloudOff size={12} className="text-amber-600" />
            ) : (
              <Cloud size={12} className="text-emerald-600" />
            )}
            <span>
              {isSyncing
                ? "همگام‌سازی..."
                : isOffline
                ? s.offlineServicesCount > 0
                  ? `همگام‌سازی (${s.offlineServicesCount})`
                  : "همگام‌سازی"
                : "همگام‌سازی"}
            </span>
          </button>

          {/* کلید سه‌گوش در موبایل */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            title="مدت زمان همگام‌سازی"
            className={`flex items-center justify-center px-1.5 border-r border-neutral-200 transition ${
              isOffline
                ? "bg-amber-200 text-amber-900"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            }`}
          >
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {renderDropdown()}
      </div>
    );
  }

  // Footer / Default Compact Variant
  const label = isSyncing
    ? "در حال همگام‌سازی..."
    : isOnline
    ? "متصل و همگام"
    : isOffline
    ? s.offlineServicesCount > 0
      ? `آفلاین (${s.offlineServicesCount} سرویس)`
      : "آفلاین"
    : "همگام‌سازی ابری";

  const color = isOnline
    ? "text-emerald-400 hover:text-emerald-300"
    : isOffline
    ? "text-amber-400 hover:text-amber-300"
    : "text-zinc-400 hover:text-zinc-200";

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        type="button"
        title={`آخرین همگام‌سازی: ${time || "-"} | فاصله بررسی: ${currentIntervalLabel}${s.error ? ` | خطا: ${s.error}` : ""}`}
        onClick={handleSync}
        className={`flex items-center gap-1.5 text-[11.5px] transition ${color}`}
      >
        {isSyncing ? (
          <RefreshCw size={13} className="animate-spin" />
        ) : isOnline ? (
          <CheckCircle2 size={13} />
        ) : isOffline ? (
          <CloudOff size={13} />
        ) : (
          <Cloud size={13} />
        )}

        {!compact && <span>{label}</span>}
        {s.pending > 0 && (
          <span className="rounded bg-amber-600 px-1 py-0.2 text-[9.5px] text-white font-bold">
            {s.pending}
          </span>
        )}
      </button>

      {/* کلید سه‌گوش فوتر */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        title="تنظیم مدت زمان همگام‌سازی"
        className="p-0.5 text-neutral-400 hover:text-white"
      >
        <ChevronDown size={12} className={menuOpen ? "rotate-180" : ""} />
      </button>

      {renderDropdown()}
    </div>
  );
}

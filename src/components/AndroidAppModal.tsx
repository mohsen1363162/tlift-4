import { useState } from "react";
import {
  Smartphone,
  Download,
  X,
  Check,
  Copy,
  ExternalLink,
  Share2,
  Sparkles,
  WifiOff,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { checkForAppUpdates, applyUpdateAndReload, APP_VERSION } from "../utils/appUpdater";

interface AndroidAppModalProps {
  open: boolean;
  onClose: () => void;
  onOpenMobileView?: () => void;
}

export default function AndroidAppModal({
  open,
  onClose,
  onOpenMobileView,
}: AndroidAppModalProps) {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  if (!open) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.origin : "https://emami-asemansara.ir";
  const mobileAppUrl = `${currentUrl}/?mode=mobile`;

  const copyMobileLink = async () => {
    try {
      await navigator.clipboard.writeText(mobileAppUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleCheckUpdate = async () => {
    setUpdating(true);
    setUpdateStatus("در حال بررسی آخرین تغییرات و فایل‌های سرور...");
    try {
      const res = await checkForAppUpdates();
      setUpdateStatus(res.message);
    } catch {
      setUpdateStatus(`نسخه شما (${APP_VERSION}) فعال است. در صورت نیاز یک‌بار صفحه را بازنشانی کنید.`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-right overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Smartphone size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <span>برنامه آسمانسرا</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
                  نرم‌افزار مستقل گوشی
                </span>
                <span className="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-mono">
                  v{APP_VERSION}
                </span>
              </h2>
              <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                اپلیکیشن اختصاصی آسمانسرا بدون نوار مرورگر و با آیکون مستقل روی صفحه اصلی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-4 text-[13px] text-neutral-700 dark:text-neutral-300">
          {/* نصب کاملاً مستقل برنامه بدون علامت کروم (WebAPK Standalone) */}
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/30 space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-[14px]">
              <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
              <span>نصب برنامه اختصاصی آسمانسرا روی گوشی</span>
            </div>
            <p className="text-[12px] leading-relaxed text-emerald-950/80 dark:text-emerald-300/90">
              این برنامه مانند برنامه‌های بازار، باد صبا و لارک پلیر به عنوان یک <strong>نرم‌افزار مستقل با نام «آسمانسرا»</strong> روی صفحه اصلی نصب می‌شود. پس از نصب، هیچ نوار آدرس یا علامت کروم نخواهد داشت و به صورت تمام‌صفحه و آفلاین کار می‌کند.
            </p>
            {isInstalled ? (
              <div className="rounded-xl bg-emerald-600 px-3 py-3 text-center font-bold text-white shadow-sm flex items-center justify-center gap-2">
                <Check size={18} />
                <span>برنامه آسمانسرا روی این گوشی نصب است و به صورت نرم‌افزار مستقل اجرا می‌شود</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-bold text-white shadow-lg hover:bg-emerald-700 active:scale-95 transition disabled:opacity-60"
              >
                <Download size={20} />
                <span>{installing ? "در حال افزودن و نصب آسمانسرا..." : "نصب فوری «آسمانسرا» روی صفحه اصلی"}</span>
              </button>
            ) : (
              <div className="rounded-xl bg-white/90 p-3 text-[12px] leading-6 dark:bg-neutral-900/80 space-y-1.5 border border-emerald-200 dark:border-emerald-900">
                <div className="font-bold text-emerald-900 dark:text-emerald-300">
                  راهنمای نصب به عنوان نرم‌افزار بدون علامت مرورگر:
                </div>
                <div>
                  ۱. در بالای مرورگر، منوی سه‌نقطه (⋮) را لمس کنید.
                </div>
                <div>
                  ۲. گزینه <strong>«نصب برنامه» (Install app)</strong> یا <strong>«افزودن به صفحه اصلی» (Add to Home screen)</strong> را انتخاب نمایید.
                </div>
                <div>
                  ۳. نام برنامه به صورت خودکار <strong>«آسمانسرا»</strong> ذخیره شده و بدون آیکون کروم مانند یک برنامه عادی در لیست اپلیکیشن‌های شما قرار می‌گیرد.
                </div>
              </div>
            )}
          </div>

          {/* بخش دوم: دکمه آپدیت و بروزرسانی نرم‌افزار */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200 text-[13px]">
                <RefreshCw size={17} className={`text-blue-600 ${updating ? "animate-spin" : ""}`} />
                <span>بروزرسانی و دریافت آخرین تغییرات (آپدیت)</span>
              </div>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-mono">
                ورژن فعلی: {APP_VERSION}
              </span>
            </div>

            <p className="text-[12px] text-blue-950/80 dark:text-blue-300/90 leading-relaxed">
              هر زمان تغییراتی در برنامه، تعرفه‌ها یا سرویس‌ها اعمال شود، با فشردن دکمه زیر آخرین نسخه و کش‌های برنامه فوراً نوسازی می‌شوند.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={updating}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-white font-bold text-[12.5px] hover:bg-blue-700 transition disabled:opacity-60"
              >
                <RefreshCw size={15} className={updating ? "animate-spin" : ""} />
                <span>{updating ? "در حال بررسی سرور..." : "بررسی و اعمال آخرین آپدیت"}</span>
              </button>

              <button
                type="button"
                onClick={applyUpdateAndReload}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-neutral-800 py-2 px-3 text-[12px] font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-50 transition"
              >
                <Sparkles size={14} />
                <span>بارگذاری مجدد (Reload)</span>
              </button>
            </div>

            {updateStatus && (
              <div className="rounded-lg bg-white p-2.5 text-[12px] font-medium text-blue-800 dark:bg-neutral-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 animate-in fade-in">
                {updateStatus}
              </div>
            )}
          </div>

          {/* ویژگی‌های برنامه */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
              <WifiOff size={18} className="text-amber-500 shrink-0" />
              <span>کارکرد ۱۰۰٪ در نقاط بدون آنتن (آفلاین)</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
              <Sparkles size={18} className="text-blue-500 shrink-0" />
              <span>ثبت سریع سرویس، چک‌لیست و امضا</span>
            </div>
          </div>

          {/* اعلام محدودیت دسترسی ویژه تکنسین‌ها */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[12px] text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldCheck size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">دسترسی اختصاصی سرویس‌کاران و مسئولین فنی:</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed opacity-95">
                ورود به اپلیکیشن اندروید منحصراً برای شماره‌هایی که در بخش <strong>«تنظیمات اولیه &gt; سرویس‌کار و مسئول انجام»</strong> تعریف شده‌اند مجاز می‌باشد. دسترسی مشتریان مسدود بوده و به پرتال اختصاصی مشتریان هدایت خواهند شد.
              </div>
            </div>
          </div>

          {/* آدرس مستقیم برنامه برای باز کردن روی گوشی */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-2 bg-neutral-50/70 dark:bg-neutral-850">
            <div className="font-bold text-neutral-900 dark:text-white text-[12px]">
              آدرس مستقیم نسخه موبایل و برنامه آسمانسرا:
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white p-1.5 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
              <span className="flex-1 truncate font-mono text-[11.5px] text-left text-neutral-500" dir="ltr">
                {mobileAppUrl}
              </span>
              <button
                type="button"
                onClick={copyMobileLink}
                className="flex items-center gap-1 rounded bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? "کپی شد" : "کپی لینک"}</span>
              </button>
            </div>
          </div>

          {/* دکمه‌های عملکرد سریع */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {onOpenMobileView && (
              <button
                type="button"
                onClick={() => {
                  onOpenMobileView();
                  onClose();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-white font-bold hover:bg-emerald-700 transition"
              >
                <Smartphone size={16} />
                <span>ورود به نمای موبایل در همین صفحه</span>
              </button>
            )}
            <a
              href="/public_html.zip"
              download="public_html.zip"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-2.5 px-3 text-[12px] font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition"
              title="دانلود بسته خروجی جهت نصب روی هاست سی‌پنل"
            >
              <Download size={15} />
              <span>دانلود بسته وب و سی‌پنل (ZIP)</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-3 border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11.5px] text-neutral-500">
          <span>پشتیبانی از اندروید ۵ به بالا (APK و وب)</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-100 px-3 py-1.5 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 font-medium"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}

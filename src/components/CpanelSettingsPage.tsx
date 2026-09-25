import { useState } from "react";
import {
  Download,
  Server,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Archive,
  RefreshCw,
  FolderCheck,
  ShieldCheck,
  Copy,
  Check,
  UploadCloud,
  DatabaseBackup,
} from "lucide-react";
import { Theme } from "../theme";
import { downloadFullBackup, restoreFullBackup } from "../utils/fullBackup";

interface CpanelSettingsPageProps {
  t: Theme;
  onShowToast: (msg: string) => void;
}

export default function CpanelSettingsPage({
  t,
  onShowToast,
}: CpanelSettingsPageProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");

  const handleDataBackup = () => {
    const count = downloadFullBackup();
    setBackupStatus(`پشتیبان کامل ${count.toLocaleString("fa-IR")} بخش اطلاعاتی دانلود شد.`);
    onShowToast("پشتیبان کامل اطلاعات دانلود شد");
  };

  const handleDataRestore = async (file?: File) => {
    if (!file) return;
    try {
      const result = await restoreFullBackup(file);
      setBackupStatus(`${result.restored.toLocaleString("fa-IR")} بخش بازیابی شد؛ در حال همگام‌سازی و بازنشانی برنامه...`);
      setTimeout(() => window.location.reload(), 1800);
    } catch (error) {
      setBackupStatus(error instanceof Error ? error.message : "فایل پشتیبان معتبر نیست.");
    }
  };

  // تابع دانلود تضمینی نسخه کامل
  const handleFullDownload = async (filename: "public_html.zip" | "cpanel_public_html.zip" = "public_html.zip") => {
    setDownloading(true);
    setDownloadProgress(`در حال دریافت فایل ${filename}...`);

    try {
      // هر دو نام به یک فایل یکسان اشاره دارند؛ فقط نام ذخیره‌شده متفاوت است
      const fileUrl = `/public_html.zip?t=${Date.now()}`;
      const res = await fetch(fileUrl);
      
      if (!res.ok) {
        throw new Error("خطا در برقراری ارتباط با سرور");
      }

      const contentType = res.headers.get("content-type") || "";
      const blob = await res.blob();
      const sizeInKb = Math.round(blob.size / 1024);

      // اگر محتوا HTML برگشت داده شد یا حجم خیلی کم بود (خطای مسیر)
      if (blob.size < 50000 || contentType.includes("text/html")) {
        throw new Error("فایل فشرده دریافت نشد");
      }

      // ایجاد لینک دانلود مستقیم از Blob
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: "application/zip" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      // تاخیر در حذف برای اطمینان از شروع دانلود توسط مرورگر
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);

      setDownloadProgress(`دانلود با موفقیت انجام شد (${sizeInKb} کیلوبایت)`);
      onShowToast(`فایل ${filename} با موفقیت دانلود شد (${sizeInKb} KB)`);
    } catch {
      // در صورت بروز هر محدودیتی در iframe، لینک مستقیم فایل تریگر می‌شود
      const directUrl = `/${filename}`;
      const fallbackLink = document.createElement("a");
      fallbackLink.href = directUrl;
      fallbackLink.download = filename;
      fallbackLink.target = "_blank";
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      setTimeout(() => {
        if (document.body.contains(fallbackLink)) {
          document.body.removeChild(fallbackLink);
        }
      }, 2000);

      onShowToast(`درخواست دانلود مستقیم ${filename} ارسال شد`);
      setDownloadProgress(`دانلود از مسیر مستقیم آغاز شد.`);
    } finally {
      setTimeout(() => {
        setDownloading(false);
      }, 1500);
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText("https://emami-asemansara.ir");
    setCopied(true);
    onShowToast("آدرس دامنه کپی شد");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-1 flex-col overflow-y-auto p-6 text-right ${t.input}`}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className={`text-xl font-bold flex items-center gap-2 ${t.text}`}>
            <Server className="text-emerald-500" size={24} />
            تنظیمات هاست و فایل خروجی cPanel
          </h1>
          <p className={`mt-1 text-xs ${t.sub}`}>
            مدیریت بسته نصبی، دانلود نسخه کامل خروجی و راهنمای راه‌اندازی روی دامنه اختصاصی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://emami-asemansara.ir"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:border-zinc-700 dark:text-sky-400 dark:hover:bg-zinc-800 transition"
          >
            <Globe size={14} />
            مشاهده سایت زنده (emami-asemansara.ir)
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className={`mb-6 rounded-2xl border p-5 shadow-sm ${t.card} ${t.border}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={`flex items-center gap-2 text-base font-bold ${t.text}`}><DatabaseBackup size={21} className="text-emerald-500"/> پشتیبان کامل اطلاعات نرم‌افزار</h2>
            <p className={`mt-1 text-xs ${t.sub}`}>قراردادها، مشتریان، قیمت‌ها، سرویس‌ها، پرداخت‌ها و تنظیمات را در یک فایل ذخیره یا بازیابی کنید.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleDataBackup} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"><Download size={16}/> دانلود پشتیبان کامل</button>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-sky-500/50 px-4 py-2.5 text-xs font-bold text-sky-500 hover:bg-sky-500/10"><UploadCloud size={16}/> بازیابی پشتیبان<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => { handleDataRestore(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label>
          </div>
        </div>
        {backupStatus && <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">{backupStatus}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Action Box */}
        <div className="lg:col-span-2 space-y-6">
          {/* Download Box */}
          <div className={`rounded-xl border p-6 shadow-sm ${t.card} ${t.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 size={13} />
                  نسخه کامل کامپایل شده و آماده
                </span>
                <h2 className={`mt-2 text-lg font-bold ${t.text}`}>
                  بسته نصبی کامل برای cPanel (public_html)
                </h2>
                <p className={`mt-1 text-xs leading-relaxed ${t.sub}`}>
                  این بسته حاوی تمامی کدهای کامپایل‌شده جاوااسکریپت، استایل‌ها، فونت‌ها و فایل ساختار
                  به همراه فایل کانفیگ <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.htaccess</code> آپاچی است.
                </p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <Archive size={32} />
              </div>
            </div>

            {/* File info pill */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-y py-3 text-xs">
              <div>
                <span className={t.sub}>نام فایل اصلی:</span>
                <div className="font-semibold dir-ltr text-right text-emerald-600 dark:text-emerald-400">public_html.zip</div>
              </div>
              <div>
                <span className={t.sub}>حجم بسته کامل:</span>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">~۹۱۴ کیلوبایت</div>
              </div>
              <div>
                <span className={t.sub}>مسیر در cPanel:</span>
                <div className="font-semibold dir-ltr text-right">public_html/</div>
              </div>
              <div>
                <span className={t.sub}>وضعیت:</span>
                <div className="font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck size={13} /> کاملاً معتبر و آماده
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleFullDownload("public_html.zip")}
                disabled={downloading}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>در حال آماده‌سازی و دانلود...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>دانلود مستقیم فایل public_html.zip (۹۱۴ KB)</span>
                  </>
                )}
              </button>

              <a
                href="/public_html.zip"
                download="public_html.zip"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold hover:bg-emerald-500/20 transition text-emerald-700 dark:text-emerald-300"
              >
                <Download size={14} />
                دانلود در تب جدید (تضمینی در صورت محدودیت پیش‌نمایش)
              </a>

              <a
                href="/public_html.zip"
                download="cpanel_public_html.zip"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 transition text-zinc-600 dark:text-zinc-300"
              >
                <ExternalLink size={13} />
                دانلود با نام cpanel_public_html.zip
              </a>
            </div>

            {downloadProgress && (
              <div className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {downloadProgress}
              </div>
            )}
          </div>

          {/* Step by Step Guide */}
          <div className={`rounded-xl border p-6 shadow-sm ${t.card} ${t.border}`}>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${t.text} mb-4`}>
              <FolderCheck size={18} className="text-sky-500" />
              راهنمای ۳ مرحله‌ای استخراج در cPanel
            </h3>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold dark:bg-sky-950 dark:text-sky-300">
                  ۱
                </span>
                <div>
                  <strong className={t.text}>ورود به File Manager:</strong> وارد کنترل‌پنل cPanel خود شوید، روی آیکون <strong>File Manager</strong> کلیک کرده و وارد پوشه <strong>public_html</strong> شوید.
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold dark:bg-sky-950 dark:text-sky-300">
                  ۲
                </span>
                <div>
                  <strong className={t.text}>آپلود و استخراج (Extract):</strong> فایل دانلودی (<code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">public_html.zip</code> یا <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">cpanel_public_html.zip</code>) را در همان صفحه اول <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">public_html</code> آپلود کنید. سپس روی آن راست‌کلیک کرده و گزینه <strong>Extract</strong> را انتخاب کنید.
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 font-bold dark:bg-sky-950 dark:text-sky-300">
                  ۳
                </span>
                <div>
                  <strong className={t.text}>بررسی و اجرا:</strong> مطمئن شوید فایل‌های <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">index.html</code>، پوشه <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">assets</code> و فایل <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.htaccess</code> مستقیماً در <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">public_html</code> قرار گرفته‌اند. سایت شما روی دامنه اختصاصی آنلاین است!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Domain Details */}
          <div className={`rounded-xl border p-5 shadow-sm ${t.card} ${t.border}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${t.sub} mb-3`}>
              اطلاعات دامنه و اتصال
            </h3>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg border p-3 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                <span className={t.sub}>آدرس دامنه فعال:</span>
                <div className="mt-1 flex items-center justify-between font-mono font-bold text-sky-600 dark:text-sky-400">
                  <span>https://emami-asemansara.ir</span>
                  <button
                    type="button"
                    onClick={copyDomain}
                    title="کپی آدرس دامنه"
                    className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b dark:border-zinc-800">
                <span className={t.sub}>گواهی SSL (HTTPS):</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> فعال
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b dark:border-zinc-800">
                <span className={t.sub}>وب‌سرور هاست:</span>
                <span className="font-semibold">Apache / LiteSpeed</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className={t.sub}>تنظیم روت‌ها (.htaccess):</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> تعبیه شده
                </span>
              </div>
            </div>
          </div>

          {/* Help notice */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle size={15} />
              نکته مهم در رابطه با حجم فایل
            </div>
            اگر هر زمان دکمه دانلود را زدید و مرورگر مانع شروع خودکار شد، کافیست از دکمه <strong>«لینک دانلود مستقیم بدون اسکریپت»</strong> استفاده کنید تا فایل با حجم کامل (~۷۲۵ کیلوبایت) مستقیماً روی سیستم ذخیره شود.
          </div>
        </div>
      </div>
    </div>
  );
}

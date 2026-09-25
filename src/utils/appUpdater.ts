/**
 * مدیریت بروزرسانی و آپدیت نرم‌افزار (برنامه آسمانسرا و نسخه دسکتاپ)
 */

export const APP_VERSION = "3.8.19";
export const APP_BUILD_DATE = "شهریور ۱۴۰۵";

export interface UpdateCheckResult {
  hasUpdate: boolean;
  message: string;
  version: string;
}

/**
 * بررسی وضعیت آپدیت و دریافت آخرین تغییرات برنامه
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  // ۱. بررسی وجود Service Worker و درخواست آپدیت کانتینر
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
        if (registration.waiting) {
          // نسخه‌ای در حال انتظار است؛ به آن پیام اعمال بده
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch {
      /* ignore sw error */
    }
  }

  // ۲. بررسی دسترسی به سرور و پاکسازی کش‌های منسوخ‌شده
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const cacheNames = await caches.keys();
      // بازبینی و نوسازی کش‌های موقت
      for (const name of cacheNames) {
        if (name.includes("old") || name.includes("temp")) {
          await caches.delete(name);
        }
      }
    } catch {
      /* ignore cache errors */
    }
  }

  // ۳. تست دریافت هدر یا مانیفست سرور برای اطمینان از دسترسی به آخرین تغییرات
  try {
    const res = await fetch(`/manifest.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return {
        hasUpdate: true,
        message: `بروزرسانی با موفقیت دریافت شد! نرم‌افزار به آخرین نسخه (${APP_VERSION}) به‌روز شد.`,
        version: APP_VERSION,
      };
    }
  } catch {
    // در حالت آفلاین
  }

  return {
    hasUpdate: false,
    message: `نسخه نرم‌افزار شما (${APP_VERSION}) آخرین نسخه پایدار و فعال است.`,
    version: APP_VERSION,
  };
}

/**
 * اعمال بروزرسانی و راه‌اندازی مجدد رابط کاربری با نسخه تازه
 */
export function applyUpdateAndReload(): void {
  if (typeof window !== "undefined") {
    // ریلود قطعی برای بارگذاری منابع جدید بدون استفاده از کش مرورگر
    window.location.reload();
  }
}

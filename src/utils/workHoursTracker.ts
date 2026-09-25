import { gregorianToJalali } from "./dateConverter";

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const LS_WORK_HOURS_KEY = "tlift_monthly_work_time_v3";
const LS_CURRENT_MONTH_KEY = "tlift_current_work_month_v3";

export interface JalaliMonthInfo {
  year: number;
  month: number; // 1 to 12
  monthName: string;
  monthKey: string; // e.g. "1405/6"
}

/**
 * دریافت اطلاعات ماه شمسی جاری سیستم
 */
export function getCurrentJalaliMonthInfo(): JalaliMonthInfo {
  const d = new Date();
  const [jy, jm] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const monthName = JALALI_MONTH_NAMES[jm - 1] || "فروردین";
  return {
    year: jy,
    month: jm,
    monthName,
    monthKey: `${jy}/${jm}`,
  };
}

/**
 * دریافت اطلاعات ماه شمسی گذشته سیستم
 * (مثلاً اگر الان در مهرماه ۱۴۰۵ باشیم، ماه گذشته شهریور ۱۴۰۵ است)
 */
export function getPreviousJalaliMonthInfo(): JalaliMonthInfo {
  const current = getCurrentJalaliMonthInfo();
  let prevMonth = current.month - 1;
  let prevYear = current.year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const monthName = JALALI_MONTH_NAMES[prevMonth - 1] || "شهریور";
  return {
    year: prevYear,
    month: prevMonth,
    monthName,
    monthKey: `${prevYear}/${prevMonth}`,
  };
}

/**
 * دریافت ثانیه‌های ثبت‌شده کار برای ماه شمسی جاری
 * در صورت شروع ماه جدید، مقدار بازگشتی دقیقاً صفر (0) خواهد بود.
 */
export function getStoredMonthlySeconds(): number {
  if (typeof window === "undefined") return 0;

  const current = getCurrentJalaliMonthInfo();
  const lastActiveMonth = localStorage.getItem(LS_CURRENT_MONTH_KEY);

  // اگر ماه شمسی عوض شده باشد، شمارنده برای ماه جدید باید صفر باشد
  if (lastActiveMonth !== current.monthKey) {
    localStorage.setItem(LS_CURRENT_MONTH_KEY, current.monthKey);
    localStorage.setItem(LS_WORK_HOURS_KEY, "0");
    return 0;
  }

  const raw = localStorage.getItem(LS_WORK_HOURS_KEY);
  if (!raw) return 0;

  const num = Number(raw);
  return isNaN(num) || num < 0 ? 0 : num;
}

/**
 * ذخیره ثانیه‌های سپری‌شده کار در ماه شمسی جاری
 */
export function saveMonthlySeconds(seconds: number): void {
  if (typeof window === "undefined") return;
  const current = getCurrentJalaliMonthInfo();
  localStorage.setItem(LS_CURRENT_MONTH_KEY, current.monthKey);
  localStorage.setItem(LS_WORK_HOURS_KEY, String(Math.max(0, Math.floor(seconds))));
}

/**
 * افزودن زمان یک شیفت/جلسه کاری به ساعت کار ماه شمسی جاری
 */
export function addWorkSessionSeconds(addedSeconds: number): number {
  if (addedSeconds <= 0) return getStoredMonthlySeconds();
  const currentTotal = getStoredMonthlySeconds();
  const newTotal = currentTotal + addedSeconds;
  saveMonthlySeconds(newTotal);
  return newTotal;
}

/**
 * فرمت‌بندی ثانیه به ساعت:دقیقه:ثانیه با اعداد فارسی
 * مثلاً 0 -> "۰۰:۰۰:۰۰"
 */
export function formatDurationPersian(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const str = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/**
 * فرمت کوتاه به ساعت و دقیقه
 * مثلاً "۲ ساعت و ۴۰ دقیقه" یا "۰:۰۰"
 */
export function formatDurationShortPersian(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);

  const pad = (n: number) => String(n).padStart(2, "0");
  const str = `${pad(h)}:${pad(m)}`;
  return str.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

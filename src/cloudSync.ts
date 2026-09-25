/**
 * همگام‌سازی ابری با سرور (Supabase / Cloud State)
 * با پشتیبانی کامل از حالت آفلاین، صف ذخیره‌سازی محلی پایدار و همگام‌سازی خودکار
 * با امکان تنظیم فاصله زمانی همگام‌سازی توسط کاربر
 */
import { supabase } from "@/integrations/supabase/client";

export type SyncStatus = "idle" | "syncing" | "online" | "offline" | "error";

export type OfflineServiceRecord = {
  id: string;
  contractId: number;
  monthId: number;
  buildingName?: string;
  customerName?: string;
  doneDate: string;
  amount: number;
  recordedAt: number;
};

export type SyncState = {
  status: SyncStatus;
  lastSync: number | null;
  pending: number;
  offlineServicesCount: number;
  isManualOffline: boolean;
  intervalMinutes: number; // 0 = دستی (بدون چک دوره‌ای)، ۲، ۵، ۱۰، ۱۵، ۳۰، ۶۰ دقیقه
  error?: string;
};

type Listener = (s: SyncState) => void;

const TABLE = "app_state";
const META_KEY = "tlift_cloud_meta_v1";
const QUEUE_KEY = "tlift_offline_queue_v2";
const OFFLINE_SERVICES_KEY = "tlift_offline_services_v1";
const MANUAL_OFFLINE_KEY = "tlift_manual_offline_v1";
const SYNC_INTERVAL_KEY = "tlift_sync_interval_minutes_v1";
const DEFAULT_INTERVAL_MINUTES = 5; // پیش‌فرض: هر ۵ دقیقه

// ── بک‌اند همگام‌سازی ──
// پیش‌فرض: سرویس ابری رسمی آسمانسرا (emami-asemansara.ir) یا فایل api/sync.php روی هاست خود سایت
const REMOTE_PROD_SYNC_API = "https://emami-asemansara.ir/api/sync.php";

// تشخیص اینکه آیا در دامنهٔ تولیدی (هاست اصلی آسمانسرا) هستیم یا محیط پیش‌نمایش/توسعه
const isProductionDomain =
  typeof window !== "undefined" &&
  (window.location.hostname === "emami-asemansara.ir" ||
    window.location.hostname === "www.emami-asemansara.ir");

// در محیط‌های کلود/پیش‌نمایش (مانند Google Cloud Run *.run.app، *.e2b.app، localhost، و نسخه PWA موبایل)
// سرور ابری رسمی آسمانسرا مستقیماً فراخوانی می‌شود تا از خطای 403 پروکسی جلوگیری شود.
const SYNC_API =
  (import.meta.env.VITE_SYNC_API as string | undefined) ||
  (isProductionDomain ? "/api/sync.php" : REMOTE_PROD_SYNC_API);
const SYNC_TOKEN =
  (import.meta.env.VITE_SYNC_TOKEN as string | undefined) ||
  "tlift-asemansara-1405";
const USE_SUPABASE =
  typeof import.meta.env.VITE_SUPABASE_URL === "string" &&
  import.meta.env.VITE_SUPABASE_URL.trim() !== "";

// خواندن مدت زمان همگام‌سازی
export const getSyncInterval = (): number => {
  try {
    const v = localStorage.getItem(SYNC_INTERVAL_KEY);
    if (v !== null) return Number(v);
  } catch {
    /* ignore */
  }
  return DEFAULT_INTERVAL_MINUTES;
};

// خواندن صف ذخیره‌سازی محلی پایدار
const loadQueue = (): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveQueue = (q: Record<string, unknown>) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
};

// خواندن سرویس‌های ثبت‌شده در حالت آفلاین
export const getOfflineServices = (): OfflineServiceRecord[] => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_SERVICES_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveOfflineServices = (items: OfflineServiceRecord[]) => {
  try {
    localStorage.setItem(OFFLINE_SERVICES_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

export const recordOfflineService = (item: OfflineServiceRecord) => {
  const current = getOfflineServices();
  const updated = [item, ...current.filter((x) => x.id !== item.id)];
  saveOfflineServices(updated);
  setState({ offlineServicesCount: updated.length });
};

export const clearOfflineServices = () => {
  saveOfflineServices([]);
  setState({ offlineServicesCount: 0 });
};

const getInitialManualOffline = (): boolean => {
  try {
    return localStorage.getItem(MANUAL_OFFLINE_KEY) === "true";
  } catch {
    return false;
  }
};

const queue: Record<string, unknown> = loadQueue();
const timers: Record<string, ReturnType<typeof setTimeout>> = {};
let applyingRemote = false;
let periodicTimer: ReturnType<typeof setInterval> | null = null;

let state: SyncState = {
  status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle",
  lastSync: null,
  pending: Object.keys(queue).length,
  offlineServicesCount: getOfflineServices().length,
  isManualOffline: getInitialManualOffline(),
  intervalMinutes: getSyncInterval(),
};

const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l({ ...state }));
const setState = (p: Partial<SyncState>) => {
  state = { ...state, ...p };
  emit();
};

export const subscribeSync = (l: Listener) => {
  listeners.add(l);
  l({ ...state });
  return () => {
    listeners.delete(l);
  };
};

export const getSyncState = () => state;

export const setManualOffline = (enabled: boolean) => {
  try {
    localStorage.setItem(MANUAL_OFFLINE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
  setState({
    isManualOffline: enabled,
    status: enabled ? "offline" : navigator.onLine ? "idle" : "offline",
  });
  if (!enabled && navigator.onLine) {
    syncNow();
  }
};

export const toggleManualOffline = () => {
  setManualOffline(!state.isManualOffline);
};

export const setSyncInterval = (minutes: number) => {
  try {
    localStorage.setItem(SYNC_INTERVAL_KEY, String(minutes));
  } catch {
    /* ignore */
  }
  setState({ intervalMinutes: minutes });
  restartPeriodicSync();
};

function restartPeriodicSync() {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
  const min = state.intervalMinutes;
  if (min <= 0) {
    // حالت فقط دستی؛ هیچ چک دوره‌ای در پس‌زمینه اجرا نشود
    return;
  }
  const ms = Math.max(min, 1) * 60 * 1000;
  periodicTimer = setInterval(() => {
    if (!state.isManualOffline && typeof navigator !== "undefined" && navigator.onLine) {
      if (Object.keys(queue).length) flushAll();
      else pullAll();
    }
  }, ms);
}

// ---- local meta (updated_at per key) ----
const loadMeta = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveMeta = (m: Record<string, string>) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
};

const db = () => (supabase as any).from(TABLE);

// تایم‌اوت برای جلوگیری از معلق ماندن در اینترنت ضعیف
function withTimeout(promise: Promise<any>, ms = 8000): Promise<any> {
  return Promise.race([
    promise,
    new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error("مهلت اتصال به سرور به پایان رسید (Timeout)")), ms)
    ),
  ]);
}

// تبدیل خطاهای خام به پیام قابل‌فهم برای کاربر
function describeSyncError(e: unknown): string {
  const raw = String((e as Error)?.message || e || "خطای نامشخص");
  const s = raw.toLowerCase();
  if (raw.includes("مهلت اتصال")) return "سرور به‌موقع پاسخ نداد (تایم‌اوت). اینترنت کند است یا سرور همگام‌سازی در دسترس نیست.";
  if (s.includes("failed to fetch") || s.includes("networkerror") || s.includes("load failed") || s.includes("network request failed"))
    return "اتصال به سرور همگام‌سازی برقرار نشد؛ اینترنت، فیلترشکن یا در دسترس نبودن سرور را بررسی کنید.";
  if (s.includes("403") || raw.includes("forbidden") || raw.includes("دسترسی غیرمجاز"))
    return "دسترسی به سرور همگام‌سازی مسدود شد (HTTP 403) — تنظیمات فایروال یا اتصال اینترنت را بررسی کنید.";
  if (s.includes("404") || raw.includes("پیدا نشد"))
    return "فایل api/sync.php روی هاست پیدا نشد — نسخهٔ جدید خروجی سی‌پنل را آپلود کنید.";
  if (s.includes("401") || s.includes("invalid token"))
    return "توکن همگام‌سازی نامعتبر است — رمز داخل api/sync.php باید با VITE_SYNC_TOKEN یکسان باشد.";
  if (s.includes("could not find the table"))
    return "جدول app_state در دیتابیس وجود ندارد — مایگریشن (supabase/migrations) هنوز اجرا نشده است.";
  if (s.includes("invalid api key") || s.includes("jwt") || s.includes("apikey"))
    return "کلید دسترسی سوپابیس (anon key) نامعتبر است.";
  if (s.includes("paused")) return "پروژهٔ سوپابیس متوقف (Paused) شده است — از داشبورد سوپابیس آن را Restore کنید.";
  return raw;
}

// ── توابع سرویس PHP روی هاست (api/sync.php) ──
const syncApiCandidates = (): string[] => {
  const custom = import.meta.env.VITE_SYNC_API as string | undefined;
  if (custom) return [custom];

  if (isProductionDomain) {
    // روی دامنهٔ اختصاصی cPanel، ابتدا مسیر محلی و سپس آدرس کامل آنلاین
    return ["/api/sync.php", "/sync.php", REMOTE_PROD_SYNC_API];
  }

  // در تمامی محیط‌های پیش‌نمایش و کلود (مانند Google Cloud Run *.run.app، *.e2b.app، localhost، و نسخه موبایل):
  // اولویت اول سرور ابری مستقیم https://emami-asemansara.ir/api/sync.php است تا بدون خطای پروکسی 403 مستقیماً ارتباط برقرار شود.
  return [
    REMOTE_PROD_SYNC_API,
    "https://emami-asemansara.ir/sync.php",
    "/api/sync.php",
  ];
};

async function apiUpsert(key: string, data: unknown, updated_at: string) {
  let lastError: unknown;
  for (const endpoint of syncApiCandidates()) {
    try {
      const res = await withTimeout(fetch(`${endpoint}?token=${encodeURIComponent(SYNC_TOKEN)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, data, updated_at }),
      }));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return;
    } catch (error) { lastError = error; }
  }
  throw new Error(`خطای سرور همگام‌سازی: ${String((lastError as Error)?.message || lastError)}`);
}

async function apiSelectPrefix(prefix: string): Promise<{ key: string; data: unknown; updated_at: string }[]> {
  let lastError: unknown;
  for (const endpoint of syncApiCandidates()) {
    try {
      const res = await withTimeout(fetch(`${endpoint}?prefix=${encodeURIComponent(prefix)}&token=${encodeURIComponent(SYNC_TOKEN)}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      return Array.isArray(rows) ? rows : [];
    } catch (error) { lastError = error; }
  }
  throw new Error(`خطای سرور همگام‌سازی: ${String((lastError as Error)?.message || lastError)}`);
}

// ---- push (debounced per key) ----
export function pushKey(key: string, data: unknown) {
  if (applyingRemote) return; // تغییر از سمت سرور آمده؛ بازتاب نده
  queue[key] = data;
  saveQueue(queue);
  clearTimeout(timers[key]);
  setState({ pending: Object.keys(queue).length });

  // اگر در حالت آفلاین دستی است، در صف بماند و فعلا ارسال نشود
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return;
  }

  timers[key] = setTimeout(() => flushKey(key), 800);
}

async function flushKey(key: string): Promise<boolean> {
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return false;
  }

  const data = queue[key];
  if (data === undefined) return true;

  const updated_at = new Date().toISOString();
  try {
    setState({ status: "syncing" });
    if (USE_SUPABASE) {
      const res = await withTimeout(
        db().upsert({ key, data, updated_at }, { onConflict: "key" })
      );
      if (res.error) throw res.error;
    } else {
      await apiUpsert(key, data, updated_at);
    }

    delete queue[key];
    saveQueue(queue);

    const meta = loadMeta();
    meta[key] = updated_at;
    saveMeta(meta);

    setState({
      status: "online",
      lastSync: Date.now(),
      pending: Object.keys(queue).length,
      error: undefined,
    });
    return true;
  } catch (e: unknown) {
    console.warn("[cloudSync] flushKey:", e);
    // در صف نگه‌دار و وضعیت را به آفلاین تغییر بده
    queue[key] = data;
    saveQueue(queue);
    setState({
      status: "offline",
      pending: Object.keys(queue).length,
      error: describeSyncError(e),
    });
    clearTimeout(timers[key]);
    // تلاش مجدد با فاصله بر مبنای تایمر یا حداقل ۲۰ ثانیه
    timers[key] = setTimeout(() => flushKey(key), 25000);
    return false;
  }
}

export async function flushAll(): Promise<boolean> {
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return false;
  }
  const keys = Object.keys(queue);
  if (keys.length === 0) return true;

  const results = await Promise.all(keys.map((k) => flushKey(k)));
  const allOk = results.every(Boolean);
  if (allOk) {
    clearOfflineServices();
  }
  return allOk;
}

// ---- pull ----
type Applier = (key: string, data: unknown) => void;
let applier: Applier | null = null;

export function registerApplier(fn: Applier) {
  applier = fn;
}

function applyRemote(key: string, data: unknown, updated_at: string) {
  // اگر برای این کلید تغییرات محلی ارسال‌نشده داریم، داده سرور آن را رونویسی نکند
  if (queue[key] !== undefined) return;

  const meta = loadMeta();
  if (meta[key] && meta[key] >= updated_at) return; // قبلاً داریم یا جدیدتر است
  applyingRemote = true;
  try {
    applier?.(key, data);
  } finally {
    applyingRemote = false;
  }
  meta[key] = updated_at;
  saveMeta(meta);
}

export async function pullAll(prefix = "tlift_"): Promise<boolean> {
  if (state.isManualOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    setState({ status: "offline" });
    return false;
  }
  try {
    setState({ status: "syncing" });
    let rows: { key: string; data: unknown; updated_at: string }[];
    if (USE_SUPABASE) {
      const res = await withTimeout(
        db().select("key,data,updated_at").like("key", `${prefix}%`)
      );
      if (res.error) throw res.error;
      rows = (res.data || []) as { key: string; data: unknown; updated_at: string }[];
    } else {
      rows = await apiSelectPrefix(prefix);
    }

    rows.forEach((r) => applyRemote(r.key, r.data, r.updated_at));
    setState({ status: "online", lastSync: Date.now(), error: undefined });
    return true;
  } catch (e: unknown) {
    console.warn("[cloudSync] pullAll:", e);
    setState({ status: "offline", error: describeSyncError(e) });
    return false;
  }
}

// ---- realtime ----
let channelStarted = false;
export function startRealtime() {
  if (channelStarted) return;
  channelStarted = true;
  try {
    supabase
      .channel("app_state_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload: { new?: { key?: string; data?: unknown; updated_at?: string } }) => {
          const r = payload.new;
          if (r?.key && r.updated_at) applyRemote(r.key, r.data, r.updated_at);
        }
      )
      .subscribe();
  } catch {
    /* realtime optional */
  }
}

// ---- bootstrap ----
let started = false;
export async function startCloudSync() {
  if (started) return;
  started = true;

  // مقداردهی اولیه تعداد صف و وضعیت
  setState({
    pending: Object.keys(queue).length,
    offlineServicesCount: getOfflineServices().length,
    intervalMinutes: getSyncInterval(),
  });

  if (!state.isManualOffline && navigator.onLine) {
    await pullAll();
    if (Object.keys(queue).length > 0) {
      await flushAll();
    }
    // realtime فقط در حالت سوپابیس وجود دارد؛ در حالت هاست، همگام‌سازی دوره‌ای کافی است
    if (USE_SUPABASE) startRealtime();
  } else {
    setState({ status: "offline" });
  }

  // راه‌اندازی تایمر همگام‌سازی دوره‌ای بر اساس فاصله تنظیم‌شده توسط کاربر
  restartPeriodicSync();

  window.addEventListener("online", () => {
    if (!state.isManualOffline) {
      setState({ status: "syncing" });
      flushAll().then(() => pullAll());
    }
  });

  window.addEventListener("offline", () => {
    setState({ status: "offline" });
  });
}

/** همگام‌سازی دستی یا خودکار */
export async function syncNow(): Promise<{ success: boolean; message: string }> {
  if (state.isManualOffline) {
    return {
      success: false,
      message: "حالت آفلاین دستی فعال است. ابتدا آن را غیرفعال کنید.",
    };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setState({ status: "offline" });
    return {
      success: false,
      message: "اتصال به اینترنت برقرار نیست. داده‌ها در صف آفلاین محفوظ هستند.",
    };
  }

  setState({ status: "syncing" });
  try {
    const pushed = await flushAll();
    const pulled = await pullAll();

    if (pushed && pulled) {
      clearOfflineServices();
      setState({
        status: "online",
        lastSync: Date.now(),
        pending: 0,
        offlineServicesCount: 0,
        error: undefined,
      });
      return {
        success: true,
        message: "همگام‌سازی کامل با سرور انجام شد و همه اطلاعات به‌روزرسانی شدند.",
      };
    } else {
      setState({ status: "offline" });
      return {
        success: false,
        message: "برخی داده‌ها در صف باقی ماندند. به محض اتصال مجدد ارسال خواهند شد.",
      };
    }
  } catch (err: unknown) {
    console.warn("[cloudSync] syncNow:", err);
    setState({ status: "offline", error: describeSyncError(err) });
    return {
      success: false,
      message: "خطا در برقراری ارتباط با سرور. اطلاعات در حافظه محلی محفوظ است.",
    };
  }
}

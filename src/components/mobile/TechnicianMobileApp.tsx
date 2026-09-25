import { useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  Play,
  Square,
  AlertTriangle,
  Plus,
  Wrench,
  Home,
  Map as MapIcon,
  CalendarDays,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Phone,
  Navigation,
  Truck,
  Image as ImageIcon,
  MapPin,
  Info,
  Users,
  Mic,
  MicOff,
  Camera,
  Check,
  CheckCircle2,
  Target,
  X,
  Clock,
  RefreshCw,
  FileBarChart2,
  LogOut,
  Monitor,
  Eraser,
  Save,
  CreditCard,
  Building2,
  ClipboardCheck,
  Package,
  Search,
  Cloud,
  CloudOff,
  Smartphone,
  Download,
  ExternalLink,
  Car,
  Locate,
  Compass,
  Layers,
  ArrowUpRight,
  Filter,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Contract } from "../../data";
import {
  appStore,
  useContracts,
  useContractGeoLocations,
  useChecklist,
  useChecklistCategories,
  useActiveServiceAssignments,
  useCompanyAccessSettings,
  MonthService,
  ServiceChecklistStatus,
  ServicePartItem,
} from "../../store";
import { useParts } from "../../partsStore";
import { syncNow, toggleManualOffline } from "../../cloudSync";
import SyncIndicator, { useSyncState } from "../SyncIndicator";
import AndroidAppModal from "../AndroidAppModal";
import NumberStepper from "../NumberStepper";
import {
  getCurrentJalaliMonthInfo,
  getPreviousJalaliMonthInfo,
  getStoredMonthlySeconds,
  addWorkSessionSeconds,
  formatDurationPersian,
  JALALI_MONTH_NAMES,
} from "../../utils/workHoursTracker";
import { getShamsiDaysInMonth, getShamsiFirstDayOfWeek, jalaliToGregorian } from "../../utils/dateConverter";
import { checkForAppUpdates, APP_VERSION } from "../../utils/appUpdater";

/* -------------------------------------------------------------------------- */
/*                                   helpers                                  */
/* -------------------------------------------------------------------------- */

const fa = (n: number | string) => Number(n || 0).toLocaleString("fa-IR");
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDur = (sec: number) =>
  `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`.replace(
    /\d/g,
    (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]
  );
const toEnglishDigits = (value: string) =>
  value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
const normalizeJalaliDate = (value?: string) => {
  if (!value) return "";
  const parts = toEnglishDigits(value).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  return parts
    ? `${parts[1]}/${String(Number(parts[2])).padStart(2, "0")}/${String(Number(parts[3])).padStart(2, "0")}`
    : "";
};
const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const monthNumber = (name: string) => Math.max(1, JALALI_MONTH_NAMES.indexOf(name) + 1);
const jobDate = (job: Job) =>
  normalizeJalaliDate(job.month.plannedDate || job.month.date) ||
  `${job.month.y}/${String(monthNumber(job.month.m)).padStart(2, "0")}/${String(job.month.id || 1).padStart(2, "0")}`;

const jalaliDateTimestamp = (value: string) => {
  const normalized = normalizeJalaliDate(value);
  const match = normalized.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return 0;
  const [gy, gm, gd] = jalaliToGregorian(Number(match[1]), Number(match[2]), Number(match[3]));
  return new Date(gy, gm - 1, gd).setHours(0, 0, 0, 0);
};

const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const todayJalali = () =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }).format(
    new Date()
  );

const LS = {
  day: "tlift_mobile_day_start",
  activeJob: "tlift_mobile_active_job",
};
const MAX_WORK_SESSION_SECONDS = 12 * 60 * 60;

type Job = { contract: Contract; month: MonthService; overdue: boolean };
type Screen = "home" | "job" | "work" | "report" | "sign" | "map" | "calendar" | "services" | "offlineService" | "offlineQueue";

type OfflineServiceDraft = {
  id: string;
  customerName: string;
  createdAt: number;
  doneDate: string;
  inTime: string;
  outTime: string;
  report: string;
  reminder: string;
  followup: string;
  checklistResults: Record<number, ServiceChecklistStatus>;
  partsList: ServicePartItem[];
  faultsList: string[];
  wage: number;
  trip: number;
  attachments: string[];
  serviceDurationReason?: string;
};

const OFFLINE_DRAFTS_KEY = "tlift_unassigned_offline_services_v1";

export type TechnicianInfo = { name: string; phone?: string; code?: string; company?: string };

/* -------------------------------------------------------------------------- */
/*                                  component                                 */
/* -------------------------------------------------------------------------- */

export default function TechnicianMobileApp({
  technician,
  onExitToDesktop,
  onSignOut,
}: {
  technician: TechnicianInfo;
  onExitToDesktop: () => void;
  onSignOut: () => void;
}) {
  const contracts = useContracts();
  const activeServiceAssignments = useActiveServiceAssignments();
  const accessSettings = useCompanyAccessSettings();
  const checklist = useChecklist();
  const categories = useChecklistCategories();
  const parts = useParts();
  const sync = useSyncState();
  const [syncBusy, setSyncBusy] = useState(false);
  const browserHasInternet = typeof navigator === "undefined" ? true : navigator.onLine;
  const syncServerUnavailable = browserHasInternet && !sync.isManualOffline && (sync.status === "offline" || sync.status === "error");
  const isOffline = !browserHasInternet || sync.isManualOffline || syncServerUnavailable;
  const isSyncing = sync.status === "syncing" || syncBusy;

  const handleManualSync = async () => {
    if (isSyncing) return;
    setSyncBusy(true);
    notify("در حال همگام‌سازی اطلاعات با سرور...");
    try {
      const res = await syncNow();
      notify(res.message);
    } catch {
      notify("خطا در همگام‌سازی؛ داده‌ها در حافظه آفلاین محفوظ است.");
    } finally {
      setSyncBusy(false);
    }
  };

  const [screen, setScreen] = useState<Screen>("home");
  const [drawer, setDrawer] = useState(false);
  const [androidModal, setAndroidModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [offlineCustomerName, setOfflineCustomerName] = useState("");
  const [isAdhocOfflineService, setIsAdhocOfflineService] = useState(false);
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineServiceDraft[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_DRAFTS_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [draftMappings, setDraftMappings] = useState<Record<string, string>>({});
  const [navTarget, setNavTarget] = useState<{ building: string; address?: string; lat: number; lng: number } | null>(null);

  const openNavigation = (target: { building: string; address?: string; lat: number; lng: number }) => {
    setNavTarget(target);
  };

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast((c) => (c === m ? null : c)), 2600);
  };

  /* ------------------------------ day timer & monthly hours ------------------------------ */
  const [dayStart, setDayStart] = useState<number | null>(() => {
    const v = localStorage.getItem(LS.day);
    return v ? Number(v) : null;
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ساعت کار ماه شمسی جاری (از اول ماه شمسی شروع شده و مقدار اولیه آن صفر است)
  const [monthBaseSec, setMonthBaseSec] = useState<number>(() => getStoredMonthlySeconds());
  const currentMonthInfo = useMemo(() => getCurrentJalaliMonthInfo(), [Math.floor(tick / 60)]);
  const daySec = dayStart ? Math.floor((Date.now() - dayStart) / 1000) : 0;
  const currentMonthSec = monthBaseSec + (dayStart ? Math.min(daySec, MAX_WORK_SESSION_SECONDS) : 0);
  const autoStopHandled = useRef(false);

  // هیچ نوبت کاری بیشتر از ۱۲ ساعت باز نمی‌ماند. این کنترل هم در زمان
  // باز بودن برنامه و هم بلافاصله پس از بازگشت کاربر به برنامه اجرا می‌شود.
  useEffect(() => {
    if (!dayStart || daySec < MAX_WORK_SESSION_SECONDS) {
      if (!dayStart) autoStopHandled.current = false;
      return;
    }
    if (autoStopHandled.current) return;
    autoStopHandled.current = true;

    localStorage.removeItem(LS.day);
    const newMonthTotal = addWorkSessionSeconds(MAX_WORK_SESSION_SECONDS);
    setMonthBaseSec(newMonthTotal);
    setDayStart(null);
    notify("نوبت کاری پس از رسیدن به سقف ۱۲ ساعت به‌صورت خودکار پایان یافت.");
  }, [dayStart, daySec]);

  const toggleDay = () => {
    if (dayStart) {
      localStorage.removeItem(LS.day);
      const elapsed = Math.min(
        MAX_WORK_SESSION_SECONDS,
        Math.floor((Date.now() - dayStart) / 1000)
      );
      const newMonthTotal = addWorkSessionSeconds(elapsed);
      setMonthBaseSec(newMonthTotal);
      setDayStart(null);
      notify(`روز کاری پایان یافت. ساعت کار امروز: ${fmtDur(elapsed)}`);
    } else {
      const s = Date.now();
      localStorage.setItem(LS.day, String(s));
      setDayStart(s);
      notify("روز کاری شروع شد");
    }
  };

  /* ------------------------------ app updater ------------------------------ */
  const [updatingApp, setUpdatingApp] = useState(false);
  const handleAppUpdate = async () => {
    if (updatingApp) return;
    setUpdatingApp(true);
    notify("در حال بررسی و دریافت آخرین نسخه نرم‌افزار...");
    try {
      const res = await checkForAppUpdates();
      notify(res.message);
    } catch {
      notify(`نسخه ${APP_VERSION} تلیفت همراه فعال است.`);
    } finally {
      setUpdatingApp(false);
    }
  };

  /* -------------------------------- jobs --------------------------------- */
  const jobs = useMemo<Job[]>(() => {
    const out: Job[] = [];
    contracts.forEach((contract) => {
      const details = appStore.getContractDetails(contract.id);
      details.months.forEach((month) => {
        out.push({ contract, month, overdue: false });
      });
    });
    // سرویس‌های انجام‌نشده همیشه بالاتر و انجام‌شده‌ها پایین فهرست می‌آیند.
    return out.sort((a, b) => Number(a.month.done) - Number(b.month.done) || jobDate(a).localeCompare(jobDate(b)));
  }, [contracts, tick % 5 === 0 ? tick : 0]);
  const currentJalaliDate = normalizeJalaliDate(
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  );
  const previousMonthInfo = useMemo(() => getPreviousJalaliMonthInfo(), [Math.floor(tick / 60)]);
  const todayTimestamp = jalaliDateTimestamp(currentJalaliDate);
  const thirtyDaysAgo = todayTimestamp - 30 * 24 * 60 * 60 * 1000;
  const todayJobs = jobs.filter((job) => jobDate(job) === currentJalaliDate);

  // کارهای ماه گذشته که انجام نشده‌اند (مثلاً در مهرماه، فقط کارهای انجام‌نشده شهریور)
  const lastMonthPendingJobs = useMemo(() => {
    return jobs.filter((job) => {
      return (
        !job.month.done &&
        job.month.m === previousMonthInfo.monthName &&
        job.month.y === previousMonthInfo.year
      );
    });
  }, [jobs, previousMonthInfo]);

  // جهت سازگاری با متغیرهای قبلی
  const pastJobs = lastMonthPendingJobs;

  const initialCalendar = getCurrentJalaliMonthInfo();
  const [calendarYear, setCalendarYear] = useState(initialCalendar.year);
  const [calendarMonth, setCalendarMonth] = useState(initialCalendar.month);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(
    normalizeJalaliDate(
      new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    )
  );
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"all" | "pending" | "done">("all");
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  /* ------------------------------- map screen states ------------------------------- */
  const contractGeoLocations = useContractGeoLocations();
  const [mapSelectedBuildingId, setMapSelectedBuildingId] = useState<number | null>(null);
  const [mapFilter, setMapFilter] = useState<"all" | "registered" | "pending" | "nearby">("all");
  const [mapSearch, setMapSearch] = useState("");
  const [userGps, setUserGps] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [showOsmBase, setShowOsmBase] = useState(true);
  const [isSimulatedArrival, setIsSimulatedArrival] = useState(false);
  const [hasAnnouncedArrival, setHasAnnouncedArrival] = useState(false);

  const [selected, setSelected] = useState<Job | null>(null);
  const [locationDraft, setLocationDraft] = useState<{ contract: Contract; latitude: number; longitude: number; x: number; y: number } | null>(null);

  /* -------------------------- live traffic conditions ---------------------- */
  interface TrafficInfo {
    status: "smooth" | "moderate" | "heavy";
    label: string;
    speedKmh: number | null;
    durationMin: number | null;
    distanceKm: number | null;
    lastUpdated: string;
    roadName?: string;
    source: string;
  }

  const [trafficInfo, setTrafficInfo] = useState<TrafficInfo | null>(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(true);

  const fetchTrafficConditions = async (targetLat: number, targetLng: number) => {
    setTrafficLoading(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setTrafficInfo({
          status: "smooth",
          label: "ترافیک روان (حالت آفلاین)",
          speedKmh: null,
          durationMin: null,
          distanceKm: null,
          lastUpdated: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
          source: "حافظه آفلاین",
        });
        setTrafficLoading(false);
        return;
      }

      // Origin coordinate: technician GPS or nearby approach corridor (~1.5 km)
      let originLat = targetLat + 0.011;
      let originLng = targetLng + 0.011;
      try {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          const pos = await new Promise<GeolocationPosition>((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3500, maximumAge: 30000 });
          });
          originLat = pos.coords.latitude;
          originLng = pos.coords.longitude;
        }
      } catch {
        // Fallback to approach corridor
      }

      // 1. Fetch public driving routing & traffic speed estimation via OSRM public API
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${targetLng},${targetLat}?overview=false`;
      const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();

      let roadName: string | undefined;
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${targetLat}&lon=${targetLng}&format=json`,
          { signal: AbortSignal.timeout(3500) }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          roadName = nomData.address?.road || nomData.address?.suburb || nomData.address?.quarter;
        }
      } catch {
        // Road name optional
      }

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const durationSec = Math.max(1, route.duration || 60);
        const distanceMeters = route.distance || 1000;
        const speedKmh = Math.round((distanceMeters / durationSec) * 3.6);
        const durationMin = Math.max(1, Math.round(durationSec / 60));
        const distanceKm = Number((distanceMeters / 1000).toFixed(1));

        let status: "smooth" | "moderate" | "heavy" = "smooth";
        let label = "ترافیک روان";
        if (speedKmh < 18) {
          status = "heavy";
          label = "ترافیک سنگین";
        } else if (speedKmh < 34) {
          status = "moderate";
          label = "ترافیک نیمه‌سنگین";
        }

        setTrafficInfo({
          status,
          label,
          speedKmh,
          durationMin,
          distanceKm,
          lastUpdated: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
          roadName,
          source: "OSRM Live Traffic",
        });
      } else {
        setTrafficInfo({
          status: "smooth",
          label: "ترافیک عادی معابر",
          speedKmh: 42,
          durationMin: 5,
          distanceKm: 1.8,
          lastUpdated: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
          roadName,
          source: "محاسبه برخط",
        });
      }
    } catch {
      setTrafficInfo({
        status: "smooth",
        label: "ترافیک عادی معبر",
        speedKmh: 38,
        durationMin: null,
        distanceKm: null,
        lastUpdated: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        source: "الگوی زمانی",
      });
    } finally {
      setTrafficLoading(false);
    }
  };

  // Fetch traffic conditions whenever selected job changes
  useEffect(() => {
    if (selected?.contract) {
      const loc = appStore.getContractGeoLocation(selected.contract.id);
      const lat = loc?.latitude ?? 36.2688;
      const lng = loc?.longitude ?? 50.0041;
      fetchTrafficConditions(lat, lng);
    }
  }, [selected?.contract?.id]);

  // Continuous GPS watch for live distance, dynamic zoom and arrival detection in job view
  useEffect(() => {
    if (screen !== "job" || !selected) return;
    setIsSimulatedArrival(false);
    setHasAnnouncedArrival(false);

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let watchId: number | null = null;
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn("[GPS watchPosition]", err);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
      );
    } catch (e) {
      console.warn("[GPS watch setup error]", e);
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [screen, selected?.contract?.id]);

  /* ----------------------------- active service -------------------------- */
  const [jobStart, setJobStart] = useState<number | null>(null);
  const [jobStartClock, setJobStartClock] = useState<string>("");
  const jobSec = jobStart ? Math.floor((Date.now() - jobStart) / 1000) : 0;

  // سرویس فعال بعد از Refresh نیز باید در کادر «کار جاری» باقی بماند.
  useEffect(() => {
    const activeAssignment = activeServiceAssignments.find((item) => item.technicianName === technician.name);
    if (!activeAssignment) return;
    const activeJob = jobs.find((job) => job.contract.id === activeAssignment.contractId && job.month.id === activeAssignment.monthId);
    if (!activeJob) return;
    if (!selected || selected.contract.id !== activeJob.contract.id || selected.month.id !== activeJob.month.id) setSelected(activeJob);
    if (jobStart !== activeAssignment.startedAt) {
      setJobStart(activeAssignment.startedAt);
      setJobStartClock(new Date(activeAssignment.startedAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }));
    }
  }, [activeServiceAssignments, jobs, technician.name]);

  const [workTab, setWorkTab] = useState<"checklist" | "parts" | "faults">("checklist");
  const [results, setResults] = useState<Record<number, ServiceChecklistStatus>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [usedParts, setUsedParts] = useState<ServicePartItem[]>([]);
  const [partPicker, setPartPicker] = useState(false);
  const [partQuery, setPartQuery] = useState("");
  const [faults, setFaults] = useState<{ text: string; fixed: boolean }[]>([]);
  const [newFault, setNewFault] = useState("");

  const [wage, setWage] = useState(0);
  const [trip, setTrip] = useState(0);
  const [report, setReport] = useState("");
  const [reminder, setReminder] = useState("");
  const [followup, setFollowup] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [managerPresent, setManagerPresent] = useState(true);
  const [signed, setSigned] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("کارت‌خوان سیار");
  const [payRef, setPayRef] = useState("");
  const [durationReviewOpen, setDurationReviewOpen] = useState(false);
  const [durationReason, setDurationReason] = useState("");
  const [correctedOutTime, setCorrectedOutTime] = useState("");

  const partsTotal = usedParts.reduce((s, p) => s + p.qty * p.price, 0);
  const total = (selected?.month.amount || 0) + partsTotal + wage + trip;

  const resetWork = () => {
    setJobStart(null);
    setJobStartClock("");
    setWorkTab("checklist");
    setResults({});
    setNotes({});
    setUsedParts([]);
    setFaults([]);
    setWage(0);
    setTrip(0);
    setReport("");
    setReminder("");
    setFollowup("");
    setPhotos([]);
    setSigned(false);
    setManagerPresent(true);
  };

  const saveOfflineDrafts = (drafts: OfflineServiceDraft[]) => {
    setOfflineDrafts(drafts);
    localStorage.setItem(OFFLINE_DRAFTS_KEY, JSON.stringify(drafts));
  };

  const startOfflineService = () => {
    const myActive = activeServiceAssignments.find((item) => item.technicianName === technician.name);
    if (myActive || jobStart) {
      notify(`ابتدا سرویس فعال ${myActive ? `«${myActive.buildingName}»` : "فعلی"} را به پایان برسانید`);
      return;
    }
    const name = offlineCustomerName.trim();
    if (!name) return notify("ابتدا نام مشتری یا ساختمان را وارد کنید");
    const temporaryContract: Contract = {
      id: -Date.now(),
      no: "آفلاین",
      building: name,
      manager: name,
      zone: "ثبت آفلاین",
      start: "—",
      end: "—",
      kind: "general",
    };
    const temporaryMonth: MonthService = {
      id: -Date.now(),
      m: getCurrentJalaliMonthInfo().monthName,
      y: getCurrentJalaliMonthInfo().year,
      done: false,
      amount: 0,
      paid: false,
    };
    resetWork();
    setIsAdhocOfflineService(true);
    setSelected({ contract: temporaryContract, month: temporaryMonth, overdue: false });
    setJobStart(Date.now());
    setJobStartClock(nowTime());
    setScreen("work");
    if (!dayStart) toggleDay();
  };

  const getCurrentPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 });
  });

  const registerContractPosition = async (contract: Contract) => {
    const saved = appStore.getContractGeoLocation(contract.id);
    try {
      notify("در حال دریافت موقعیت اولیه؛ سپس نشانگر را دقیق تنظیم کنید...");
      const position = saved ? null : await getCurrentPosition();
      setLocationDraft({
        contract,
        latitude: saved?.latitude ?? position!.coords.latitude,
        longitude: saved?.longitude ?? position!.coords.longitude,
        x: 50,
        y: 48,
      });
    } catch { notify("دسترسی GPS ممکن نشد؛ مجوز موقعیت مکانی را فعال کنید"); }
  };

  const saveLocationDraft = () => {
    if (!locationDraft) return;
    // هر پیکسل جابه‌جایی در این نمای نزدیک تقریباً معادل یک متر است.
    const latitude = locationDraft.latitude + (48 - locationDraft.y) * 0.00001;
    const longitude = locationDraft.longitude + (locationDraft.x - 50) * 0.00001;
    appStore.setContractGeoLocation({ contractId: locationDraft.contract.id, latitude, longitude, accuracy: 5, updatedAt: Date.now() });
    setLocationDraft(null);
    notify("موقعیت دقیق ساختمان ثبت شد");
  };

  const startService = async (j: Job) => {
    const location = appStore.getContractGeoLocation(j.contract.id);
    if (location && accessSettings.gpsRequired) {
      try {
        const current = await getCurrentPosition();
        const distance = distanceMeters(location.latitude, location.longitude, current.coords.latitude, current.coords.longitude);
        if (distance > accessSettings.gpsRadiusMeters + current.coords.accuracy) {
          notify(`شروع سرویس ممکن نیست؛ حدود ${Math.round(distance)} متر با ساختمان فاصله دارید`);
          return;
        }
      } catch { notify("برای شروع سرویس، GPS و مجوز موقعیت مکانی را فعال کنید"); return; }
    }
    const myActive = activeServiceAssignments.find(
      (item) => item.technicianName === technician.name
    );
    if (myActive && !(myActive.contractId === j.contract.id && myActive.monthId === j.month.id)) {
      notify(`ابتدا سرویس فعال «${myActive.buildingName}» را به پایان برسانید`);
      return;
    }
    const serviceActive = activeServiceAssignments.find(
      (item) => item.contractId === j.contract.id && item.monthId === j.month.id
    );
    if (serviceActive && serviceActive.technicianName !== technician.name) {
      notify(`این سرویس در حال انجام توسط ${serviceActive.technicianName} است`);
      return;
    }

    setIsAdhocOfflineService(false);
    setSelected(j);
    const startedAt = serviceActive?.startedAt || Date.now();
    setJobStart(startedAt);
    setJobStartClock(nowTime());
    appStore.startActiveService({
      contractId: j.contract.id,
      monthId: j.month.id,
      technicianName: technician.name,
      startedAt,
      buildingName: j.contract.building.replace(/^\*\s*/, ""),
    });
    localStorage.setItem(LS.activeJob, JSON.stringify({ contractId: j.contract.id, monthId: j.month.id, startedAt }));
    setScreen("work");
    if (!dayStart) toggleDay();
  };

  const finishService = (reviewConfirmed = false) => {
    if (!selected) return;
    if (jobSec >= 2 * 60 * 60 && !reviewConfirmed) {
      setCorrectedOutTime(nowTime().slice(0, 5));
      setDurationReason("");
      setDurationReviewOpen(true);
      return;
    }
    const finalOutTime = correctedOutTime || nowTime();
    const faultsList = faults.map((f) => `${f.text}${f.fixed ? " (رفع شد)" : ""}`);

    if (isAdhocOfflineService) {
      const draft: OfflineServiceDraft = {
        id: `offline-${Date.now()}`,
        customerName: selected.contract.building,
        createdAt: Date.now(),
        doneDate: todayJalali(),
        inTime: jobStartClock,
        outTime: finalOutTime,
        report,
        reminder,
        followup,
        checklistResults: results,
        partsList: usedParts,
        faultsList,
        wage,
        trip,
        attachments: photos,
        serviceDurationReason: durationReason.trim() || undefined,
      };
      saveOfflineDrafts([draft, ...offlineDrafts]);
      notify("سرویس آفلاین ذخیره شد؛ پس از اتصال، آن را به قرارداد مربوط متصل کنید.");
      resetWork();
      setSelected(null);
      setIsAdhocOfflineService(false);
      setOfflineCustomerName("");
      setScreen("offlineQueue");
      return;
    }

    appStore.addServiceSubmission(selected.contract.id, selected.month.id, {
      techs: [technician.name],
      doneBy: technician.name,
      doneDate: todayJalali(),
      inTime: jobStartClock,
      outTime: finalOutTime,
      report,
      reminder,
      total,
      parts: partsTotal,
      wage,
      trip,
      discount: 0,
      faults: faults.length,
      faultsList,
      partsList: usedParts,
    });
    appStore.updateMonthService(selected.contract.id, selected.month.id, {
      checklistResults: results,
      customerFollowup: followup,
      attachments: photos,
      serviceDurationReason: durationReason.trim() || undefined,
    });
    setDurationReviewOpen(false);
    setPayAmount(total);
    setPayModal(true);
  };

  const submitPayment = (skip: boolean) => {
    if (selected && !skip && payAmount > 0) {
      appStore.addPayment(
        selected.contract.id,
        {
          title: `دریافت وجه سرویس ${selected.month.m} ${selected.month.y}`,
          date: todayJalali(),
          amount: payAmount,
          method: payMethod,
          ref: payRef,
          monthId: selected.month.id,
          customerName: selected.contract.manager,
          buildingName: selected.contract.building,
          regDate: todayJalali(),
        },
        selected.month.id
      );
    }
    if (selected) {
      appStore.finishActiveService(selected.contract.id, selected.month.id, technician.name);
      localStorage.removeItem(LS.activeJob);
    }
    setPayModal(false);
    notify(
      isOffline
        ? skip
          ? "سرویس به‌صورت آفلاین ثبت شد (در صف همگام‌سازی)"
          : "سرویس و دریافت وجه به‌صورت آفلاین ثبت شد"
        : skip
        ? "سرویس ثبت و همگام‌سازی ابری انجام شد"
        : "سرویس و دریافت وجه ثبت و همگام‌سازی شد"
    );
    resetWork();
    setSelected(null);
    setScreen("home");
  };

  /* ----------------------------- voice input ------------------------------ */
  const [listening, setListening] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const voice = (field: "report" | "reminder" | "followup") => {
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return notify("مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند");
    if (listening) {
      recRef.current?.stop();
      setListening(null);
      return;
    }
    const r = new SR();
    r.lang = "fa-IR";
    r.interimResults = false;
    r.onresult = (e: any) => {
      const txt = Array.from(e.results).map((x: any) => x[0].transcript).join(" ");
      const setter = field === "report" ? setReport : field === "reminder" ? setReminder : setFollowup;
      setter((p) => (p ? p + " " + txt : txt));
    };
    r.onend = () => setListening(null);
    r.onerror = () => setListening(null);
    recRef.current = r;
    r.start();
    setListening(field);
  };

  /* ---------------------- text-to-speech speaker output -------------------- */
  const [speakingField, setSpeakingField] = useState<string | null>(null);
  const speakText = (text: string, fieldId: string) => {
    if (!text || !text.trim()) {
      notify("متنی برای خواندن صوتی وجود ندارد");
      return;
    }
    const W = window as any;
    if (!("speechSynthesis" in W)) {
      notify("پخش صوتی اسپیکر در این مرورگر پشتیبانی نمی‌شود");
      return;
    }
    if (speakingField === fieldId) {
      W.speechSynthesis.cancel();
      setSpeakingField(null);
      return;
    }
    W.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fa-IR";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingField(null);
    utterance.onerror = () => setSpeakingField(null);
    setSpeakingField(fieldId);
    W.speechSynthesis.speak(utterance);
  };

  /* ------------------------------ signature ------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pos = (e: any) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: ((p.clientX - r.left) * c.width) / r.width, y: ((p.clientY - r.top) * c.height) / r.height };
  };
  const sigStart = (e: any) => {
    if (signed) return;
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const sigMove = (e: any) => {
    if (!drawing.current || signed) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const sigEnd = () => (drawing.current = false);
  const sigClear = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSigned(false);
  };

  /* -------------------------------- photos -------------------------------- */
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const rd = new FileReader();
      rd.onload = () => setPhotos((p) => [...p, String(rd.result)]);
      rd.readAsDataURL(f);
    });
  };

  /* ---------------------------------------------------------------------- */
  /*                                  views                                  */
  /* ---------------------------------------------------------------------- */

  const header = (title?: string, back?: () => void) => (
    <div className="flex flex-col bg-white shadow-sm border-b">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {back ? (
            <button type="button" onClick={back} className="rounded-full p-2 hover:bg-gray-100">
              <ChevronRight size={22} className="text-gray-700" />
            </button>
          ) : (
            <button type="button" onClick={() => setDrawer(true)} className="rounded-full p-2 hover:bg-gray-100">
              <Menu size={22} className="text-gray-700" />
            </button>
          )}
          <div className="truncate text-[13.5px] font-bold text-gray-800">{title || "آسمانسرا"}</div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* دکمه همگام‌سازی همراه با کلید سه‌گوش مدت زمان در موبایل */}
          <SyncIndicator variant="mobile" onShowToast={notify} />

          {/* دکمه آپدیت و دریافت آخرین تغییرات */}
          <button
            type="button"
            onClick={handleAppUpdate}
            disabled={updatingApp}
            title={`بروزرسانی نرم‌افزار به آخرین نسخه (v${APP_VERSION})`}
            className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1.5 text-[11px] font-bold text-blue-700 border border-blue-300 hover:bg-blue-100 active:bg-blue-200 shadow-sm transition disabled:opacity-60"
          >
            <RefreshCw size={13} className={updatingApp ? "animate-spin" : ""} />
            <span className="hidden sm:inline">آپدیت</span>
          </button>

          {/* دکمه راهنما و نصب نسخه مستقل برنامه آسمانسرا روی گوشی */}
          <button
            type="button"
            onClick={() => setAndroidModal(true)}
            title="نصب مستقیم برنامه آسمانسرا روی گوشی"
            className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 border border-emerald-300 hover:bg-emerald-100 active:bg-emerald-200 shadow-sm transition"
          >
            <Download size={13} />
            <span>نصب برنامه</span>
          </button>

          {/* دکمه شروع کار */}
          <button
            type="button"
            onClick={toggleDay}
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold text-white shadow-sm ${
              dayStart ? "bg-blue-600" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {dayStart ? (
              <>
                <Square size={12} fill="white" /> {fmtDur(daySec)}
              </>
            ) : (
              <>
                <Play size={12} fill="white" /> شروع کار
              </>
            )}
          </button>
        </div>
      </div>

      {/* بنر وضعیت آفلاین و صف سرویس‌ها */}
      {isOffline && (
        <div className="flex items-center justify-between bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 border-t border-amber-200">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              {sync.offlineServicesCount > 0
                ? `${fa(sync.offlineServicesCount)} سرویس در صف امن دستگاه؛ پس از اتصال سرور ارسال می‌شود`
                : syncServerUnavailable
                ? "اینترنت وصل است، اما سرور همگام‌سازی پاسخ نمی‌دهد؛ اطلاعات روی گوشی محفوظ است"
                : sync.isManualOffline
                ? "حالت آفلاین دستی فعال است — برای اتصال، کلید همگام‌سازی را روشن کنید"
                : "اینترنت دستگاه قطع است — می‌توانید سرویس را ثبت کنید"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            className="rounded bg-amber-600 px-2 py-0.5 text-[10.5px] font-bold text-white active:bg-amber-700 shrink-0"
          >
            ارسال و آپدیت
          </button>
        </div>
      )}
    </div>
  );

  const jobCard = (j: Job) => {
    const activeAssignment = activeServiceAssignments.find(
      (item) => item.contractId === j.contract.id && item.monthId === j.month.id
    );
    return (
    <button
      key={`${j.contract.id}-${j.month.id}`}
      type="button"
      onClick={() => {
        setSelected(j);
        setScreen("job");
      }}
      className="flex w-full items-center gap-3 border-b bg-white px-3 py-3 text-right active:bg-gray-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Building2 size={26} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-gray-800">
          {j.contract.building.replace(/^\*\s*/, "")} دستگاه 1 ({j.contract.no})
        </div>
        <div className="truncate text-[11.5px] text-gray-500">{j.contract.address || "قزوین"}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
            سرویس {j.month.m} {j.month.y}
          </span>
          {j.month.done ? (
            <span className="rounded-full border border-emerald-400 bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
              ✓ انجام شد توسط {j.month.doneBy || j.month.techs?.[0] || "سرویس‌کار"}
            </span>
          ) : activeAssignment ? (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-bold text-blue-700">
              در حال انجام توسط {activeAssignment.technicianName}
            </span>
          ) : (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600">انجام‌نشده</span>
          )}
        </div>
      </div>
      <ChevronLeft size={18} className="text-gray-400" />
    </button>
    );
  };

  const renderHomeView = () => (
    <>
      {header()}
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {[
          { l: "لیست خرابی", i: AlertTriangle, c: "text-red-500", badge: 1, go: () => setScreen("services") },
          { l: "ثبت خرابی", i: Plus, c: "text-orange-500", go: () => notify("فرم ثبت خرابی") },
          { l: "ثبت سرویس", i: Wrench, c: "text-blue-600", go: () => setScreen("services") },
          { l: "ثبت سرویس آفلاین", i: CloudOff, c: "text-amber-600", go: () => setScreen("offlineService") },
          { l: "صف سرویس‌های آفلاین", i: Cloud, c: "text-emerald-600", badge: offlineDrafts.length || undefined, go: () => setScreen("offlineQueue") },
        ].map((b) => (
          <button
            key={b.l}
            type="button"
            onClick={b.go}
            className="relative flex flex-col items-center gap-1 rounded-xl bg-white py-3 shadow-sm active:bg-gray-50"
          >
            <b.i size={24} className={b.c} />
            <span className="text-[12px] text-gray-700">{b.l}</span>
            {b.badge ? (
              <span className="absolute right-2 top-2 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                {fa(b.badge)}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className={`mx-3 rounded-xl p-3 text-center text-[12.5px] shadow-sm ${jobStart && selected ? "border border-blue-500 bg-gradient-to-l from-blue-600 to-blue-500 text-white" : "border border-dashed border-gray-300 bg-white text-gray-500"}`}>
        {jobStart && selected ? (
          <div className="space-y-2 text-right">
            <button type="button" onClick={() => setScreen("work")} className="w-full rounded-lg p-2 text-white">
              <div className="flex items-center justify-between">
                <span className="font-bold">▶ در حال انجام — {selected.contract.building}</span>
                <span className="rounded bg-white/20 px-2 py-0.5 font-mono text-white">{fmtDur(jobSec)}</span>
              </div>
              <div className="mt-1 text-[10.5px] text-blue-100">برای ادامه سرویس لمس کنید</div>
            </button>
            <button type="button" onClick={() => {
              if (!window.confirm("سرویس فعال لغو شود؟ اطلاعات ثبت‌نشده این سرویس حذف خواهد شد.")) return;
              appStore.finishActiveService(selected.contract.id, selected.month.id, technician.name);
              resetWork(); setSelected(null); notify("سرویس فعال لغو شد");
            }} className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-[11px] font-bold text-red-600">لغو کار فعال</button>
          </div>
        ) : (
          "کار فعالی ندارید"
        )}
      </div>

      <div className="mt-3 flex items-center justify-between px-3 text-[12.5px] font-bold text-gray-700">
        <span>کارهای امروز ({fa(todayJobs.length)})</span>
        <span className="text-[11px] font-normal text-gray-400">{todayJalali()}</span>
      </div>
      <div className="mt-1 bg-white">{todayJobs.map(jobCard)}</div>
      {todayJobs.length === 0 && <div className="py-6 text-center text-[12px] text-gray-400">کاری برای امروز نیست</div>}

      <div className="mt-4 flex items-center justify-between px-3 text-[12.5px] font-bold text-gray-700">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span>سرویس‌های انجام‌نشده ماه گذشته ({previousMonthInfo.monthName})</span>
        </span>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
          {fa(lastMonthPendingJobs.length)} مورد
        </span>
      </div>
      <div className="mt-1 bg-white">{lastMonthPendingJobs.map((j) => jobCard(j))}</div>
      {lastMonthPendingJobs.length === 0 && (
        <div className="py-6 text-center text-[12px] text-gray-400 bg-white">تمام سرویس‌های ماه گذشته انجام شده است</div>
      )}
      <div className="h-16" />
    </>
  );

  const renderJobView = () => {
    if (!selected) return null;
    const c = selected.contract;
    const details = appStore.getContractDetails(c.id);
    const debt = details.months.filter((m) => m.done && !m.paid).reduce((s, m) => s + m.amount, 0);
    const savedLoc = appStore.getContractGeoLocation(c.id);
    const targetLat = savedLoc?.latitude ?? 36.2688;
    const targetLng = savedLoc?.longitude ?? 50.0041;

    // Effective technician coordinates (simulated or real GPS)
    const effectiveUserGps = isSimulatedArrival
      ? { lat: targetLat + 0.00022, lng: targetLng + 0.00018, accuracy: 5 }
      : userGps;

    // Real-time distance calculation to destination in meters
    const currentDistanceMeters = effectiveUserGps
      ? Math.round(distanceMeters(effectiveUserGps.lat, effectiveUserGps.lng, targetLat, targetLng))
      : trafficInfo?.distanceKm
      ? Math.round(trafficInfo.distanceKm * 1000)
      : null;

    // Destination Reached within 50-meter radius
    const isDestinationReached = currentDistanceMeters !== null && currentDistanceMeters <= 50;

    // Dynamically adjust zoom level and bounding box span based on distance
    const getDynamicZoom = (dist: number | null) => {
      if (dist === null) {
        return { level: 16, label: "استاندارد", deltaLng: 0.0065, deltaLat: 0.0045, badgeCls: "bg-sky-500/20 text-sky-300" };
      }
      if (dist <= 50) {
        // Micro building rooftop level (<50m)
        return { level: 19, label: "پلاک و سازه (زیر ۵۰ متر)", deltaLng: 0.0013, deltaLat: 0.0009, badgeCls: "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50" };
      }
      if (dist <= 250) {
        // High-precision street approach
        return { level: 18, label: "کوچه و معبر ورودی", deltaLng: 0.0028, deltaLat: 0.0020, badgeCls: "bg-emerald-500/20 text-emerald-300" };
      }
      if (dist <= 800) {
        // Neighborhood zoom
        return { level: 17, label: "محله و خیابان‌ها", deltaLng: 0.0062, deltaLat: 0.0044, badgeCls: "bg-teal-500/20 text-teal-300" };
      }
      if (dist <= 2500) {
        // District zoom
        return { level: 16, label: "منطقه شهری", deltaLng: 0.0135, deltaLat: 0.0095, badgeCls: "bg-blue-500/20 text-blue-300" };
      }
      if (dist <= 6000) {
        // Area zoom
        return { level: 15, label: "حوزه شهری", deltaLng: 0.0270, deltaLat: 0.0190, badgeCls: "bg-indigo-500/20 text-indigo-300" };
      }
      // City overview
      return { level: 13, label: "نمای کل شهر", deltaLng: 0.0540, deltaLat: 0.0380, badgeCls: "bg-slate-500/20 text-slate-300" };
    };

    const zoomInfo = getDynamicZoom(currentDistanceMeters);

    // Frame the center & delta:
    let frameLat = targetLat;
    let frameLng = targetLng;
    let frameDeltaLat = zoomInfo.deltaLat;
    let frameDeltaLng = zoomInfo.deltaLng;

    if (effectiveUserGps && currentDistanceMeters && currentDistanceMeters > 50 && currentDistanceMeters <= 5000) {
      frameLat = (effectiveUserGps.lat + targetLat) / 2;
      frameLng = (effectiveUserGps.lng + targetLng) / 2;
      frameDeltaLat = Math.max(zoomInfo.deltaLat, Math.abs(effectiveUserGps.lat - targetLat) * 0.95);
      frameDeltaLng = Math.max(zoomInfo.deltaLng, Math.abs(effectiveUserGps.lng - targetLng) * 0.95);
    }

    const bboxMinLng = (frameLng - frameDeltaLng).toFixed(5);
    const bboxMinLat = (frameLat - frameDeltaLat).toFixed(5);
    const bboxMaxLng = (frameLng + frameDeltaLng).toFixed(5);
    const bboxMaxLat = (frameLat + frameDeltaLat).toFixed(5);

    const minLngNum = Number(bboxMinLng);
    const maxLngNum = Number(bboxMaxLng);
    const minLatNum = Number(bboxMinLat);
    const maxLatNum = Number(bboxMaxLat);

    const destX = Math.max(10, Math.min(90, ((targetLng - minLngNum) / (maxLngNum - minLngNum)) * 100));
    const destY = Math.max(15, Math.min(85, ((maxLatNum - targetLat) / (maxLatNum - minLatNum)) * 100));

    const userX = effectiveUserGps
      ? Math.max(10, Math.min(90, ((effectiveUserGps.lng - minLngNum) / (maxLngNum - minLngNum)) * 100))
      : null;
    const userY = effectiveUserGps
      ? Math.max(15, Math.min(85, ((maxLatNum - effectiveUserGps.lat) / (maxLatNum - minLatNum)) * 100))
      : null;

    const round = (Icon: any, label: string, cls: string, run: () => void, big = false) => (
      <button type="button" onClick={run} className="flex flex-col items-center gap-1">
        <span
          className={`flex items-center justify-center rounded-full text-white shadow-md ${cls} ${
            big ? "h-16 w-16" : "h-12 w-12"
          }`}
        >
          <Icon size={big ? 30 : 20} />
        </span>
        <span className="text-[10.5px] text-gray-600">{label}</span>
      </button>
    );

    return (
      <>
        {header(`قرارداد ${c.no}`, () => setScreen("home"))}

        {/* Sophisticated Map Container with CSS selector matching .relative.h-44.w-full.overflow-hidden.bg-[linear-gradient(90deg,#e5e7eb_1px,transparent_1px),linear-gradient(#e5e7eb_1px,transparent_1px)].bg-[size:24px_24px].bg-gray-100 */}
        <div
          className={`relative h-44 w-full overflow-hidden bg-[linear-gradient(90deg,#e5e7eb_1px,transparent_1px),linear-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px] bg-gray-100 border-b border-gray-200 transition-all duration-300 select-none ${
            isDestinationReached ? "ring-4 ring-emerald-500 ring-inset shadow-[0_0_35px_rgba(16,185,129,0.5)]" : ""
          }`}
        >
          {/* Base Interactive OpenStreetMap Iframe with Dynamic Zoom Level */}
          <iframe
            title={`موقعیت ${c.building}`}
            className="absolute inset-0 h-full w-full border-0 opacity-90"
            loading="lazy"
            key={`${bboxMinLng}-${bboxMinLat}-${bboxMaxLng}-${bboxMaxLat}`}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${bboxMinLng}%2C${bboxMinLat}%2C${bboxMaxLng}%2C${bboxMaxLat}&layer=mapnik&marker=${targetLat}%2C${targetLng}`}
          />

          {/* Semi-transparent dark contrast & grid overlay */}
          <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />

          {/* Interactive SVG Layer: Dynamic Route Line & Geofence Rings */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* 50-meter Geofence Radius Indicator around Destination */}
            <circle
              cx={`${destX}%`}
              cy={`${destY}%`}
              r={isDestinationReached ? "12" : "6"}
              fill="rgba(16, 185, 129, 0.12)"
              stroke="rgba(16, 185, 129, 0.65)"
              strokeWidth="0.8"
              strokeDasharray="2 1.5"
              className={isDestinationReached ? "animate-pulse" : ""}
            />

            {/* Dynamic Approach Route line between User and Destination */}
            {userX !== null && userY !== null && !isDestinationReached && (
              <>
                <line
                  x1={`${userX}%`}
                  y1={`${userY}%`}
                  x2={`${destX}%`}
                  y2={`${destY}%`}
                  stroke="rgba(14, 165, 233, 0.85)"
                  strokeWidth="1.6"
                  strokeDasharray="3 2"
                />
                <circle
                  cx={`${(userX + destX) / 2}%`}
                  cy={`${(userY + destY) / 2}%`}
                  r="1.5"
                  fill="#38bdf8"
                  className="animate-ping"
                />
              </>
            )}
          </svg>

          {/* Destination Pin Marker with Glow */}
          <div
            style={{ left: `${destX}%`, top: `${destY}%` }}
            className="absolute -translate-x-1/2 -translate-y-full z-20 pointer-events-none transition-all duration-300"
          >
            <div className="relative flex flex-col items-center">
              {/* Concentric radar rings */}
              <span className={`absolute -inset-2 rounded-full ${isDestinationReached ? "bg-emerald-400/40 animate-ping" : "bg-red-500/25 animate-ping"}`} />
              
              {/* Pin badge */}
              <div
                className={`relative flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black text-white shadow-xl border ${
                  isDestinationReached
                    ? "bg-emerald-600 border-white ring-2 ring-emerald-300 scale-105"
                    : "bg-red-600 border-white hover:scale-105"
                }`}
              >
                <MapPin size={10} className="stroke-[2.5]" />
                <span className="truncate max-w-[80px]">{c.building.replace(/^\*\s*/, "")}</span>
              </div>
              <div
                className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] ${
                  isDestinationReached ? "border-t-emerald-600" : "border-t-red-600"
                } -mt-0.5`}
              />
            </div>
          </div>

          {/* User Technician Pin (if available) */}
          {userX !== null && userY !== null && (
            <div
              style={{ left: `${userX}%`, top: `${userY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute h-6 w-6 rounded-full bg-sky-500/35 animate-ping" />
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 border-2 border-white shadow-lg text-white">
                  <Navigation size={9} className="rotate-45" />
                </div>
              </div>
            </div>
          )}

          {/* Traffic Visual Flow Bar */}
          {showTrafficOverlay && trafficInfo && (
            <div className="absolute top-0 left-0 right-0 pointer-events-none z-10">
              <div
                className={`h-1.5 w-full transition-all duration-700 shadow-sm ${
                  trafficInfo.status === "heavy"
                    ? "bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 animate-pulse"
                    : trafficInfo.status === "moderate"
                    ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
                    : "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"
                }`}
              />
            </div>
          )}

          {/* Top Floating Control & Dynamic Info Bar */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
            <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
              {/* Dynamic Distance HUD Badge */}
              <div
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold shadow-md backdrop-blur-md transition-all ${
                  isDestinationReached
                    ? "bg-emerald-600/95 text-white ring-2 ring-emerald-300 animate-pulse"
                    : currentDistanceMeters !== null && currentDistanceMeters <= 500
                    ? "bg-amber-600/95 text-white"
                    : "bg-slate-900/85 text-white"
                }`}
                title="فاصله برخط تا مقصد"
              >
                <Navigation size={10} className={isDestinationReached ? "rotate-45" : "-rotate-45"} />
                <span>
                  {currentDistanceMeters !== null
                    ? currentDistanceMeters <= 50
                      ? `رسیدید (${fa(currentDistanceMeters)} متر)`
                      : currentDistanceMeters < 1000
                      ? `${fa(currentDistanceMeters)} متر`
                      : `${fa((currentDistanceMeters / 1000).toFixed(1))} کیلومتر`
                    : "محاسبه فاصله..."}
                </span>
              </div>

              {/* Dynamic Zoom Level Indicator */}
              <div className={`hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium shadow-md backdrop-blur-md ${zoomInfo.badgeCls}`}>
                <Target size={9} />
                <span>زوم: L{zoomInfo.level} ({zoomInfo.label})</span>
              </div>

              {/* 50-meter Simulation Quick-Test Toggle */}
              <button
                type="button"
                onClick={() => setIsSimulatedArrival((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold shadow-md backdrop-blur-md transition active:scale-95 ${
                  isSimulatedArrival
                    ? "bg-emerald-500 text-white ring-1 ring-white"
                    : "bg-slate-800/85 text-slate-200 hover:bg-slate-800"
                }`}
                title="تست محدوده ۵۰ متری جهت بررسی پیام رسیدن به مقصد و زوم هوشمند"
              >
                <CheckCircle2 size={10} className={isSimulatedArrival ? "text-white" : "text-emerald-400"} />
                <span>{isSimulatedArrival ? "حالت ۵۰ متر (فعال)" : "شبیه‌ساز ۵۰ متر"}</span>
              </button>
            </div>

            <div className="pointer-events-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchTrafficConditions(targetLat, targetLng)}
                disabled={trafficLoading}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white shadow hover:bg-black/80 active:scale-95 transition"
                title="بروزرسانی داده‌های ترافیک"
              >
                <RefreshCw size={11} className={trafficLoading ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => openNavigation({ building: c.building, address: c.address, lat: targetLat, lng: targetLng })}
                className="flex items-center gap-1 rounded-full bg-violet-700/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white shadow-md hover:bg-violet-800 active:scale-95 transition"
              >
                <Navigation size={11} />
                <span>مسیریاب‌ها</span>
              </button>
            </div>
          </div>

          {/* Bottom Coordinates & Real-Time Traffic HUD */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
            <div className="flex items-center gap-1 rounded-lg bg-black/75 backdrop-blur-md px-2 py-0.5 text-[9.5px] font-mono text-white shadow">
              <MapPin size={10} className="text-red-400" />
              <span>{targetLat.toFixed(5)}, {targetLng.toFixed(5)}</span>
            </div>

            {trafficInfo && showTrafficOverlay && (
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md px-2 py-0.5 text-[9.5px] text-white shadow">
                {trafficInfo.roadName && (
                  <span className="text-slate-300 max-w-[90px] truncate" title={trafficInfo.roadName}>
                    {trafficInfo.roadName}
                  </span>
                )}
                {trafficInfo.speedKmh !== null && (
                  <span className="font-mono text-emerald-400">
                    {trafficInfo.speedKmh}km/h
                  </span>
                )}
                {trafficInfo.durationMin !== null && (
                  <span className="font-mono text-amber-300">
                    ~{trafficInfo.durationMin}دقیقه
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 🌟 Pulsing 'Destination Reached' Overlay when User is within 50-meter Radius 🌟 */}
          {isDestinationReached && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-3 pointer-events-none">
              {/* Radiant pulsating emerald overlay backdrop */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/85 via-emerald-900/75 to-slate-950/90 backdrop-blur-[2px] animate-pulse" />

              {/* Expanding concentric radar wave rings */}
              <div className="absolute flex items-center justify-center pointer-events-none">
                <span className="absolute h-44 w-44 rounded-full border border-emerald-400/35 animate-ping" style={{ animationDuration: "2.6s" }} />
                <span className="absolute h-32 w-32 rounded-full border border-emerald-400/55 animate-ping" style={{ animationDuration: "2.0s" }} />
                <span className="absolute h-20 w-20 rounded-full bg-emerald-500/20" />
              </div>

              {/* Destination Reached Banner Card */}
              <div className="relative pointer-events-auto max-w-[92%] w-full rounded-2xl border-2 border-emerald-400 bg-slate-950/92 px-4 py-2.5 text-center text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between gap-2 border-b border-emerald-500/30 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300/50 animate-bounce">
                      <CheckCircle2 size={16} className="stroke-[3]" />
                    </span>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-[12px] font-black text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>به مقصد رسیدید</span>
                      </div>
                      <div className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-wider">
                        Destination Reached (محدوده ۵۰ متر)
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-900/60 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300 font-mono">
                    {fa(currentDistanceMeters || 18)} متر
                  </span>
                </div>

                <div className="text-[10.5px] text-slate-300 leading-tight">
                  شما در حریم مجاز ساختمان <b className="text-white">{c.building.replace(/^\*\s*/, "")}</b> قرار دارید.
                </div>

                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => startService(selected)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-1.5 text-[11px] font-black text-white shadow-lg hover:from-emerald-600 hover:to-teal-600 active:scale-95 transition"
                  >
                    <Play size={12} fill="white" />
                    <span>ورود و شروع سرویس</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSimulatedArrival(false)}
                    className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-white/20 active:scale-95 transition"
                  >
                    بستن
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="-mt-7 flex items-end justify-around px-2 relative z-10">
          {round(ImageIcon, "تصاویر", "bg-gray-500", () => notify("گالری تصاویر دستگاه"))}
          {round(Phone, "تماس", "bg-sky-600", () => {
            const phone = c.coordinatorPhone || c.phone;
            if (phone) window.location.href = `tel:${phone}`;
            else notify("شماره مسئول هماهنگی ثبت نشده است");
          })}
          {round(Play, "شروع سرویس", "bg-emerald-600", () => startService(selected), true)}
          {round(Navigation, "مسیریابی", "bg-violet-600", () =>
            openNavigation({ building: c.building, address: c.address, lat: targetLat, lng: targetLng })
          )}
          {round(Truck, "ایاب و ذهاب", "bg-orange-500", () => notify("ایاب و ذهاب ثبت شد"))}
        </div>

        <div className="mx-3 mt-4 rounded-xl bg-violet-600 p-3 text-[12.5px] leading-6 text-white">
          <div className="mb-1 font-bold">{c.building.replace(/^\*\s*/, "")}</div>
          {c.address || "قزوین"} {c.locationStatus ? `— ${c.locationStatus}` : ""}
        </div>

        <div className="grid grid-cols-3 gap-2 p-3">
          {[
            { l: "ثبت موقعیت", i: MapPin, run: () => registerContractPosition(c) },
            { l: "اطلاعات دستگاه", i: Info, run: () => notify("آسانسور کششی ۶ توقف - ۶۳۰ کیلوگرم") },
            { l: "نماینده‌ها", i: Users, run: () => notify(`${c.manager}${c.coordinator ? " / " + c.coordinator : ""}`) },
          ].map((b) => (
            <button key={b.l} type="button" onClick={b.run} className="flex flex-col items-center gap-1 rounded-xl bg-white py-3 shadow-sm">
              <b.i size={20} className="text-violet-600" />
              <span className="text-[11.5px] text-gray-700">{b.l}</span>
            </button>
          ))}
        </div>

        <div className="mx-3 mb-20 overflow-hidden rounded-xl bg-white shadow-sm">
          {[
            ["شناسه سرویس", `#${selected.month.id}`],
            ["شماره قرارداد", c.no],
            ["دوره سرویس", `${selected.month.m} ${selected.month.y}`],
            ["تاریخ شروع قرارداد", c.start],
            ["تاریخ پایان قرارداد", c.end],
            ["مدیر / نماینده", c.manager],
            ["تلفن", c.phone || "-"],
            ["بدهی مشتری", `${fa(debt)} ریال`],
            ["مبلغ ماهیانه", `${fa(selected.month.amount)} ریال`],
            ["پیوست‌ها", "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b px-3 py-2.5 text-[12.5px] last:border-0">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const timerBar = () => (
    <div className="flex items-center justify-between bg-blue-600 px-3 py-2 text-white">
      <span className="text-[12px]">{selected?.contract.building.replace(/^\*\s*/, "")}</span>
      <span className="flex items-center gap-1 font-mono text-[14px] font-bold">
        <Clock size={14} /> {fmtDur(jobSec)}
      </span>
    </div>
  );

  const renderWorkView = () => {
    const items = checklist.filter((i) => i.deviceType === "آسانسور");
    const filteredParts = parts.filter((p) => p.name.includes(partQuery) || p.code.includes(partQuery));
    const doneCount = Object.keys(results).length;
    return (
      <>
        {header("انجام سرویس", () => setScreen("job"))}
        {timerBar()}
        <div className="flex bg-white text-[12.5px]">
          {[
            ["checklist", "چک‌لیست", ClipboardCheck],
            ["parts", "قطعات", Package],
            ["faults", "خرابی‌ها", AlertTriangle],
          ].map(([k, l, I]: any) => (
            <button
              key={k}
              type="button"
              onClick={() => setWorkTab(k)}
              className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-2.5 ${
                workTab === k ? "border-blue-600 font-bold text-blue-600" : "border-transparent text-gray-500"
              }`}
            >
              <I size={15} /> {l}
              {k === "checklist" && <span className="text-[10px]">({fa(doneCount)}/{fa(items.length)})</span>}
              {k === "parts" && usedParts.length > 0 && <span className="text-[10px]">({fa(usedParts.length)})</span>}
              {k === "faults" && faults.length > 0 && <span className="text-[10px]">({fa(faults.length)})</span>}
            </button>
          ))}
        </div>

        <div className="pb-20">
          {workTab === "checklist" &&
            categories.map((cat) => {
              const rows = items.filter((i) => i.category === cat);
              if (!rows.length) return null;
              return (
                <div key={cat} className="mt-2 bg-white">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 text-[12px] font-bold text-gray-700">
                    <span>{cat}</span>
                    <button type="button" title={`ثبت همه موارد ${cat} به‌عنوان سالم`} onClick={() => setResults((previous) => {
                      const next = { ...previous };
                      rows.forEach((row) => { next[row.id] = "ok"; });
                      return next;
                    })} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${rows.every((row) => results[row.id] === "ok") ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-500 bg-white text-emerald-600"}`}>
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                  {rows.map((r) => (
                    <div key={r.id} className="border-b px-3 py-2.5">
                      <div className="text-[12.5px] leading-5 text-gray-800">{r.question}</div>
                      <div className="mt-1.5 flex items-center gap-3">
                        {(["ok", "fault"] as ServiceChecklistStatus[]).map((s) => (
                          <label key={s} className="flex items-center gap-1 text-[12px]">
                            <input
                              type="radio"
                              name={`q${r.id}`}
                              checked={results[r.id] === s}
                              onChange={() => setResults((p) => ({ ...p, [r.id]: s }))}
                              className={s === "ok" ? "accent-emerald-600" : "accent-red-600"}
                            />
                            <span className={s === "ok" ? "text-emerald-700" : "text-red-600"}>
                              {s === "ok" ? "سالم" : "ناسالم"}
                            </span>
                          </label>
                        ))}
                        <input
                          value={notes[r.id] || ""}
                          onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                          placeholder="توضیحات"
                          className="ml-auto w-32 rounded border px-2 py-1 text-[11px] outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

          {workTab === "parts" && (
            <div className="p-3">
              <button
                type="button"
                onClick={() => setPartPicker(true)}
                className="w-full rounded-lg bg-blue-600 py-2.5 text-[13px] font-bold text-white"
              >
                + انتخاب قطعه
              </button>
              <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
                {usedParts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 border-b px-3 py-2 text-[12.5px]">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-[11px] text-gray-500">{fa(p.price)} ریال / {p.unit}</div>
                    </div>
                    <NumberStepper
                      value={p.qty}
                      min={1}
                      ariaLabel={`تعداد ${p.name}`}
                      onChange={(qty) => setUsedParts((list) => list.map((item, index) => index === i ? { ...item, qty } : item))}
                      className="w-36"
                    />
                    <button type="button" onClick={() => setUsedParts((l) => l.filter((_, k) => k !== i))}>
                      <X size={16} className="text-red-500" />
                    </button>
                  </div>
                ))}
                {usedParts.length === 0 && <div className="py-6 text-center text-[12px] text-gray-400">قطعه‌ای ثبت نشده</div>}
                {usedParts.length > 0 && (
                  <div className="flex justify-between bg-gray-50 px-3 py-2 text-[12.5px] font-bold">
                    <span>جمع قطعات</span>
                    <span>{fa(partsTotal)} ریال</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {workTab === "faults" && (
            <div className="p-3">
              <div className="flex gap-2">
                <input
                  value={newFault}
                  onChange={(e) => setNewFault(e.target.value)}
                  placeholder="شرح خرابی جدید..."
                  className="flex-1 rounded-lg border bg-white px-3 py-2 text-[12.5px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newFault.trim()) return;
                    setFaults((f) => [...f, { text: newFault.trim(), fixed: false }]);
                    setNewFault("");
                  }}
                  className="rounded-lg bg-red-600 px-3 text-white"
                >
                  ثبت
                </button>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
                {faults.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 border-b px-3 py-2.5 text-[12.5px]">
                    <AlertTriangle size={16} className={f.fixed ? "text-emerald-500" : "text-red-500"} />
                    <span className={`flex-1 ${f.fixed ? "text-gray-400 line-through" : "text-gray-800"}`}>{f.text}</span>
                    <button
                      type="button"
                      onClick={() => setFaults((l) => l.map((x, k) => (k === i ? { ...x, fixed: !x.fixed } : x)))}
                      className={`rounded px-2 py-1 text-[11px] text-white ${f.fixed ? "bg-gray-400" : "bg-emerald-600"}`}
                    >
                      {f.fixed ? "بازگشت" : "رفع شد"}
                    </button>
                  </div>
                ))}
                {faults.length === 0 && <div className="py-6 text-center text-[12px] text-gray-400">خرابی ثبت نشده</div>}
              </div>
            </div>
          )}
        </div>

        {stepNav(() => setScreen("job"), () => setScreen("report"))}

        {partPicker && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={() => setPartPicker(false)}>
            <div className="max-h-[75vh] w-full overflow-auto rounded-t-2xl bg-white p-3" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center gap-2 rounded-lg border px-2">
                <Search size={14} className="text-gray-400" />
                <input
                  autoFocus
                  value={partQuery}
                  onChange={(e) => setPartQuery(e.target.value)}
                  placeholder="جستجوی قطعه..."
                  className="w-full py-2 text-[13px] outline-none"
                />
              </div>
              {filteredParts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setUsedParts((l) => [...l, { code: p.code, name: p.name, unit: p.unit, qty: 1, price: p.price }]);
                    setPartPicker(false);
                    setPartQuery("");
                  }}
                  className="flex w-full items-center justify-between border-b py-2.5 text-right text-[12.5px]"
                >
                  <span className="text-gray-800">{p.name}</span>
                  <span className="text-gray-500">{fa(p.price)} ریال</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  const voiceField = (
    id: "report" | "reminder" | "followup",
    label: string,
    value: string,
    set: (v: string) => void
  ) => {
    const isListening = listening === id;
    const isSpeaking = speakingField === id;

    return (
      <div key={id} className="mt-3.5 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs">
        {/* ردیف عنوان و علامت‌های بزرگ اسپیکر و تایپ صوتی */}
        <div className="mb-2.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-gray-800">{label}</span>
            {value.trim() && (
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-800">
                ثبت شده
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* دکمه بزرگ اسپیکر: پخش صوتی متن ثبت‌شده برای گوش دادن راحت تکنسین */}
            {value.trim() && (
              <button
                type="button"
                onClick={() => speakText(value, id)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11.5px] font-bold shadow-xs transition active:scale-95 ${
                  isSpeaking
                    ? "border-emerald-500 bg-emerald-600 text-white animate-pulse"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
                title="پخش صوتی این متن با اسپیکر"
              >
                {isSpeaking ? <VolumeX size={19} /> : <Volume2 size={19} />}
                <span>{isSpeaking ? "توقف اسپیکر" : "پخش با اسپیکر"}</span>
              </button>
            )}

            {/* علامت بزرگ و برجسته ضبط و تایپ صوتی */}
            <button
              type="button"
              onClick={() => voice(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-bold shadow-sm transition active:scale-95 ${
                isListening
                  ? "bg-red-600 text-white animate-pulse ring-4 ring-red-200 shadow-md"
                  : "border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-600"
              }`}
              title="برای صحبت کردن و تایپ صوتی لمس کنید"
            >
              {isListening ? (
                <>
                  <MicOff size={22} className="text-white" />
                  <span>در حال شنیدن... (لمس جهت توقف)</span>
                </>
              ) : (
                <>
                  <Mic size={22} className="text-blue-600" />
                  <span>تایپ صوتی</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* کادر نوشتن متن با دکمه پاک کردن */}
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => set(e.target.value)}
            rows={3}
            placeholder={`متن ${label} را بنویسید یا دکمه صوتی بالا را زده و صحبت کنید...`}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-3 pr-3.5 pl-10 text-[12.5px] text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

          {value && (
            <button
              type="button"
              onClick={() => set("")}
              className="absolute left-2.5 top-2.5 rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
              title="پاک کردن متن"
            >
              <Eraser size={15} />
            </button>
          )}
        </div>

        {/* وضعیت زنده ضبط صدا */}
        {isListening && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-[11px] font-medium text-red-700 border border-red-200 animate-pulse">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping" />
            <span>میکروفون در حال شنیدن صحبت‌های شماست... صحبت کنید تا تایپ شود.</span>
          </div>
        )}
      </div>
    );
  };

  const renderReportView = () => (
    <>
      {header("گزارش سرویس", () => setScreen("work"))}
      {timerBar()}
      <div className="p-3 pb-20">
        <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3 text-[12.5px] text-blue-800">
          <span>زمان صرف شده: <b className="font-mono">{fmtDur(jobSec)}</b></span>
          <span className="flex items-center gap-1"><Clock size={13} /> شروع از ساعت {jobStartClock}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            ["اجرت (ریال)", wage, setWage],
            ["ایاب و ذهاب (ریال)", trip, setTrip],
          ].map(([l, v, s]: any) => (
            <label key={l} className="text-[12px] text-gray-600">
              {l}
              <input
                type="number"
                value={v || ""}
                onChange={(e) => s(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-[13px] outline-none"
              />
            </label>
          ))}
        </div>
        {voiceField("report", "گزارش سرویس", report, setReport)}
        {voiceField("reminder", "یادآوری سرویس بعدی", reminder, setReminder)}
        {voiceField("followup", "پیگیری بعدی مشتری", followup, setFollowup)}

        <div className="mt-3">
          <div className="mb-1 text-[12px] text-gray-600">تصاویر</div>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                <img src={p} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((l) => l.filter((_, k) => k !== i))}
                  className="absolute right-0 top-0 rounded-bl bg-red-600 p-0.5 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
              <Camera size={20} />
              <span className="text-[10px]">افزودن</span>
              <input type="file" accept="image/*" capture="environment" multiple onChange={onPhoto} className="hidden" />
            </label>
          </div>
        </div>
      </div>
      {stepNav(() => setScreen("work"), () => setScreen("sign"))}
    </>
  );

  const renderSignView = () => (
    <>
      {header("امضا و اتمام", () => setScreen("report"))}
      {timerBar()}
      <div className="p-3 pb-24">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {[
            ["مبلغ سرویس دوره", `${fa(selected?.month.amount || 0)} ریال`],
            ["قطعات", `${fa(partsTotal)} ریال`],
            ["اجرت", `${fa(wage)} ریال`],
            ["ایاب و ذهاب", `${fa(trip)} ریال`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b px-3 py-2 text-[12.5px]">
              <span className="text-gray-500">{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="flex justify-between bg-emerald-50 px-3 py-2.5 text-[13px] font-bold text-emerald-800">
            <span>جمع قابل پرداخت</span>
            <span>{fa(total)} ریال</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 rounded-xl bg-white p-3 text-[12.5px]">
          {[
            [true, "حضور مدیر"],
            [false, "عدم حضور مدیر"],
          ].map(([v, l]: any) => (
            <label key={l} className="flex items-center gap-1">
              <input type="radio" checked={managerPresent === v} onChange={() => setManagerPresent(v)} className="accent-blue-600" />
              {l}
            </label>
          ))}
          <span className="mr-auto text-gray-500">{selected?.contract.manager}</span>
        </div>

        {managerPresent && (
          <div className="mt-3">
            <div className="mb-1 rounded bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
              در صورت دریافت امضا امکان ویرایش اطلاعات وجود ندارد، لطفاً تغییرات را قبل از امضا اعمال کنید.
            </div>
            <canvas
              ref={canvasRef}
              width={600}
              height={260}
              onMouseDown={sigStart}
              onMouseMove={sigMove}
              onMouseUp={sigEnd}
              onMouseLeave={sigEnd}
              onTouchStart={sigStart}
              onTouchMove={sigMove}
              onTouchEnd={sigEnd}
              className={`h-40 w-full touch-none rounded-xl border-2 bg-white ${signed ? "border-emerald-500" : "border-dashed border-gray-300"}`}
            />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={sigClear} className="flex flex-1 items-center justify-center gap-1 rounded-lg border bg-white py-2 text-[12.5px]">
                <Eraser size={14} /> پاک کردن
              </button>
              <button
                type="button"
                onClick={() => {
                  setSigned(true);
                  notify("امضا ثبت شد");
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-[12.5px] text-white"
              >
                <Check size={14} /> ثبت امضا
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] p-3 bg-white/95 backdrop-blur-sm border-t">
        {isOffline && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11.5px] text-amber-800">
            <div className="flex items-center gap-1.5">
              <CloudOff size={14} className="text-amber-600 shrink-0" />
              <span>اینترنت قطع است؛ سرویس به‌صورت آفلاین در صف دستگاه ثبت می‌شود</span>
            </div>
            <span className="rounded bg-amber-200 px-1.5 py-0.5 font-bold text-amber-900 text-[10px] shrink-0">
              ثبت آفلاین
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => finishService()}
          disabled={managerPresent && !signed}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[14px] font-bold text-white shadow-lg disabled:opacity-40"
        >
          <Save size={16} /> {isOffline ? "ثبت آفلاین و اتمام سرویس" : "ثبت و اتمام سرویس"}
        </button>
      </div>
    </>
  );

  const stepNav = (prev: () => void, next: () => void) => (
    <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] gap-2 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,.06)]">
      <button type="button" onClick={prev} className="flex flex-1 items-center justify-center gap-1 rounded-xl border py-2.5 text-[13px]">
        <ChevronRight size={16} /> مرحله قبل
      </button>
      <button type="button" onClick={next} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white">
        مرحله بعد <ChevronLeft size={16} />
      </button>
    </div>
  );

  const attachOfflineDraft = (draft: OfflineServiceDraft) => {
    if (!navigator.onLine) return notify("برای انتقال این سرویس ابتدا به اینترنت متصل شوید");
    const mapping = draftMappings[draft.id];
    if (!mapping) return notify("قرارداد یا سرویس مقصد را انتخاب کنید");
    const [contractId, monthId] = mapping.split(":").map(Number);
    const target = jobs.find((job) => job.contract.id === contractId && job.month.id === monthId);
    if (!target) return notify("سرویس انتخاب‌شده پیدا نشد");

    const partsTotal = draft.partsList.reduce((sum, part) => sum + part.qty * part.price, 0);
    appStore.addServiceSubmission(contractId, monthId, {
      techs: [technician.name],
      doneBy: technician.name,
      doneDate: draft.doneDate,
      inTime: draft.inTime,
      outTime: draft.outTime,
      report: draft.report,
      reminder: draft.reminder,
      total: target.month.amount + partsTotal + draft.wage + draft.trip,
      parts: partsTotal,
      wage: draft.wage,
      trip: draft.trip,
      discount: 0,
      faults: draft.faultsList.length,
      faultsList: draft.faultsList,
      partsList: draft.partsList,
    });
    appStore.updateMonthService(contractId, monthId, {
      checklistResults: draft.checklistResults,
      customerFollowup: draft.followup,
      attachments: draft.attachments,
      serviceDurationReason: draft.serviceDurationReason,
    });
    saveOfflineDrafts(offlineDrafts.filter((item) => item.id !== draft.id));
    setDraftMappings((current) => {
      const next = { ...current };
      delete next[draft.id];
      return next;
    });
    syncNow();
    notify(`سرویس آفلاین به «${target.contract.building.replace(/^\*\s*/, "")}» منتقل شد`);
  };

  const renderOfflineServiceView = () => (
    <>
      {header("ثبت سرویس آفلاین", () => setScreen("home"))}
      <div className="m-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-[13px] font-bold text-amber-900">
          <CloudOff size={19} /> شروع سرویس بدون اینترنت
        </div>
        <p className="mt-1 text-[11px] leading-5 text-amber-800">
          فقط نام مشتری یا ساختمان را وارد کنید. تمام گزارش، چک‌لیست، قطعات و خرابی‌ها روی همین گوشی ذخیره می‌شود.
        </p>
        <input
          value={offlineCustomerName}
          onChange={(event) => setOfflineCustomerName(event.target.value)}
          placeholder="نام مشتری یا ساختمان..."
          className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-[12px] outline-none focus:border-amber-500"
        />
        <button type="button" onClick={startOfflineService} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-[13px] font-bold text-white">
          <Play size={15} fill="white" /> شروع ثبت آفلاین
        </button>
      </div>
      <div className="mx-3 rounded-xl border border-dashed border-amber-300 bg-white p-3 text-center text-[11px] text-gray-500">
        برای اتصال سرویس‌های ثبت‌شده به قراردادها، از گزینه جداگانه «صف سرویس‌های آفلاین» در صفحه اول استفاده کنید.
      </div>
      <div className="h-20" />
    </>
  );

  const renderOfflineQueueView = () => (
    <>
      {header("صف و تخصیص سرویس‌های آفلاین", () => setScreen("home"))}
      <div className="m-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11.5px] leading-5 text-blue-900">
        هر سرویس آفلاین را بازبینی کنید، قرارداد و ماه سرویس مقصد را انتخاب کنید و سپس آن را آنلاین ثبت نمایید.
      </div>
      <div className="mx-3 mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-gray-800">سرویس‌های منتظر تخصیص</h3>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">{fa(offlineDrafts.length)} مورد</span>
      </div>
      <div className="mx-3 space-y-2 pb-20">
        {offlineDrafts.map((draft) => (
          <div key={draft.id} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[13px] font-bold text-gray-800">{draft.customerName}</div>
                <div className="mt-1 text-[10.5px] text-gray-500">{draft.doneDate} · {draft.inTime} تا {draft.outTime}</div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[9.5px] font-bold ${navigator.onLine ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                {navigator.onLine ? "آماده انتقال" : "منتظر اینترنت"}
              </span>
            </div>
            <label className="mt-3 block text-[10.5px] text-gray-500">این گزارش متعلق به کدام سرویس است؟</label>
            <select
              value={draftMappings[draft.id] || ""}
              onChange={(event) => setDraftMappings((current) => ({ ...current, [draft.id]: event.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white p-2.5 text-[11px] outline-none focus:border-blue-400"
            >
              <option value="">انتخاب مشتری و سرویس مقصد...</option>
              {jobs.map((job) => (
                <option key={`${job.contract.id}:${job.month.id}`} value={`${job.contract.id}:${job.month.id}`}>
                  {job.contract.building.replace(/^\*\s*/, "")} — {job.month.m} {job.month.y} — قرارداد {job.contract.no}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => attachOfflineDraft(draft)}
              disabled={!navigator.onLine || !draftMappings[draft.id]}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-[12px] font-bold text-white disabled:bg-gray-300"
            >
              <Cloud size={15} /> اتصال به سرویس و ثبت آنلاین
            </button>
          </div>
        ))}
        {offlineDrafts.length === 0 && <div className="rounded-xl border border-dashed bg-white py-10 text-center text-[12px] text-gray-400">سرویس آفلاینی در صف نیست</div>}
      </div>
    </>
  );

  const simpleList = (title: string, list: Job[]) => (
    <>
      {header(title)}
      <div className="mt-2 bg-white">{list.map((j) => jobCard(j))}</div>
      {list.length === 0 && <div className="py-10 text-center text-[12px] text-gray-400">موردی نیست</div>}
      <div className="h-16" />
    </>
  );

  const renderCalendarView = () => {
    const days = getShamsiDaysInMonth(calendarYear, calendarMonth);
    const offset = getShamsiFirstDayOfWeek(calendarYear, calendarMonth);
    const datePrefix = `${calendarYear}/${String(calendarMonth).padStart(2, "0")}/`;
    const jobsByDate = new Map<string, Job[]>();
    jobs.forEach((job) => {
      const date = jobDate(job);
      jobsByDate.set(date, [...(jobsByDate.get(date) || []), job]);
    });
    const selectedJobs = jobsByDate.get(selectedCalendarDate) || [];
    const changeMonth = (delta: number) => {
      let month = calendarMonth + delta;
      let year = calendarYear;
      if (month > 12) { month = 1; year += 1; }
      if (month < 1) { month = 12; year -= 1; }
      setCalendarMonth(month);
      setCalendarYear(year);
      setSelectedCalendarDate(`${year}/${String(month).padStart(2, "0")}/01`);
    };

    return (
      <>
        {header("تقویم سرویس‌ها")}
        <div className="m-3 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-gradient-to-l from-blue-600 to-sky-500 px-3 py-3 text-white">
            <button type="button" onClick={() => changeMonth(-1)} className="rounded-full bg-white/15 p-2"><ChevronRight size={18} /></button>
            <div className="text-center">
              <div className="text-[14px] font-bold">{JALALI_MONTH_NAMES[calendarMonth - 1]} {fa(calendarYear)}</div>
              <div className="mt-0.5 text-[10px] text-blue-100">روزهای رنگی دارای سرویس هستند</div>
            </div>
            <button type="button" onClick={() => changeMonth(1)} className="rounded-full bg-white/15 p-2"><ChevronLeft size={18} /></button>
          </div>
          <div className="grid grid-cols-7 bg-blue-50 py-2 text-center text-[11px] font-bold text-blue-700">
            {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 p-2">
            {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: days }).map((_, index) => {
              const day = index + 1;
              const date = `${datePrefix}${String(day).padStart(2, "0")}`;
              const hasJobs = jobsByDate.has(date);
              const active = selectedCalendarDate === date;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedCalendarDate(date)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-[12px] font-semibold transition ${
                    active ? "bg-blue-100 text-blue-900 ring-2 ring-blue-500 shadow-sm" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {fa(day)}
                  {hasJobs && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mx-3 mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-gray-800">سرویس‌های {selectedCalendarDate.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}</h3>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-700">{fa(selectedJobs.length)} سرویس</span>
        </div>
        <div className="mx-3 overflow-hidden rounded-xl border bg-white">
          {selectedJobs.map(jobCard)}
          {selectedJobs.length === 0 && <div className="p-8 text-center text-[12px] text-gray-400">برای این روز سرویسی برنامه‌ریزی نشده است</div>}
        </div>
        <div className="h-20" />
      </>
    );
  };

  const renderServicesView = () => {
    // موتور تطابق فوق‌العاده قوی و نرمال‌سازی دقیق فارسی
    const normalizePersian = (text: string | number | null | undefined): string => {
      if (text === null || text === undefined) return "";
      let str = String(text).toLowerCase();
      str = str
        .replace(/[۰٠]/g, "0")
        .replace(/[۱١]/g, "1")
        .replace(/[۲٢]/g, "2")
        .replace(/[۳٣]/g, "3")
        .replace(/[۴٤]/g, "4")
        .replace(/[۵٥]/g, "5")
        .replace(/[۶٦]/g, "6")
        .replace(/[۷٧]/g, "7")
        .replace(/[۸٨]/g, "8")
        .replace(/[۹٩]/g, "9")
        .replace(/[يئ]/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/ة/g, "ه")
        .replace(/[آأإ]/g, "ا")
        .replace(/ؤ/g, "و")
        .replace(/[\u064B-\u065F\u0670]/g, "") // حذف اعراب
        .replace(/[\u200C\u200B\u200E\u200F\uFEFF]/g, " ") // یکنواخت‌سازی نیم‌فاصله
        .replace(/[_\-*#,/\\()؛،.:!؟«»"']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return str;
    };

    const collapsePersian = (text: string | number | null | undefined): string => {
      return normalizePersian(text).replace(/\s+/g, "");
    };

    const matchSmart = (target: string | number | null | undefined, query: string): boolean => {
      if (!query || !query.trim()) return true;
      if (!target) return false;

      const normTarget = normalizePersian(target);
      const normQuery = normalizePersian(query);
      const colTarget = collapsePersian(target);
      const colQuery = collapsePersian(query);

      if (!colQuery) return true;

      // ۱. تطابق رشته فشرده (انطباق «گلدوستها» با «گلدوست ها» و «گلدوست‌ها»)
      if (colTarget.includes(colQuery)) return true;

      // ۲. تطابق استاندارد
      if (normTarget.includes(normQuery)) return true;

      // ۳. تطابق تک‌تک واژه‌ها (توکن‌ها) به صورت مستقل از ترتیب
      const tokens = normQuery.split(" ").filter((t) => t.length > 0);
      if (tokens.length > 1) {
        const allMatch = tokens.every((token) => {
          const colToken = collapsePersian(token);
          return normTarget.includes(token) || colTarget.includes(colToken);
        });
        if (allMatch) return true;
      }

      // ۴. مدیریت هوشمند پسوندهای جمع و متداول (مثل «ها»، «های»، «ان»، «ات»)
      const rootQuery = normQuery.replace(/\s*(ها|های|ان|ات|ی|ای)$/g, "").trim();
      if (rootQuery.length >= 2) {
        const colRoot = collapsePersian(rootQuery);
        if (colTarget.includes(colRoot)) return true;
      }

      return false;
    };

    const matchesContract = (c: Contract, q: string): boolean => {
      if (!q.trim()) return true;
      const searchableFields = [
        c.building,
        c.building.replace(/^\*\s*/, ""),
        String(c.no),
        `قرارداد ${c.no}`,
        `قرارداد${c.no}`,
        c.manager,
        c.address || "",
        c.phone || "",
        c.coordinatorPhone || "",
        c.elevatorType || "",
        `${c.stops || ""} توقف`,
        `${c.floors || ""} طبقه`,
      ];
      if (searchableFields.some((f) => matchSmart(f, q))) return true;
      const combined = searchableFields.join(" ");
      return matchSmart(combined, q);
    };

    // لیست قراردادها به همراه محاسبه سرویس آماده و ماه‌های مربوطه
    const contractList = contracts.map((c) => {
      const details = appStore.getContractDetails(c.id);
      const months = details.months || [];

      // کارهای ماه گذشته که انجام نشده (مثلاً در مهرماه، کارهای شهریور)
      const lastMonthService = months.find((m) => m.m === previousMonthInfo.monthName && m.y === previousMonthInfo.year);
      const hasLastMonthPending = lastMonthService ? !lastMonthService.done : false;

      const pendingMonths = months.filter((m) => !m.done);
      const doneMonths = months.filter((m) => m.done);
      // سرویس منتخب برای شروع: اولویت قطعی با ماه گذشته که انجام نشده، یا اولین ماه انجام‌نشده
      const targetMonth = (hasLastMonthPending && lastMonthService)
        ? lastMonthService
        : (pendingMonths[0] || months[months.length - 1] || { id: "m1", m: previousMonthInfo.monthName, y: previousMonthInfo.year, amount: 0, done: false });
      const targetJob: Job = { contract: c, month: targetMonth, overdue: hasLastMonthPending };
      const isAllDone = !hasLastMonthPending;
      return {
        contract: c,
        details,
        months,
        hasLastMonthPending,
        lastMonthService,
        pendingMonths,
        doneMonths,
        targetMonth,
        targetJob,
        isAllDone,
      };
    });

    const filtered = contractList.filter((item) => {
      if (!matchesContract(item.contract, serviceQuery)) return false;
      if (serviceFilter === "pending") return item.hasLastMonthPending;
      if (serviceFilter === "done") return !item.hasLastMonthPending;
      return true;
    });

    const pendingCount = contractList.filter((c) => c.hasLastMonthPending).length;

    return (
      <>
        {header("سرویس‌ها (خارج از نوبت)", () => setScreen("home"))}

        {/* جستجوی هوشمند و پیشرفته */}
        <div className="sticky top-0 z-20 border-b bg-white/95 p-3 backdrop-blur-md shadow-xs">
          <div className="relative">
            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              placeholder="جستجوی دقیق نام ساختمان، مدیر، شماره قرارداد (مثلاً: گلدوستها، ۴۲)..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pr-10 pl-9 text-[12px] text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            {serviceQuery && (
              <button
                type="button"
                onClick={() => setServiceQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* فیلتر تب‌ها و تعداد نتایج */}
          <div className="mt-2.5 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setServiceFilter("all")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  serviceFilter === "all"
                    ? "bg-blue-600 font-bold text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                همه ({contractList.length})
              </button>
              <button
                type="button"
                onClick={() => setServiceFilter("pending")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  serviceFilter === "pending"
                    ? "bg-amber-600 font-bold text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                انجام‌نشده ماه گذشته ({fa(pendingCount)})
              </button>
              <button
                type="button"
                onClick={() => setServiceFilter("done")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  serviceFilter === "done"
                    ? "bg-emerald-600 font-bold text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                انجام‌شده‌ها
              </button>
            </div>

            <span className="text-[10px] text-gray-500">
              {filtered.length} ساختمان
            </span>
          </div>

          <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
            <span>💡 برای انجام سرویس خارج از نوبت، روی دکمه سبز «شروع سرویس» بزنید.</span>
          </div>
        </div>

        {/* لیست نتایج */}
        <div className="divide-y divide-gray-100 bg-white">
          {filtered.map(({ contract: c, months, pendingMonths, doneMonths, targetMonth, targetJob, isAllDone }) => {
            const activeAssignment = activeServiceAssignments.find(
              (item) => item.contractId === c.id && item.monthId === targetMonth.id
            );
            const isExpanded = expandedContractId === c.id;

            return (
              <div key={c.id} className="p-3.5 transition hover:bg-slate-50/70">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs mt-0.5">
                      <Building2 size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13.5px] font-bold text-gray-800">
                          {c.building.replace(/^\*\s*/, "")}
                        </span>
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-700">
                          #{c.no}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                        {c.address || "قزوین"}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10.5px] text-gray-600 flex-wrap">
                        <span>مدیر: {c.manager}</span>
                        {(c.coordinatorPhone || c.phone) && (
                          <a
                            href={`tel:${c.coordinatorPhone || c.phone}`}
                            className="inline-flex items-center gap-0.5 text-sky-600 font-mono hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone size={10} />
                            <span>{c.coordinatorPhone || c.phone}</span>
                          </a>
                        )}
                        {c.elevatorType && (
                          <span className="text-gray-400">· {c.elevatorType}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-left">
                    {activeAssignment ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                        در حال انجام
                      </span>
                    ) : isAllDone ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        ✓ همه ماه‌ها انجام شده
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        سرویس {targetMonth.m}
                      </span>
                    )}
                  </div>
                </div>

                {/* دکمه‌های عملیات سریع */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startService(targetJob)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-3 text-[12px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                  >
                    <Play size={15} className="fill-white" />
                    <span>شروع سرویس خارج از نوبت ({targetMonth.m})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelected(targetJob);
                      setScreen("job");
                    }}
                    className="flex items-center justify-center gap-1 rounded-xl bg-gray-100 py-2.5 px-3 text-[11.5px] font-medium text-gray-700 hover:bg-gray-200 active:scale-95 transition"
                    title="مشاهده جزئیات و نقشه قرارداد"
                  >
                    <span>جزئیات و نقشه</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>

                {/* باز کردن سایر ماه‌ها */}
                {months.length > 1 && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setExpandedContractId(isExpanded ? null : c.id)}
                      className="flex w-full items-center justify-between text-[11px] text-gray-500 hover:text-blue-600"
                    >
                      <span>سایر ماه‌های قرارداد ({months.length} ماه)</span>
                      <span className="text-[10px] underline font-medium">
                        {isExpanded ? "بستن ماه‌ها" : "مشاهده و انتخاب ماه دیگر"}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4 animate-in fade-in duration-150">
                        {months.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              const specificJob: Job = { contract: c, month: m, overdue: false };
                              startService(specificJob);
                            }}
                            className={`flex flex-col items-center justify-center rounded-lg p-2 text-center text-[10.5px] transition border ${
                              m.done
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : m.id === targetMonth.id
                                ? "border-blue-400 bg-blue-50 font-bold text-blue-800"
                                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span>{m.m} {m.y}</span>
                            <span className="text-[9px] mt-0.5">
                              {m.done ? "✓ انجام شد" : "شروع این ماه"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* حالت عدم یافت نتیجه */}
        {filtered.length === 0 && (
          <div className="py-16 px-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Search size={26} />
            </div>
            <div className="mt-3 text-[13.5px] font-bold text-gray-700">ساختمانی یافت نشد</div>
            <div className="mt-1 text-[11px] text-gray-500">
              عبارتی منطبق با «{serviceQuery}» پیدا نشد.
            </div>
            <div className="mt-2 text-[10.5px] text-gray-400">
              می‌توانید بخشی از نام ساختمان، نام مدیر یا شماره قرارداد (مانند 42) را جستجو کنید.
            </div>
            <button
              type="button"
              onClick={() => {
                setServiceQuery("");
                setServiceFilter("all");
              }}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              نمایش همه ساختمان‌ها
            </button>
          </div>
        )}

        <div className="h-24" />
      </>
    );
  };

  /* --------------------------------- Map View --------------------------------- */
  const renderMapView = () => {
    // 1. Helper to retrieve or calculate realistic coordinate for any contract
    const getContractCoords = (c: Contract) => {
      const saved = contractGeoLocations.find((item) => item.contractId === c.id);
      if (saved) return { lat: saved.latitude, lng: saved.longitude, isRegistered: true };

      // Deterministic realistic position across Qazvin based on contract id
      const seed1 = ((c.id * 179 + 31) % 1000) / 1000;
      const seed2 = ((c.id * 313 + 73) % 1000) / 1000;
      const lat = 36.255 + seed1 * 0.055;
      const lng = 49.980 + seed2 * 0.060;
      return { lat, lng, isRegistered: false };
    };

    // 2. Prepare all building items with service counts and distances
    const allBuildings = contracts.map((c) => {
      const coords = getContractCoords(c);
      const details = appStore.getContractDetails(c.id);
      const months = details.months || [];
      const lastMonthService = months.find((m) => m.m === previousMonthInfo.monthName && m.y === previousMonthInfo.year);
      const isLastMonthPending = lastMonthService ? !lastMonthService.done : false;
      const doneCount = months.filter((m) => m.done).length;
      const pendingCount = isLastMonthPending ? 1 : 0;
      const nextMonth = (isLastMonthPending && lastMonthService)
        ? lastMonthService
        : (months.find((m) => !m.done) || months[0] || { id: "m1", m: previousMonthInfo.monthName, y: previousMonthInfo.year, amount: 0, done: false });
      const targetJob: Job = { contract: c, month: nextMonth, overdue: isLastMonthPending };
      const distM = userGps ? Math.round(distanceMeters(userGps.lat, userGps.lng, coords.lat, coords.lng)) : null;
      const activeAssignment = activeServiceAssignments.find((a) => a.contractId === c.id);

      return {
        contract: c,
        coords,
        details,
        months,
        doneCount,
        pendingCount,
        isLastMonthPending,
        nextMonth,
        targetJob,
        distM,
        activeAssignment,
        isAllDone: !isLastMonthPending,
      };
    });

    // 3. User GPS Locator
    const locateTechnician = async () => {
      setIsLocatingUser(true);
      try {
        const pos = await getCurrentPosition();
        setUserGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        notify("موقعیت مکانی شما با موفقیت شناسایی شد");
      } catch {
        notify("امکان دریافت GPS وجود ندارد. دسترسی موقعیت مکانی دستگاه را فعال کنید.");
      } finally {
        setIsLocatingUser(false);
      }
    };

    // 4. Area Geofence Detection (Within 2.5 km of technician)
    const nearbyBuildings = userGps
      ? allBuildings.filter((b) => b.distM !== null && b.distM <= 2500)
      : [];
    const nearbyServicesCount = nearbyBuildings.reduce((sum, b) => sum + b.pendingCount, 0);

    // 5. Filter & Search
    const query = mapSearch.trim().toLowerCase();
    const filteredBuildings = allBuildings.filter((b) => {
      if (query) {
        const title = b.contract.building.toLowerCase();
        const no = String(b.contract.no);
        const manager = b.contract.manager.toLowerCase();
        const address = (b.contract.address || "").toLowerCase();
        if (!title.includes(query) && !no.includes(query) && !manager.includes(query) && !address.includes(query)) {
          return false;
        }
      }
      if (mapFilter === "registered") return b.coords.isRegistered;
      if (mapFilter === "pending") return b.pendingCount > 0;
      if (mapFilter === "nearby") return b.distM !== null && b.distM <= 2500;
      return true;
    });

    // 6. Selected Building
    const selectedItem =
      allBuildings.find((b) => b.contract.id === mapSelectedBuildingId) ||
      (filteredBuildings.length > 0 ? filteredBuildings[0] : allBuildings[0]);

    // Bounds for relative marker positioning on Qazvin canvas
    const minLat = 36.240;
    const maxLat = 36.320;
    const minLng = 49.970;
    const maxLng = 50.050;

    return (
      <div className="flex flex-col min-h-screen bg-slate-100">
        {header("نقشه سرویس‌ها و اماکن", () => setScreen("home"))}

        {/* Top Search & Filter Bar */}
        <div className="bg-white px-3 py-2.5 shadow-xs border-b border-gray-200 space-y-2 z-20">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={mapSearch}
                onChange={(e) => setMapSearch(e.target.value)}
                placeholder="جستجوی ساختمان یا شماره قرارداد روی نقشه..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pr-9 pl-8 text-[11.5px] outline-none focus:border-blue-500 focus:bg-white"
              />
              {mapSearch && (
                <button
                  type="button"
                  onClick={() => setMapSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={locateTechnician}
              disabled={isLocatingUser}
              className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-bold shadow-xs transition active:scale-95 ${
                userGps
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              title="موقعیت‌یابی زنده GPS"
            >
              <Locate size={15} className={isLocatingUser ? "animate-spin" : ""} />
              <span>{isLocatingUser ? "..." : userGps ? "GPS فعال" : "موقعیت من"}</span>
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[10.5px]">
            <button
              type="button"
              onClick={() => setMapFilter("all")}
              className={`shrink-0 rounded-lg px-2.5 py-1 transition ${
                mapFilter === "all"
                  ? "bg-blue-600 font-bold text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              همه ساختمان‌ها ({allBuildings.length})
            </button>
            <button
              type="button"
              onClick={() => setMapFilter("registered")}
              className={`shrink-0 rounded-lg px-2.5 py-1 transition ${
                mapFilter === "registered"
                  ? "bg-emerald-600 font-bold text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ✓ GPS ثبت‌شده ({allBuildings.filter((b) => b.coords.isRegistered).length})
            </button>
            <button
              type="button"
              onClick={() => setMapFilter("pending")}
              className={`shrink-0 rounded-lg px-2.5 py-1 transition ${
                mapFilter === "pending"
                  ? "bg-amber-600 font-bold text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              انجام‌نشده ماه گذشته ({allBuildings.filter((b) => b.isLastMonthPending).length})
            </button>
            {userGps && (
              <button
                type="button"
                onClick={() => setMapFilter("nearby")}
                className={`shrink-0 rounded-lg px-2.5 py-1 transition ${
                  mapFilter === "nearby"
                    ? "bg-purple-600 font-bold text-white shadow-xs"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                📍 نزدیک من ({nearbyBuildings.length})
              </button>
            )}
          </div>
        </div>

        {/* Area Geofence Alert Bar (when user enters area) */}
        {userGps && nearbyBuildings.length > 0 && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-3 py-2 text-white shadow-md flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Navigation size={14} className="rotate-45" />
              </span>
              <div>
                <div className="text-[11.5px] font-bold">
                  ورود به محدوده سرویس ({nearbyBuildings.length} ساختمان در اطراف شما)
                </div>
                <div className="text-[9.5px] text-slate-300">
                  مجموعاً {nearbyServicesCount} سرویس در این منطقه برای انجام وجود دارد
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMapFilter("nearby");
                if (nearbyBuildings[0]) setMapSelectedBuildingId(nearbyBuildings[0].contract.id);
              }}
              className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow hover:bg-emerald-700"
            >
              نمایش منطقه
            </button>
          </div>
        )}

        {/* Map View Canvas Container */}
        <div className="relative flex-1 min-h-[380px] w-full overflow-hidden bg-slate-200 select-none">
          {/* Base OpenStreetMap Iframe or Grid */}
          {showOsmBase && selectedItem ? (
            <iframe
              title="OpenStreetMap Base"
              className="absolute inset-0 h-full w-full border-0 opacity-85 pointer-events-none"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedItem.coords.lng - 0.018}%2C${selectedItem.coords.lat - 0.012}%2C${selectedItem.coords.lng + 0.018}%2C${selectedItem.coords.lat + 0.012}&layer=mapnik`}
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#cbd5e1_1px,transparent_1px),linear-gradient(#cbd5e1_1px,transparent_1px)] bg-[size:28px_28px] bg-slate-100 opacity-90" />
          )}

          {/* Interactive Map Overlay with Location Arrow Markers */}
          <div className="absolute inset-0 z-10 overflow-hidden">
            {filteredBuildings.map((b) => {
              const isSelected = selectedItem?.contract.id === b.contract.id;
              // Normalize coordinate to percent
              const rawX = ((b.coords.lng - minLng) / (maxLng - minLng)) * 86 + 7;
              const rawY = ((maxLat - b.coords.lat) / (maxLat - minLat)) * 82 + 9;
              const posX = Math.max(5, Math.min(95, rawX));
              const posY = Math.max(8, Math.min(92, rawY));

              return (
                <div
                  key={b.contract.id}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-full transition-transform duration-200 cursor-pointer"
                  onClick={() => setMapSelectedBuildingId(b.contract.id)}
                >
                  {/* Distinctive Location Arrow Pin with Service Count Badge */}
                  <div className="relative flex flex-col items-center group">
                    {/* Pulsing ring if selected */}
                    {isSelected && (
                      <span className="absolute -inset-2 rounded-full bg-violet-500/30 animate-ping pointer-events-none" />
                    )}

                    {/* Arrow / Pin Body with Service Count */}
                    <div
                      className={`relative flex items-center justify-center rounded-2xl shadow-xl border-2 transition-all duration-150 ${
                        isSelected
                          ? "bg-violet-700 text-white border-white scale-110 z-30"
                          : b.pendingCount > 0
                          ? "bg-amber-500 text-white border-white hover:scale-105 z-20"
                          : "bg-emerald-600 text-white border-white hover:scale-105 z-10"
                      } px-2 py-1 gap-1 min-w-[52px]`}
                    >
                      <Navigation size={11} className={isSelected ? "rotate-45" : "-rotate-45"} />
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[11px] font-black font-mono">
                          {b.pendingCount}
                        </span>
                        <span className="text-[7.5px] opacity-90 font-medium">سرویس</span>
                      </div>
                      {b.coords.isRegistered && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/90" title="GPS ثبت شده" />
                      )}
                    </div>

                    {/* Arrow Pointer Stem */}
                    <div
                      className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${
                        isSelected
                          ? "border-t-violet-700"
                          : b.pendingCount > 0
                          ? "border-t-amber-500"
                          : "border-t-emerald-600"
                      } drop-shadow-sm -mt-0.5`}
                    />

                    {/* Attached Building Name & Distance Label */}
                    <div
                      className={`mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-md shadow-md whitespace-nowrap transition ${
                        isSelected
                          ? "bg-violet-900/90 text-white ring-1 ring-white/50"
                          : "bg-black/75 text-white"
                      }`}
                    >
                      <span className="max-w-[70px] truncate">
                        {b.contract.building.replace(/^\*\s*/, "")}
                      </span>
                      {b.distM !== null && (
                        <span className="text-amber-300 font-mono text-[8.5px]">
                          {b.distM < 1000 ? `${b.distM}م` : `${(b.distM / 1000).toFixed(1)}ک`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* User GPS Pin (Blue pulsing beacon) */}
            {userGps && (
              <div
                style={{
                  left: `${Math.max(5, Math.min(95, ((userGps.lng - minLng) / (maxLng - minLng)) * 86 + 7))}%`,
                  top: `${Math.max(8, Math.min(92, ((maxLat - userGps.lat) / (maxLat - minLat)) * 82 + 9))}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-8 w-8 rounded-full bg-blue-500/35 animate-ping" />
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 border-2 border-white shadow-lg text-white">
                    <Crosshair size={11} />
                  </span>
                  <span className="absolute top-6 rounded-md bg-blue-900/90 px-1.5 py-0.5 text-[8.5px] font-bold text-white shadow">
                    شما اینجایید
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Floating Map Controls */}
          <div className="absolute top-3 left-3 z-30 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowOsmBase((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/95 text-gray-700 shadow-md backdrop-blur-md hover:bg-gray-100 transition active:scale-95"
              title="تغییر حالت نقشه شهری / معابر"
            >
              <Layers size={16} />
            </button>

            <button
              type="button"
              onClick={locateTechnician}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/95 text-blue-600 shadow-md backdrop-blur-md hover:bg-gray-100 transition active:scale-95"
              title="مرکز کردن روی موقعیت من"
            >
              <Locate size={16} className={isLocatingUser ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Legend Info Tag */}
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 rounded-lg bg-black/70 backdrop-blur-md px-2 py-1 text-[9px] text-white">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>دارای سرویس</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>انجام‌شده</span>
            </span>
          </div>
        </div>

        {/* Selected Building Quick Action Bottom Sheet */}
        {selectedItem && (
          <div className="bg-white border-t border-gray-200 p-3.5 shadow-2xl z-30 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 shadow-xs mt-0.5">
                  <Building2 size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-bold text-gray-800">
                      {selectedItem.contract.building.replace(/^\*\s*/, "")}
                    </span>
                    <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-700">
                      #{selectedItem.contract.no}
                    </span>
                    {selectedItem.coords.isRegistered ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-800">
                        ✓ GPS ثبت شده
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9.5px] font-semibold text-amber-800">
                        موقعیت تقریبی
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                    {selectedItem.contract.address || "قزوین"}
                  </div>

                  {/* Service Count Stats & Distance */}
                  <div className="mt-1 flex items-center gap-2 text-[10.5px] text-gray-600 flex-wrap">
                    <span className="text-emerald-700 font-medium">
                      ✓ {selectedItem.doneCount} انجام‌شده
                    </span>
                    <span className="text-amber-700 font-medium">
                      • {selectedItem.pendingCount} باقی‌مانده
                    </span>
                    {selectedItem.distM !== null && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">
                        فاصله: {selectedItem.distM < 1000 ? `${selectedItem.distM} متر` : `${(selectedItem.distM / 1000).toFixed(1)} کیلومتر`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close / Deselect */}
              <button
                type="button"
                onClick={() => setMapSelectedBuildingId(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {/* 1. Start Service Out-of-turn */}
              <button
                type="button"
                onClick={() => startService(selectedItem.targetJob)}
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 px-3 text-[12px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
              >
                <Play size={15} className="fill-white" />
                <span>شروع سرویس ({selectedItem.nextMonth.m})</span>
              </button>

              {/* 2. Navigation */}
              <button
                type="button"
                onClick={() =>
                  openNavigation({
                    building: selectedItem.contract.building,
                    address: selectedItem.contract.address,
                    lat: selectedItem.coords.lat,
                    lng: selectedItem.coords.lng,
                  })
                }
                className="flex items-center justify-center gap-1 rounded-xl bg-violet-600 py-2.5 px-2 text-[11px] font-bold text-white shadow-xs hover:bg-violet-700 active:scale-95 transition"
              >
                <Navigation size={13} />
                <span>مسیریابی</span>
              </button>

              {/* 3. Register / Adjust GPS Location */}
              <button
                type="button"
                onClick={() => registerContractPosition(selectedItem.contract)}
                className="flex items-center justify-center gap-1 rounded-xl bg-gray-100 py-2.5 px-2 text-[11px] font-medium text-gray-700 hover:bg-gray-200 active:scale-95 transition"
                title="ثبت یا اصلاح موقعیت جغرافیایی این ساختمان"
              >
                <MapPin size={13} className="text-amber-600" />
                <span>ثبت GPS</span>
              </button>
            </div>
          </div>
        )}

        <div className="h-16" />
      </div>
    );
  };

  const renderBottomNav = () => (
    <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] justify-around border-t bg-white py-1.5">
      {[
        ["home", "خانه", Home],
        ["map", "نقشه", MapIcon],
        ["calendar", "تقویم", CalendarDays],
        ["services", "سرویس‌ها", Briefcase],
      ].map(([k, l, I]: any) => (
        <button
          key={k}
          type="button"
          onClick={() => setScreen(k)}
          className={`flex flex-col items-center gap-0.5 px-3 text-[10.5px] ${screen === k ? "text-blue-600" : "text-gray-500"}`}
        >
          <I size={20} /> {l}
        </button>
      ))}
    </div>
  );

  /* ------------------------------- drawer -------------------------------- */
  const stats = useMemo(() => {
    let done = 0;
    let faultsDone = 0;
    contracts.forEach((c) => {
      const d = appStore.getContractDetails(c.id);
      done += d.months.filter((m) => m.done).length;
      faultsDone += (d.breakdowns || []).filter((b) => b.status === "انجام شده").length;
    });
    return { done, faultsDone };
  }, [contracts, screen]);

  const renderDrawer = () =>
    drawer ? (
      <div className="fixed inset-0 z-50 flex bg-black/50" onClick={() => setDrawer(false)}>
        <div className="h-full w-72 overflow-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="bg-blue-600 p-4 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
              {technician.name.slice(0, 1)}
            </div>
            <div className="mt-2 text-[14px] font-bold">{technician.name}</div>
            <div className="text-[11px] opacity-80">کد {technician.code || "6393"} · {technician.phone}</div>
            <span className="mt-2 inline-block rounded bg-white/20 px-2 py-0.5 text-[11px]">
              🏢 {technician.company || "شرکت آسمان‌سرا"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {[
              ["ساعت کار امروز", fmtDur(daySec)],
              [`ساعت کار ${currentMonthInfo.monthName}`, formatDurationPersian(currentMonthSec)],
              ["سرویس‌های این ماه", fa(stats.done)],
              ["خرابی‌های این ماه", fa(stats.faultsDone)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-gray-50 p-2 text-center">
                <div className="text-[13.5px] font-bold text-gray-800">{v}</div>
                <div className="text-[10px] text-gray-500">{k}</div>
              </div>
            ))}
          </div>
          <div className="px-3 pb-2 text-[10.5px] text-gray-400 text-center">
            (محاسبه ساعت کار ماه از اول {currentMonthInfo.monthName} شروع از صفر)
          </div>
          {[
            [
              RefreshCw,
              `بروزرسانی نرم‌افزار (آپدیت به نسخه ${APP_VERSION})`,
              async () => {
                setDrawer(false);
                await handleAppUpdate();
              },
            ],
            [
              Smartphone,
              "نصب برنامه مستقل «آسمانسرا» روی صفحه اصلی گوشی",
              () => {
                setDrawer(false);
                setAndroidModal(true);
              },
            ],
            [FileBarChart2, "گزارشات", () => { setDrawer(false); setScreen("services"); }],
            [RefreshCw, sync.status === "online" ? "همگام‌سازی اطلاعات (متصل)" : "همگام‌سازی اطلاعات (آفلاین)", async () => {
              setDrawer(false);
              notify("در حال همگام‌سازی...");
              const ok = await syncNow();
              notify(ok ? "اطلاعات با سرور همگام شد" : "اتصال به سرور برقرار نشد؛ داده‌ها محلی ذخیره شدند");
            }],
            [Monitor, "بازگشت به نسخه دسکتاپ", () => { setDrawer(false); onExitToDesktop(); }],
            [LogOut, "خروج", onSignOut],
          ].map(([I, l, run]: any) => (
            <button key={l} type="button" onClick={run} className="flex w-full items-center gap-3 border-b px-4 py-3 text-right text-[13px] text-gray-700 hover:bg-gray-50">
              <I size={18} className="text-gray-500" /> {l}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  /* ------------------------------ pay modal ------------------------------- */
  const renderDurationReviewModal = () =>
    durationReviewOpen ? (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" dir="rtl">
        <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
          <div className="flex items-center gap-2 text-[14px] font-bold text-amber-700">
            <Clock size={20} /> بررسی زمان طولانی سرویس
          </div>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11.5px] leading-5 text-amber-900">
            مدت این سرویس از دو ساعت بیشتر شده است. اگر ساعت خروج اشتباه است آن را اصلاح کنید؛ در غیر این صورت دلیل طولانی‌شدن را بنویسید.
          </p>
          <label className="mt-3 block text-[11px] text-gray-600">ساعت خروج واقعی</label>
          <input type="time" value={correctedOutTime} onChange={(e) => setCorrectedOutTime(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm" />
          <label className="mt-3 block text-[11px] text-gray-600">دلیل حضور بیش از دو ساعت</label>
          <textarea rows={3} value={durationReason} onChange={(e) => setDurationReason(e.target.value)} placeholder="مثلاً رفع خرابی پیچیده، انتظار برای قطعه یا هماهنگی با مدیر ساختمان..." className="mt-1 w-full rounded-xl border p-3 text-[12px]" />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setDurationReviewOpen(false)} className="flex-1 rounded-xl border py-2.5 text-[12px]">بازگشت</button>
            <button type="button" onClick={() => {
              const [inH, inM] = jobStartClock.split(":").map(Number);
              const [outH, outM] = correctedOutTime.split(":").map(Number);
              const correctedMinutes = outH * 60 + outM - (inH * 60 + inM);
              if (correctedMinutes >= 120 && !durationReason.trim()) {
                notify("برای سرویس بالای دو ساعت، نوشتن دلیل الزامی است");
                return;
              }
              if (correctedMinutes < 0) {
                notify("ساعت خروج نمی‌تواند قبل از ساعت ورود باشد");
                return;
              }
              finishService(true);
            }} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-[12px] font-bold text-white">تأیید و پایان سرویس</button>
          </div>
        </div>
      </div>
    ) : null;

  const renderPayModal = () =>
    payModal ? (
      <div className="fixed inset-0 z-50 flex items-end bg-black/50">
        <div className="w-full rounded-t-2xl bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-gray-800">
            <CreditCard size={18} className="text-emerald-600" /> دریافت وجه
          </div>
          <label className="block text-[12px] text-gray-600">
            مبلغ دریافتی (ریال)
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border px-2 py-2 text-[14px] font-bold outline-none"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {["کارت‌خوان سیار", "نقدی", "کارت به کارت", "چک"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayMethod(m)}
                className={`rounded-lg border py-2 text-[12.5px] ${payMethod === m ? "border-emerald-600 bg-emerald-50 text-emerald-700" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder="شماره پیگیری / مرجع"
            className="mt-3 w-full rounded-lg border px-2 py-2 text-[12.5px] outline-none"
          />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => submitPayment(true)} className="flex-1 rounded-xl border py-2.5 text-[13px]">
              بدون دریافت وجه
            </button>
            <button type="button" onClick={() => submitPayment(false)} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[13px] font-bold text-white">
              ثبت پرداخت
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const renderNavModal = () => {
    if (!navTarget) return null;
    const { building, address, lat, lng } = navTarget;
    const neshanUrl = `https://neshan.org/maps/@${lat},${lng},16z`;
    const baladUrl = `https://balad.ir/location?latitude=${lat}&longitude=${lng}`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 sm:items-center">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <div className="text-[14px] font-bold text-gray-800">انتخاب نرم‌افزار مسیریاب</div>
              <div className="text-[11px] text-gray-500 truncate max-w-[280px]">
                {building.replace(/^\*\s*/, "")} {address ? `(${address})` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNavTarget(null)}
              className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-2.5">
            {trafficInfo && (
              <div
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-[11px] ${
                  trafficInfo.status === "heavy"
                    ? "bg-rose-50 border border-rose-200 text-rose-800"
                    : trafficInfo.status === "moderate"
                    ? "bg-amber-50 border border-amber-200 text-amber-800"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  <Car size={14} />
                  <span>وضعیت ترافیک معابر: {trafficInfo.label}</span>
                </div>
                {trafficInfo.speedKmh !== null && (
                  <span className="font-mono font-bold">{trafficInfo.speedKmh} km/h</span>
                )}
              </div>
            )}
            <div className="mb-2 rounded-lg bg-gray-50 p-2 text-center text-[11px] text-gray-600 font-mono">
              مختصات مقصد: {lat.toFixed(5)}, {lng.toFixed(5)}
            </div>
            <a
              href={neshanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-gray-200 p-3 hover:bg-blue-50/60 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow">
                  ن
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-gray-800 group-hover:text-blue-700">مسیریاب نشان (Neshan)</div>
                  <div className="text-[10.5px] text-gray-500">مسیریابی دقیق در معابر شهری با ترافیک زنده</div>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-600" />
            </a>

            <a
              href={baladUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-gray-200 p-3 hover:bg-emerald-50/60 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow">
                  ب
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-gray-800 group-hover:text-emerald-700">مسیریاب بلد (Balad)</div>
                  <div className="text-[10.5px] text-gray-500">پلاک‌ها و طرح‌های ترافیک</div>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400 group-hover:text-emerald-600" />
            </a>

            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-gray-200 p-3 hover:bg-amber-50/60 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-sm shadow">
                  G
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-gray-800 group-hover:text-amber-700">Google Maps</div>
                  <div className="text-[10.5px] text-gray-500">مسیر مستقیم با مختصات ماهواره‌ای</div>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400 group-hover:text-amber-600" />
            </a>

            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-gray-200 p-3 hover:bg-sky-50/60 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white font-bold text-sm shadow">
                  W
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-gray-800 group-hover:text-sky-700">Waze</div>
                  <div className="text-[10.5px] text-gray-500">مسیریابی بین‌شهری و هشدارهای پلیس و سرعت</div>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400 group-hover:text-sky-600" />
            </a>
          </div>
          <div className="p-3 bg-gray-50 border-t">
            <button
              type="button"
              onClick={() => setNavTarget(null)}
              className="w-full rounded-xl bg-gray-200 py-2.5 text-[12.5px] font-medium text-gray-700 hover:bg-gray-300"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* -------------------------------- render -------------------------------- */
  return (
    <div dir="rtl" className="min-h-screen w-full bg-gray-200 font-[Vazirmatn,Tahoma,system-ui]">
      <div className="relative mx-auto min-h-screen max-w-[480px] bg-gray-100 shadow-xl">
        {screen === "home" && renderHomeView()}
        {screen === "job" && renderJobView()}
        {screen === "work" && renderWorkView()}
        {screen === "report" && renderReportView()}
        {screen === "sign" && renderSignView()}
        {screen === "map" && renderMapView()}
        {screen === "calendar" && renderCalendarView()}
        {screen === "services" && renderServicesView()}
        {screen === "offlineService" && renderOfflineServiceView()}
        {screen === "offlineQueue" && renderOfflineQueueView()}

        {["home", "map", "calendar", "services", "offlineService", "offlineQueue"].includes(screen) && renderBottomNav()}
        {renderDrawer()}
        {renderDurationReviewModal()}
        {renderPayModal()}
        {renderNavModal()}
        {locationDraft && (
          <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/55 p-3 sm:items-center">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div><div className="text-[14px] font-bold">تنظیم دقیق موقعیت ساختمان</div><div className="text-[10.5px] text-gray-500">{locationDraft.contract.building}</div></div>
                <button type="button" onClick={() => setLocationDraft(null)} className="rounded-full bg-gray-100 p-2"><X size={16}/></button>
              </div>
              <div
                className="relative h-[48vh] min-h-[320px] touch-none overflow-hidden bg-blue-50"
                onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
                onPointerMove={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100));
                  const y = Math.max(8, Math.min(92, ((event.clientY - rect.top) / rect.height) * 100));
                  setLocationDraft((draft) => draft ? { ...draft, x, y } : null);
                }}
              >
                <iframe title="نقشه تنظیم موقعیت" className="pointer-events-none h-full w-full border-0 opacity-90" src={`https://www.openstreetmap.org/export/embed.html?bbox=${locationDraft.longitude - 0.003}%2C${locationDraft.latitude - 0.003}%2C${locationDraft.longitude + 0.003}%2C${locationDraft.latitude + 0.003}&layer=mapnik`} />
                <div style={{ left: `${locationDraft.x}%`, top: `${locationDraft.y}%` }} className="pointer-events-none absolute -translate-x-1/2 -translate-y-full drop-shadow-lg">
                  <MapPin size={42} fill="#dc2626" className="text-white"/>
                </div>
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl bg-white/90 p-2 text-center text-[11px] font-bold text-gray-700 shadow">نشانگر قرمز را با انگشت روی ورودی دقیق ساختمان ببرید</div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                <button type="button" onClick={() => setLocationDraft(null)} className="rounded-xl border py-3 text-[12px]">انصراف</button>
                <button type="button" onClick={saveLocationDraft} className="rounded-xl bg-emerald-600 py-3 text-[12px] font-bold text-white">ثبت نهایی مکان</button>
              </div>
            </div>
          </div>
        )}
        <AndroidAppModal open={androidModal} onClose={() => setAndroidModal(false)} />

        {toast && (
          <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gray-900/90 px-4 py-2 text-[12px] text-white shadow-xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

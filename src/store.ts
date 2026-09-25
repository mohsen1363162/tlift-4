import { useSyncExternalStore } from "react";
import { pushKey, registerApplier, syncNow, recordOfflineService, getSyncState } from "./cloudSync";
import { Contract, Customer, Staff, initialContracts, initialCustomers, initialStaff } from "./data";
import type { BuildingCsvRow } from "./utils/buildingsCsv";
import { getContractServiceDay } from "./utils/serviceScheduleDays";
import { getContractOfficialFee } from "./data/contractServiceFees";
import bootstrapData from "./data/tlift-bootstrap.json";
import {
  RAW_CSV_DATA,
  RAW_CUSTOMERS_CSV_DATA,
  parseContractsCsv,
  convertRowToContract,
  parseCustomersCsv,
  convertRowToCustomer,
} from "./csvData";

// Type definitions
export type ServicePartItem = {
  code?: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
};

export type ServiceChecklistStatus = "ok" | "fault" | "na";

export type MonthService = {
  id: number;
  m: string;
  y: number;
  done: boolean;
  date?: string;
  inTime?: string;
  outTime?: string;
  amount: number;
  paid: boolean;
  paidDate?: string;
  paidMethod?: string;
  paidRef?: string;
  techs?: string[];
  doneBy?: string;
  report?: string;
  reminder?: string;
  customerFollowup?: string;
  faultsCount?: number;
  faultsList?: string[];
  partsAmount?: number;
  partsList?: ServicePartItem[];
  wage?: number;
  trip?: number;
  discount?: number;
  tax?: number;
  serviceNo?: string;
  plannedDate?: string;
  deviceNo?: string;
  buildingName?: string;
  checklistResults?: Record<number, ServiceChecklistStatus>;
  attachments?: string[];
  delayOrAdvance?: string;
  serviceDurationReason?: string;
};

export type PaymentRecord = {
  id: number;
  title: string;
  date: string;
  amount: number;
  method: string;
  ref?: string;
  monthId?: number;
  customerName?: string;
  paymentType?: string;
  forReason?: string;
  regDate?: string;
  buildingName?: string;
  buildingAddress?: string;
  notes?: string;
  bank?: string;
  accountNo?: string;
  installmentNo?: number;
};

export type Invoice = {
  id: number;
  title: string;
  date: string;
  amount: number;
  parts: number;
  wage: number;
};

export type BreakdownStatus =
  | "انجام شده"
  | "انجام نشده"
  | "باطل شده"
  | "دارای مغایرت"
  | "در انتظار تایید";

export type BreakdownItem = {
  id: string;
  rowNo: number;
  status: BreakdownStatus;
  technicians: string[];
  declareDate: string;
  declareTime?: string;
  executionStatus: string;
  resolveDate?: string;
  delayOrAdvance?: string;
  declaredBy: string;
  contactPhone?: string;
  partsAmount: number;
  report: string;
  description: string;
  createdAt: number;
};

export type ContractDetails = {
  months: MonthService[];
  payments: PaymentRecord[];
  invoices: Invoice[];
  breakdowns?: BreakdownItem[];
};

const DEFAULT_MONTHS_NAMES = [
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
  "فروردین",
  "اردیبهشت",
];

export function generateInitialMonths(startYear = 1405, monthlyAmount = 8500000): MonthService[] {
  return [
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
    "فروردین",
    "اردیبهشت",
  ].map((m, i) => {
    const y = i >= 10 ? startYear + 1 : startYear;
    const isFirst = i === 0;
    return {
      id: i + 1,
      m,
      y,
      done: isFirst,
      date: isFirst ? `${y}/03/25` : undefined,
      inTime: isFirst ? "10:00" : undefined,
      outTime: isFirst ? "11:30" : undefined,
      amount: monthlyAmount,
      paid: isFirst,
      paidDate: isFirst ? `${y}/03/26` : undefined,
      paidMethod: isFirst ? "کارت به کارت" : undefined,
      paidRef: isFirst ? "TRX-89301" : undefined,
      doneBy: isFirst ? "علی کاظمی" : undefined,
      techs: isFirst ? ["علی کاظمی", "محمد رضایی"] : undefined,
      report: isFirst
        ? "سرویس ماهیانه موتورخانه، آچارکشی اتصالات ریل‌ها، بازبینی روغن گیربکس و تنظیم سنسورهای توقف طبقات با موفقیت انجام شد."
        : undefined,
      faultsCount: isFirst ? 1 : 0,
      faultsList: isFirst ? ["لرزش جزئی در حرکت بین طبقات ۲ و ۳ که با رگلاژ کفشک‌ها برطرف شد"] : [],
      partsAmount: isFirst ? 1850000 : 0,
      partsList: isFirst
        ? [
            { code: "29304", name: "روغن ریل ۱ لیتری", unit: "لیتر", qty: 1, price: 650000 },
            { code: "29307", name: "لنت کفشک کابین", unit: "جفت", qty: 1, price: 1200000 },
          ]
        : [],
      wage: isFirst ? 500000 : 0,
    };
  });
}

// LocalStorage helpers
function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) return JSON.parse(item);

    // اگر کلید اصلی به هر دلیل آسیب دید، آخرین نسخه پشتیبان محلی بازیابی شود.
    const backup = localStorage.getItem(`${key}__backup`);
    if (backup) {
      const restored = JSON.parse(backup) as T;
      localStorage.setItem(key, backup);
      return restored;
    }
    return fallback;
  } catch (e) {
    console.warn(`Error reading localStorage for ${key}`, e);
    try {
      const backup = localStorage.getItem(`${key}__backup`);
      return backup ? (JSON.parse(backup) as T) : fallback;
    } catch {
      return fallback;
    }
  }
}

function writeLocalStorage<T>(key: string, data: T) {
  try {
    const serialized = JSON.stringify(data);
    // قبل از هر تغییر، نسخه سالم فعلی را نگه می‌داریم تا ارتقای برنامه
    // یا پاسخ اشتباه سرور نتواند تنها کپی اطلاعات مالی را از بین ببرد.
    const current = localStorage.getItem(key);
    if (current && current !== serialized) {
      localStorage.setItem(`${key}__backup`, current);
    }
    localStorage.setItem(key, serialized);
  } catch (e) {
    console.warn(`Error saving localStorage for ${key}`, e);
  }
}

function saveStorage<T>(key: string, data: T) {
  writeLocalStorage(key, data);
  // آینه‌سازی در سرور (پرچم‌های seed همگام نمی‌شوند)
  if (!key.includes("seeded")) pushKey(key, data);
}

// اگر برنامه روی مرورگر/پیش‌نمایش تازه اجرا شود و دیتابیس محلی خالی باشد،
// نسخه پایدار ثبت‌شده در مخزن خصوصی بازیابی و برای سرور نیز صف‌بندی می‌شود.
function restoreBootstrapWhenEmpty() {
  try {
    const localContracts = JSON.parse(localStorage.getItem("tlift_contracts") || "[]");
    const localCustomers = JSON.parse(localStorage.getItem("tlift_customers") || "[]");
    if (Array.isArray(localContracts) && localContracts.length > 0 && Array.isArray(localCustomers) && localCustomers.length > 0) return;
    const entries = (bootstrapData as { entries?: Record<string, unknown> }).entries || {};
    Object.entries(entries).forEach(([key, value]) => {
      writeLocalStorage(key, value);
      pushKey(key, value);
    });
    localStorage.setItem("tlift_bootstrap_restored_v1", new Date().toISOString());
  } catch (error) {
    console.warn("Unable to restore bundled T-Lift backup", error);
  }
}
restoreBootstrapWhenEmpty();

// اعمال مبالغ واقعی و مصوب قراردادها از لیست رسمی مدیریت به حافظه مرورگر
function syncOfficialContractFees() {
  try {
    const rawContracts = localStorage.getItem("tlift_contracts");
    if (!rawContracts) return;
    const storedContracts = JSON.parse(rawContracts) as Contract[];
    if (!Array.isArray(storedContracts) || storedContracts.length === 0) return;

    let contractsUpdated = false;
    const updatedContracts = storedContracts.map((c) => {
      const officialFee = getContractOfficialFee(c.no);
      if (typeof officialFee === "number" && c.monthlyServiceFee !== officialFee) {
        contractsUpdated = true;
        return { ...c, monthlyServiceFee: officialFee };
      }
      return c;
    });

    if (contractsUpdated) {
      writeLocalStorage("tlift_contracts", updatedContracts);
    }

    const rawDetails = localStorage.getItem("tlift_contract_details");
    if (rawDetails) {
      const detailsMap = JSON.parse(rawDetails) as Record<string, ContractDetails>;
      let detailsUpdated = false;
      Object.keys(detailsMap).forEach((cidStr) => {
        const cid = Number(cidStr);
        const c = updatedContracts.find((item) => item.id === cid);
        if (!c) return;
        const fee = getContractOfficialFee(c.no) ?? c.monthlyServiceFee ?? 0;
        const details = detailsMap[cidStr];
        if (details && Array.isArray(details.months)) {
          details.months.forEach((m) => {
            if (m.amount !== fee) {
              m.amount = fee;
              detailsUpdated = true;
            }
          });
        }
      });
      if (detailsUpdated) {
        writeLocalStorage("tlift_contract_details", detailsMap);
      }
    }
  } catch (err) {
    console.warn("Failed to sync official contract fees", err);
  }
}
syncOfficialContractFees();

// In-Memory Global State
export type MarketingItem = {
  id: string;
  name: string;
  section: string;
  groupTitle?: string;
  pinnedAt?: number;
};

const INITIAL_MARKETING_ITEMS: MarketingItem[] = [
  { id: "service:قرارداد ها", name: "قرارداد ها", section: "سرویس و نگهداری", groupTitle: "گزارشات" },
  { id: "file:لیست مشتریان", name: "لیست مشتریان", section: "پرونده", groupTitle: "مشتریان" },
];

export type CompanyLeader = { id: string; name: string; phone: string; title: "مدیرعامل" | "رئیس شرکت" | "مدیر"; canManageContracts: boolean; canManageFinancials: boolean; canAccessSettings: boolean };
export type CompanyAccessSettings = { gpsRequired: boolean; gpsRadiusMeters: number; leaders: CompanyLeader[] };
export type ContractGeoLocation = { contractId: number; latitude: number; longitude: number; accuracy?: number; updatedAt: number };

export type TechnicianPartDelivery = {
  id: string;
  technicianName: string;
  partName: string;
  quantity: number;
  deliveredAt: string;
  note?: string;
};

export type ActiveServiceAssignment = {
  contractId: number;
  monthId: number;
  technicianName: string;
  startedAt: number;
  buildingName: string;
};

export type ScheduledService = {
  id: string;
  date: string; // e.g. "1405-06-01"
  buildingName: string;
  status: "done" | "pending";
  technician: string;
  techCount: number;
  zone: string;
  contractNo: string;
  customerName: string;
  customerPhone?: string;
  address?: string;
  time?: string;
  notes?: string;
  partsRequested?: Array<{ id: string; name: string; qty: number; reason: string; date: string }>;
  scheduledDate?: string;
  actualDate?: string;
  partsUsed?: string[];
  report?: string;
  lastUpdated?: number;
};

export type ZoneItem = {
  id: number;
  name: string; // منطقه
  city: string; // شهر
  province: string; // استان
};

export const INITIAL_ZONES: ZoneItem[] = [
  { id: 1, name: "عارف خرم", city: "قزوین", province: "قزوین" },
  { id: 2, name: "عارف سپهر", city: "قزوین", province: "قزوین" },
  { id: 3, name: "عارف متفرقه", city: "قزوین", province: "قزوین" },
  { id: 4, name: "لوازم اصلی", city: "قزوین", province: "قزوین" },
  { id: 5, name: "لوازم پارس شرقی", city: "قزوین", province: "قزوین" },
  { id: 6, name: "غیاث آباد", city: "قزوین", province: "قزوین" },
  { id: 7, name: "کوثر", city: "قزوین", province: "قزوین" },
  { id: 8, name: "مینودر", city: "قزوین", province: "قزوین" },
  { id: 9, name: "نوروزیان", city: "قزوین", province: "قزوین" },
  { id: 10, name: "حکیم", city: "قزوین", province: "قزوین" },
  { id: 11, name: "قائم", city: "قزوین", province: "قزوین" },
  { id: 12, name: "ملاصدرا غربی", city: "قزوین", province: "قزوین" },
  { id: 13, name: "پونک", city: "قزوین", province: "قزوین" },
  { id: 14, name: "ملاصدرا شرقی", city: "قزوین", province: "قزوین" },
  { id: 15, name: "دانشگاه", city: "قزوین", province: "قزوین" },
  { id: 16, name: "پادگان بلوار توحید", city: "قزوین", province: "قزوین" },
  { id: 17, name: "جانبازان", city: "قزوین", province: "قزوین" },
  { id: 18, name: "مرکز شهر", city: "قزوین", province: "قزوین" },
  { id: 19, name: "راه آهن", city: "قزوین", province: "قزوین" },
  { id: 20, name: "تهران قدیم", city: "قزوین", province: "قزوین" },
  { id: 21, name: "خیام", city: "قزوین", province: "قزوین" },
  { id: 22, name: "فردوسی", city: "قزوین", province: "قزوین" },
  { id: 23, name: "فلسطین", city: "قزوین", province: "قزوین" },
  { id: 24, name: "ولیعصر", city: "قزوین", province: "قزوین" },
  { id: 25, name: "نواب", city: "قزوین", province: "قزوین" },
  { id: 26, name: "سعدی", city: "قزوین", province: "قزوین" },
  { id: 27, name: "مولوی", city: "قزوین", province: "قزوین" },
  { id: 28, name: "منتظری", city: "قزوین", province: "قزوین" },
  { id: 29, name: "باغ دبیر", city: "قزوین", province: "قزوین" },
  { id: 30, name: "سپه (شهدا)", city: "قزوین", province: "قزوین" },
  { id: 31, name: "هادی آباد", city: "قزوین", province: "قزوین" },
  { id: 32, name: "مهدیه", city: "قزوین", province: "قزوین" },
  { id: 33, name: "دروازه رشت", city: "قزوین", province: "قزوین" },
  { id: 34, name: "مصیب مرادی", city: "قزوین", province: "قزوین" },
  { id: 35, name: "جابرین حیان", city: "قزوین", province: "قزوین" },
  { id: 36, name: "سالن ورزشی معلولین", city: "قزوین", province: "قزوین" },
  { id: 37, name: "امام حسن", city: "قزوین", province: "قزوین" },
  { id: 38, name: "امام سجاد", city: "قزوین", province: "قزوین" },
];

export type ChecklistItem = {
  id: number;
  rowNo: number;
  deviceType: string; // آسانسور، پله برقی، رمپ
  category: string; // طبقات، چاله آسانسور، داخل کابین، روی کابین، داخل چاه، موتور خانه
  question: string;
  period: string; // ماهیانه
};

export const INITIAL_CHECKLIST_CATEGORIES: string[] = [
  "طبقات",
  "چاله آسانسور",
  "داخل کابین",
  "روی کابین",
  "داخل چاه",
  "موتور خانه",
];

export const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: 1, rowNo: 1, deviceType: "آسانسور", category: "طبقات", question: "اطمینان از پل نبودن کنتاکت دربهای طبقه و در کابین", period: "ماهیانه" },
  { id: 2, rowNo: 2, deviceType: "آسانسور", category: "طبقات", question: "بازدید لته درب تمام اتوماتیک / کفشکها / مکانیزم", period: "ماهیانه" },
  { id: 3, rowNo: 3, deviceType: "آسانسور", category: "طبقات", question: "بررسی و بازدید عملکرد درب لولایی / دوشاخ کنتاکت", period: "ماهیانه" },
  { id: 4, rowNo: 4, deviceType: "آسانسور", category: "طبقات", question: "بررسی وبازدید عملکرد شستی طبقات", period: "ماهیانه" },
  { id: 5, rowNo: 5, deviceType: "آسانسور", category: "طبقات", question: "بررسی و بازدید شیشه و قاب شیشه ها/ فنر درب ها", period: "ماهیانه" },
  { id: 6, rowNo: 6, deviceType: "آسانسور", category: "طبقات", question: "بررسی و بازدید قفل و دیکتاتورها", period: "ماهیانه" },
  { id: 7, rowNo: 7, deviceType: "آسانسور", category: "چاله آسانسور", question: "بازدید لرزه گیرهای کابین / کفشکهای کابین", period: "ماهیانه" },
  { id: 8, rowNo: 8, deviceType: "آسانسور", category: "چاله آسانسور", question: "بررسی و تست عملکرد استپ ته چاه/ کلید تبدیل", period: "ماهیانه" },
  { id: 9, rowNo: 9, deviceType: "آسانسور", category: "چاله آسانسور", question: "بررسی و بازدید چراغهای تونلی / کابلها", period: "ماهیانه" },
  { id: 10, rowNo: 10, deviceType: "آسانسور", category: "چاله آسانسور", question: "بررسی و بازدید لیمیتها / اتصالات", period: "ماهیانه" },
  { id: 11, rowNo: 11, deviceType: "آسانسور", category: "چاله آسانسور", question: "بازدید بافرها/فلکه گاورنر چاه/ میکروسوئیچ ها", period: "ماهیانه" },
  { id: 12, rowNo: 12, deviceType: "آسانسور", category: "چاله آسانسور", question: "بازدید نظافت کف چاهک", period: "ماهیانه" },
  { id: 13, rowNo: 13, deviceType: "آسانسور", category: "داخل کابین", question: "بررسی و بازدید عملکرد پوش باتن ها شستی کابین", period: "ماهیانه" },
  { id: 14, rowNo: 14, deviceType: "آسانسور", category: "داخل کابین", question: "بازدید عملکرد چراغ اضطراری / زنگ", period: "ماهیانه" },
  { id: 15, rowNo: 15, deviceType: "آسانسور", category: "داخل کابین", question: "بازدید عملکرد صحیح درب داخل / لته ها / کفشک ها", period: "ماهیانه" },
  { id: 16, rowNo: 16, deviceType: "آسانسور", category: "داخل کابین", question: "بررسی آینه / دستگیره / پاخور", period: "ماهیانه" },
  { id: 17, rowNo: 17, deviceType: "آسانسور", category: "داخل کابین", question: "بازدید عملکرد روشنایی / هالوژن / فن", period: "ماهیانه" },
  { id: 18, rowNo: 18, deviceType: "آسانسور", category: "داخل کابین", question: "بررسی نظافت کابین / سقف کاذب / سیل درب", period: "ماهیانه" },
  { id: 19, rowNo: 19, deviceType: "آسانسور", category: "روی کابین", question: "بازدید عملکرد درب داخل کابین / برد / قرقره / موتور", period: "ماهیانه" },
  { id: 20, rowNo: 20, deviceType: "آسانسور", category: "روی کابین", question: "بازدید عملکرد مگنت درباز کن / برقی / مکانیکی", period: "ماهیانه" },
  { id: 21, rowNo: 21, deviceType: "آسانسور", category: "روی کابین", question: "بازدید ریویزیون / سیم کشی ها / اورلود", period: "ماهیانه" },
  { id: 22, rowNo: 22, deviceType: "آسانسور", category: "روی کابین", question: "بازدید و تنظیم پاراشوت / عملکرد صحیح / میکروسوئیچ", period: "ماهیانه" },
  { id: 23, rowNo: 23, deviceType: "آسانسور", category: "روی کابین", question: "بازدید لرزه گیرهای کابین / پیچ و مهره و اتصالات یوک", period: "ماهیانه" },
  { id: 24, rowNo: 24, deviceType: "آسانسور", category: "روی کابین", question: "بازدید آهنرباهای Level و ایست طبقات / فن کابین", period: "ماهیانه" },
  { id: 25, rowNo: 25, deviceType: "آسانسور", category: "روی کابین", question: "بازدید کفشک های روی کابین ، وزنه / روغندان / سنسورها", period: "ماهیانه" },
  { id: 26, rowNo: 26, deviceType: "آسانسور", category: "داخل چاه", question: "بازدید سلامت داکت ها / سیم کشی چاه / بستها", period: "ماهیانه" },
  { id: 27, rowNo: 27, deviceType: "آسانسور", category: "داخل چاه", question: "روشنایی چاه / چراغ تونلی / روغن روغندان ها", period: "ماهیانه" },
  { id: 28, rowNo: 28, deviceType: "آسانسور", category: "داخل چاه", question: "بازدید کشش و بافت بکسل ها / کرپی ها / قلاب ها", period: "ماهیانه" },
  { id: 29, rowNo: 29, deviceType: "آسانسور", category: "داخل چاه", question: "بازدید اتصالات ریل ها / تمیزی / بتن سقف", period: "ماهیانه" },
  { id: 30, rowNo: 30, deviceType: "آسانسور", category: "داخل چاه", question: "بازدید تمیزی روی کابین و ریویزیون / درب کابین", period: "ماهیانه" },
  { id: 31, rowNo: 31, deviceType: "آسانسور", category: "موتور خانه", question: "بررسی عملکرد صحیح کنترل بار و فاز / مدار ایمنی", period: "ماهیانه" },
  { id: 32, rowNo: 32, deviceType: "آسانسور", category: "موتور خانه", question: "بررسی گاورنر بالا / میکروسوئیچ / عملکرد صحیح", period: "ماهیانه" },
  { id: 33, rowNo: 33, deviceType: "آسانسور", category: "موتور خانه", question: "بازدید تابلو فرمان / سلامت قطعات / تمیزی", period: "ماهیانه" },
  { id: 34, rowNo: 34, deviceType: "آسانسور", category: "موتور خانه", question: "بازدید تابلو سه فاز / کلید 0 و 1 / فیوزها / چراغ سیگنال", period: "ماهیانه" },
  { id: 35, rowNo: 35, deviceType: "آسانسور", category: "موتور خانه", question: "بازدید براده ریزی فلکه اصلی / هرزگرد", period: "ماهیانه" },
  { id: 36, rowNo: 36, deviceType: "آسانسور", category: "موتور خانه", question: "بازدید مگنت ترمز / فن موتور / روغن ریزی / اینکودر", period: "ماهیانه" },
  { id: 37, rowNo: 37, deviceType: "آسانسور", category: "موتور خانه", question: "بازدید موتور / گیربکس / روغن گیربکس / تراز بودن", period: "ماهیانه" },
  { id: 38, rowNo: 38, deviceType: "آسانسور", category: "موتور خانه", question: "بررسی و بازدید تمیزی سکو و موتور خانه / روشنایی / تهویه", period: "ماهیانه" },
];

const INITIAL_SCHEDULED_SERVICES: ScheduledService[] = [
  // 1405-06-01
  {
    id: "srv-0601-1",
    date: "1405-06-01",
    buildingName: "بلوک حافظ",
    status: "pending",
    technician: "میثم سهرابی",
    techCount: 5,
    zone: "مسکن مهر قزوین - البرز",
    contractNo: "5004",
    customerName: "اسدزاده بلوک حافظ",
    customerPhone: "09121812345",
    address: "قزوین، مسکن مهر، بلوک حافظ",
  },
  {
    id: "srv-0601-2",
    date: "1405-06-01",
    buildingName: "کاکاوند نژاد بلوک 7",
    status: "pending",
    technician: "میثم سهرابی",
    techCount: 5,
    zone: "مسکن مهر قزوین - البرز",
    contractNo: "5541",
    customerName: "کاکاوند نژاد بلوک 7",
    customerPhone: "09123819021",
    address: "قزوین، مسکن مهر، مجتمع کاکاوند نژاد، بلوک ۷",
  },
  {
    id: "srv-0601-3",
    date: "1405-06-01",
    buildingName: "بلوک 18",
    status: "done",
    technician: "میثم سهرابی",
    techCount: 5,
    zone: "الوند قزوین - قزوین",
    contractNo: "5002",
    customerName: "نریمان بلوک 18",
    customerPhone: "09128821903",
    address: "قزوین، الوند، مجتمع نریمان، بلوک ۱۸",
  },
  {
    id: "srv-0601-4",
    date: "1405-06-01",
    buildingName: "بلوک 19",
    status: "done",
    technician: "میثم سهرابی",
    techCount: 5,
    zone: "الوند قزوین - قزوین",
    contractNo: "5003",
    customerName: "نریمان بلوک 19",
    customerPhone: "09128821904",
    address: "قزوین، الوند، مجتمع نریمان، بلوک ۱۹",
  },

  // 1405-06-02
  {
    id: "srv-0602-1",
    date: "1405-06-02",
    buildingName: "الماسی کوچه 20",
    status: "done",
    technician: "میثم سهرابی",
    techCount: 5,
    zone: "امام سجاد قزوین - البرز",
    contractNo: "5518",
    customerName: "الماسی",
    customerPhone: "09121817744",
    address: "قزوین، خ امام سجاد، کوچه ۲۰، پلاک ۱۲",
  },
  {
    id: "srv-0602-2",
    date: "1405-06-02",
    buildingName: "امید ولی",
    status: "done",
    technician: "میثم سهرابی",
    techCount: 5,
    zone: "امام سجاد قزوین - البرز",
    contractNo: "5065",
    customerName: "امید ولی",
    customerPhone: "09125816392",
    address: "قزوین، شهرک امام سجاد، مجتمع امید ولی",
  },
  {
    id: "srv-0602-3",
    date: "1405-06-02",
    buildingName: "رحیمی خ امام عسگری",
    status: "done",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "امام سجاد قزوین - البرز",
    contractNo: "5012",
    customerName: "رحیمی خ امام عسگری(ع)",
    customerPhone: "09192815521",
    address: "قزوین، خ امام حسن عسگری، ساختمان رحیمی",
  },
  {
    id: "srv-0602-4",
    date: "1405-06-02",
    buildingName: "قربانی کوچه 24",
    status: "done",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "امام سجاد قزوین - البرز",
    contractNo: "5015",
    customerName: "قربانی",
    customerPhone: "09127814409",
    address: "قزوین، خ امام سجاد، کوچه ۲۴",
  },

  // 1405-06-03
  {
    id: "srv-0603-1",
    date: "1405-06-03",
    buildingName: "صیادان ساختمان ترنج",
    status: "pending",
    technician: "بهمن کشاورز",
    techCount: 4,
    zone: "جابربن حیان قزوین - البرز",
    contractNo: "4543",
    customerName: "صیادان ساختمان ترنج",
    customerPhone: "09123812948",
    address: "قزوین، بلوار جابربن حیان، مجتمع صیادان، بلوک ترنج",
  },
  {
    id: "srv-0603-2",
    date: "1405-06-03",
    buildingName: "فکوری صداقت 8",
    status: "pending",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "سالن ورزشی معلولین قزوین - البرز",
    contractNo: "5516",
    customerName: "فکوری",
    customerPhone: "09128813390",
    address: "قزوین، کوچه صداقت ۸، پلاک ۴",
  },
  {
    id: "srv-0603-3",
    date: "1405-06-03",
    buildingName: "کوخالو بصیرت 3",
    status: "pending",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "سالن ورزشی معلولین قزوین - البرز",
    contractNo: "5043",
    customerName: "کوخالو بصیرت 3",
    customerPhone: "09121818822",
    address: "قزوین، خیابان بصیرت، بصیرت ۳",
  },
  {
    id: "srv-0603-4",
    date: "1405-06-03",
    buildingName: "کشاورز بصیرت 4",
    status: "pending",
    technician: "میثم سهرابی",
    techCount: 5,
    zone: "سالن ورزشی معلولین قزوین - البرز",
    contractNo: "5044",
    customerName: "کشاورز بصیرت 4",
    customerPhone: "09191817733",
    address: "قزوین، خیابان بصیرت، بصیرت ۴",
  },

  // 1405-06-04
  {
    id: "srv-0604-1",
    date: "1405-06-04",
    buildingName: "موسوی قطعه 34",
    status: "pending",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "امام حسن قزوین",
    contractNo: "5210",
    customerName: "موسوی قطعه 34",
    customerPhone: "09129810011",
    address: "قزوین، شهرک امام حسن، قطعه ۳۴",
  },
  {
    id: "srv-0604-2",
    date: "1405-06-04",
    buildingName: "شفیعی پرسپولیس 4",
    status: "pending",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "امام حسن قزوین",
    contractNo: "5211",
    customerName: "شفیعی پرسپولیس 4",
    customerPhone: "09124819922",
    address: "قزوین، میدان پرسپولیس، کوچه ۴، ساختمان شفیعی",
  },
  {
    id: "srv-0604-3",
    date: "1405-06-04",
    buildingName: "ملایی الوند",
    status: "pending",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "امام حسن قزوین",
    contractNo: "5212",
    customerName: "زهره ملایی",
    customerPhone: "09123814455",
    address: "قزوین، الوند، خ امام حسن، پلاک ۴۲",
  },
  {
    id: "srv-0604-4",
    date: "1405-06-04",
    buildingName: "اسدی الوند خ10متری",
    status: "done",
    technician: "بهمن کشاورز",
    techCount: 5,
    zone: "الوند قزوین - قزوین",
    contractNo: "5019",
    customerName: "اسدی",
    customerPhone: "09126815566",
    address: "قزوین، الوند، خیابان ۱۰ متری سوم",
  },

  // 1405-06-05
  {
    id: "srv-0605-1",
    date: "1405-06-05",
    buildingName: "مجتمع مسکونی نیلوفر",
    status: "pending",
    technician: "محسن امامی برسری",
    techCount: 6,
    zone: "نوروزیان قزوین",
    contractNo: "4820",
    customerName: "مهندس احمدی",
    customerPhone: "09128811122",
    address: "قزوین، بلوار نوروزیان، حکمت ۴۸",
  },
  {
    id: "srv-0605-2",
    date: "1405-06-05",
    buildingName: "برج آسمان",
    status: "pending",
    technician: "مجتبی فرهمند",
    techCount: 4,
    zone: "دانشگاه قزوین",
    contractNo: "4901",
    customerName: "حسینی آسمان",
    customerPhone: "09127813344",
    address: "قزوین، بلوار دانشگاه، نبش آسمان سوم",
  },
  {
    id: "srv-0605-3",
    date: "1405-06-05",
    buildingName: "ساختمان پزشکان سینا",
    status: "done",
    technician: "محسن امامی برسری",
    techCount: 6,
    zone: "فردوسی قزوین",
    contractNo: "5102",
    customerName: "دکتر رضایی",
    customerPhone: "09123817788",
    address: "قزوین، خیابان فردوسی، کوچه سینا",
  },

  // 1405-06-06
  {
    id: "srv-0606-1",
    date: "1405-06-06",
    buildingName: "ساختمان سپیدار",
    status: "pending",
    technician: "محمد حسن رحیمی زاده",
    techCount: 5,
    zone: "ملاصدرا قزوین",
    contractNo: "5300",
    customerName: "محمدی سپیدار",
    customerPhone: "09121815599",
    address: "قزوین، ملاصدرا غربی، سپیدار ۲",
  },
  {
    id: "srv-0606-2",
    date: "1405-06-06",
    buildingName: "مجتمع پاسارگاد",
    status: "pending",
    technician: "مرتضی قاسمعلی",
    techCount: 5,
    zone: "خیام قزوین",
    contractNo: "5312",
    customerName: "امینی پاسارگاد",
    customerPhone: "09124816677",
    address: "قزوین، خیابان خیام شمالی، نبش کوچه شهادت",
  },
];

let contracts: Contract[] = loadStorage<Contract[]>("tlift_contracts", initialContracts);
let customers: Customer[] = loadStorage<Customer[]>("tlift_customers", initialCustomers);
let staff: Staff[] = loadStorage<Staff[]>("tlift_staff", initialStaff);
let marketingItems: MarketingItem[] = loadStorage<MarketingItem[]>("tlift_marketing_items", INITIAL_MARKETING_ITEMS);
let scheduledServices: ScheduledService[] = loadStorage<ScheduledService[]>("tlift_scheduled_services", INITIAL_SCHEDULED_SERVICES);
let activeServiceAssignments: ActiveServiceAssignment[] = loadStorage<ActiveServiceAssignment[]>("tlift_active_service_assignments_v1", []);
let technicianPartDeliveries: TechnicianPartDelivery[] = loadStorage<TechnicianPartDelivery[]>("tlift_technician_part_deliveries_v1", []);
let contractGeoLocations: ContractGeoLocation[] = loadStorage<ContractGeoLocation[]>("tlift_contract_geo_locations_v1", []);
let companyAccessSettings: CompanyAccessSettings = loadStorage<CompanyAccessSettings>("tlift_company_access_settings_v1", { gpsRequired: true, gpsRadiusMeters: 300, leaders: [] });
let zones: ZoneItem[] = loadStorage<ZoneItem[]>("tlift_zones_v2", INITIAL_ZONES);
let checklistItems: ChecklistItem[] = loadStorage<ChecklistItem[]>("tlift_checklist_v1", INITIAL_CHECKLIST);
let checklistCategories: string[] = loadStorage<string[]>("tlift_checklist_categories_v1", INITIAL_CHECKLIST_CATEGORIES);

// Auto-seed CSV contracts if only default demo contracts are present
// داده نمونه هرگز خودکار وارد نمی‌شود؛ ورود اطلاعات فقط با اقدام صریح مدیر انجام می‌شود.
const isCsvSeeded = true;
if (!isCsvSeeded) {
  try {
    const csvRows = parseContractsCsv(RAW_CSV_DATA);
    let nextId = contracts.length > 0 ? Math.max(...contracts.map((c) => c.id)) + 1 : 1;
    let nextCustId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;

    csvRows.forEach((row) => {
      const existingIdx = contracts.findIndex((c) => c.no === row.no);
      const converted = convertRowToContract(row, existingIdx >= 0 ? contracts[existingIdx].id : nextId);
      if (existingIdx >= 0) {
        contracts[existingIdx] = { ...contracts[existingIdx], ...converted };
      } else {
        contracts.push(converted);
        nextId++;
      }

      const custName = row.customer.trim();
      if (custName && !customers.some((c) => c.name === custName)) {
        customers.push({
          id: nextCustId++,
          name: custName,
          buildings: 1,
          active: !row.isCanceled,
          sms: true,
          suspended: false,
          phone: row.phone || row.coordinatorPhone,
        });
      }
    });

    // داده‌های نمونه/CSV اولیه فقط محلی هستند. ارسال آن‌ها به سرور می‌تواند
    // اطلاعات واقعی نسخه قبلی را در اولین اجرای نسخه جدید رونویسی کند.
    writeLocalStorage("tlift_contracts", contracts);
    writeLocalStorage("tlift_customers", customers);
    writeLocalStorage("tlift_csv_seeded_v1", true);
  } catch (e) {
    console.error("Error auto-seeding CSV contracts", e);
  }
}

// Auto-seed customers if customers list is small/default
const isCustCsvSeeded = true;
if (!isCustCsvSeeded) {
  try {
    const custRows = parseCustomersCsv(RAW_CUSTOMERS_CSV_DATA);
    customers = custRows.map((r, i) => convertRowToCustomer(r, i + 1));
    writeLocalStorage("tlift_customers", customers);
    writeLocalStorage("tlift_cust_csv_seeded_v1", true);
  } catch (e) {
    console.error("Error auto-seeding CSV customers", e);
  }
}
const contractDetailsMap: Record<number, ContractDetails> = loadStorage<Record<number, ContractDetails>>(
  "tlift_contract_details",
  {
    1: {
      months: [
        {
          id: 1,
          m: "خرداد",
          y: 1405,
          done: true,
          date: "1405/03/25",
          amount: 8500000,
          paid: true,
          paidDate: "1405/03/26",
          paidMethod: "کارت به کارت",
          paidRef: "TRX-89301",
        },
        { id: 2, m: "تیر", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 3, m: "مرداد", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 4, m: "شهریور", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 5, m: "مهر", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 6, m: "آبان", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 7, m: "آذر", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 8, m: "دی", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 9, m: "بهمن", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 10, m: "اسفند", y: 1405, done: false, amount: 8500000, paid: false },
        { id: 11, m: "فروردین", y: 1406, done: false, amount: 8500000, paid: false },
        { id: 12, m: "اردیبهشت", y: 1406, done: false, amount: 8500000, paid: false },
      ],
      payments: [
        {
          id: 1,
          title: "پیش‌پرداخت اولیه قرارداد",
          date: "1405/03/01",
          amount: 8500000,
          method: "کارت به کارت",
          ref: "TRX-89301",
          monthId: 1,
        },
      ],
      invoices: [],
    },
  }
);

// Event Listeners for reactivity
const listeners = new Set<() => void>();
const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
};

// اعمال داده‌های دریافتی از سرور (Supabase) روی state محلی
registerApplier((key, data) => {
  if (data === null || data === undefined) return;
  switch (key) {
    case "tlift_contracts":
      contracts = data as Contract[];
      break;
    case "tlift_customers":
      customers = data as Customer[];
      break;
    case "tlift_staff":
      staff = data as Staff[];
      break;
    case "tlift_marketing_items":
      marketingItems = data as MarketingItem[];
      break;
    case "tlift_scheduled_services":
      scheduledServices = data as ScheduledService[];
      break;
    case "tlift_active_service_assignments_v1":
      activeServiceAssignments = data as ActiveServiceAssignment[];
      break;
    case "tlift_technician_part_deliveries_v1":
      technicianPartDeliveries = data as TechnicianPartDelivery[];
      break;
    case "tlift_contract_geo_locations_v1":
      contractGeoLocations = data as ContractGeoLocation[];
      break;
    case "tlift_company_access_settings_v1":
      companyAccessSettings = data as CompanyAccessSettings;
      break;
    case "tlift_zones_v2":
      zones = data as ZoneItem[];
      break;
    case "tlift_checklist_v1":
      checklistItems = data as ChecklistItem[];
      break;
    case "tlift_checklist_categories_v1":
      checklistCategories = data as string[];
      break;
    case "tlift_contract_details": {
      const incoming = data as Record<number, ContractDetails>;
      Object.keys(contractDetailsMap).forEach((k) => delete contractDetailsMap[Number(k)]);
      Object.assign(contractDetailsMap, incoming);
      break;
    }
    default:
      return;
  }
  // دریافت نسخه جدید نباید نسخه محلی قبلی را بدون پشتیبان از بین ببرد.
  writeLocalStorage(key, data);
  notifyListeners();
});

// Store API
export const appStore = {
  // CONTRACTS & CUSTOMERS DATABASE RESET
  clearAllCustomerContractData: () => {
    contracts = [];
    customers = [];
    scheduledServices = [];
    activeServiceAssignments = [];
    contractGeoLocations = [];
    Object.keys(contractDetailsMap).forEach((key) => delete contractDetailsMap[Number(key)]);
    saveStorage("tlift_contracts", contracts);
    saveStorage("tlift_customers", customers);
    saveStorage("tlift_contract_details", contractDetailsMap);
    saveStorage("tlift_scheduled_services", scheduledServices);
    saveStorage("tlift_active_service_assignments_v1", activeServiceAssignments);
    saveStorage("tlift_contract_geo_locations_v1", contractGeoLocations);
    notifyListeners();
  },

  // CONTRACTS
  getContracts: () => {
    // هنگام بارگذاری فهرست، تاریخ تمام قراردادهای موجود نیز یک‌جا با برنامه رسمی تطبیق داده می‌شود.
    contracts.forEach((contract) => appStore.getContractDetails(contract.id));
    return contracts;
  },
  getOrCreateContractForCustomer: (customerName: string, debtorAmount?: number): Contract => {
    const cleanName = customerName.replace(/^\*\s*/, "").trim();
    // Try to find existing
    const existing = contracts.find(
      (c) =>
        c.building.includes(cleanName) ||
        c.manager.includes(cleanName) ||
        cleanName.includes(c.building.replace(/^\*\s*/, "").trim())
    );
    if (existing) return existing;

    // Create new contract for this customer
    const nextId = contracts.length > 0 ? Math.max(...contracts.map((c) => c.id)) + 1 : 1;
    const contractNo = (5100 + nextId).toString();
    const newContract: Contract = {
      id: nextId,
      no: contractNo,
      building: `* ${cleanName}`,
      manager: `${cleanName.split(" ")[0]} (مدیر ساختمان)`,
      zone: cleanName.includes("کوچه") ? "مرکز شهر" : "شهرک قدس",
      start: "1 خرداد 1405",
      end: "31 اردیبهشت 1406",
      kind: "general",
    };

    contracts = [newContract, ...contracts];
    saveStorage("tlift_contracts", contracts);

    // Initialize custom months and invoices/payments to reflect debt if provided
    const monthlyRate = 7500000;
    const months = generateInitialMonths(1405, monthlyRate);
    
    // If debtor amount specified, generate realistic invoices and past services
    const invoices: Invoice[] = [];
    const payments: PaymentRecord[] = [];

    if (debtorAmount && debtorAmount > 0) {
      invoices.push({
        id: Date.now() - 100000,
        title: "فاکتور تعمیرات و قطعات دوره قبل",
        date: "1405/02/15",
        amount: Math.round(debtorAmount * 0.4),
        parts: Math.round(debtorAmount * 0.3),
        wage: Math.round(debtorAmount * 0.1),
      });
    }

    contractDetailsMap[nextId] = {
      months,
      payments,
      invoices,
    };
    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();

    return newContract;
  },
  addContract: (newC: Omit<Contract, "id">) => {
    const nextId = contracts.length > 0 ? Math.max(...contracts.map((c) => c.id)) + 1 : 1;
    const contract: Contract = { ...newC, id: nextId };
    contracts = [contract, ...contracts];
    saveStorage("tlift_contracts", contracts);

    // Also initialize months for this contract
    if (!contractDetailsMap[nextId]) {
      contractDetailsMap[nextId] = {
        months: generateInitialMonths(1405, 8500000),
        payments: [],
        invoices: [],
      };
      saveStorage("tlift_contract_details", contractDetailsMap);
    }

    notifyListeners();
    return contract;
  },
  updateContract: (updated: Contract) => {
    contracts = contracts.map((c) => (c.id === updated.id ? updated : c));
    saveStorage("tlift_contracts", contracts);
    notifyListeners();
  },
  deleteContract: (id: number) => {
    contracts = contracts.filter((c) => c.id !== id);
    saveStorage("tlift_contracts", contracts);
    delete contractDetailsMap[id];
    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  importBuildingsFromCsv: (rows: BuildingCsvRow[]) => {
    const monthNames = ["مهر", "آبان", "آذر", "دی", "بهمن", "اسفند", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"];
    const makeRawDetails = (amount: number, contractNo: string): ContractDetails => ({
      months: monthNames.map((m, i) => {
        const monthNumber = ((i + 6) % 12) + 1;
        const year = i < 6 ? 1405 : 1406;
        const day = getContractServiceDay(contractNo);
        return { id: i + 1, m, y: year, plannedDate: `${year}/${String(monthNumber).padStart(2, "0")}/${String(day).padStart(2, "0")}`, done: false, amount, paid: false, faultsCount: 0, faultsList: [], partsAmount: 0, partsList: [], wage: 0, trip: 0, discount: 0 };
      }),
      payments: [], invoices: [], breakdowns: [],
    });
    let updated = 0;
    const fees = new Map(rows.map((row) => [row.contractNo.replace(/^0+/, ""), row]));

    // با هر بار ورود این فایل، تمام سابقه مالی و سرویس همه قراردادها خام می‌شود.
    contracts = contracts.map((contract) => {
      const row = fees.get(contract.no.replace(/^0+/, ""));
      const amount = row?.serviceFee || 0;
      contractDetailsMap[contract.id] = makeRawDetails(amount, contract.no);
      if (!row) return { ...contract, monthlyServiceFee: 0 };
      updated++;
      return { ...contract, customer: row.customerName || contract.customer, building: row.buildingName || contract.building, buildingName: row.buildingName || contract.buildingName, start: row.startDate || contract.start, end: row.endDate || contract.end, monthlyServiceFee: amount };
    });
    activeServiceAssignments = [];
    saveStorage("tlift_contracts", contracts);
    saveStorage("tlift_contract_details", contractDetailsMap);
    saveStorage("tlift_active_service_assignments_v1", activeServiceAssignments);
    notifyListeners();
    return { totalRows: rows.length, updated };
  },

  importContractsFromCsv: (csvText: string, mode: "merge" | "replace" = "replace") => {
    const rows = parseContractsCsv(csvText);
    if (!rows.length) return { totalRows: 0, contractsAdded: 0, contractsUpdated: 0, customersAdded: 0 };

    if (mode === "replace") {
      contracts = [];
      customers = [];
    }

    let nextId = contracts.length > 0 ? Math.max(...contracts.map((c) => c.id)) + 1 : 1;
    let nextCustId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;

    let contractsAdded = 0;
    let contractsUpdated = 0;
    let customersAdded = 0;

    rows.forEach((row, idx) => {
      // In replace mode, always push new contract with unique ID
      const existingIdx = mode === "merge" && row.no ? contracts.findIndex((c) => c.no === row.no) : -1;
      const contractId = existingIdx >= 0 ? contracts[existingIdx].id : nextId++;
      const converted = convertRowToContract(row, contractId);

      if (existingIdx >= 0) {
        contracts[existingIdx] = { ...contracts[existingIdx], ...converted };
        contractsUpdated++;
      } else {
        contracts.push(converted);
        contractsAdded++;
      }

      const custName = (row.customer || `مشتری ${idx + 1}`).trim();
      if (custName && !customers.some((c) => c.name === custName)) {
        customers.push({
          id: nextCustId++,
          name: custName,
          buildings: 1,
          active: !row.isCanceled,
          sms: true,
          suspended: false,
          phone: row.phone || row.coordinatorPhone,
        });
        customersAdded++;
      }
    });

    saveStorage("tlift_contracts", contracts);
    saveStorage("tlift_customers", customers);
    notifyListeners();

    return { totalRows: rows.length, contractsAdded, contractsUpdated, customersAdded };
  },

  // CONTRACT DETAILS (Months, Services, Payments, Invoices)
  getContractDetails: (contractId: number): ContractDetails => {
    if (!contractDetailsMap[contractId]) {
      const contract = contracts.find((c) => c.id === contractId);
      contractDetailsMap[contractId] = {
        months: generateInitialMonths(1405, contract?.monthlyServiceFee || 0).map((month) => ({
          ...month,
          done: false,
          paid: false,
        })),
        payments: [],
        invoices: [],
        breakdowns: [],
      };
      saveStorage("tlift_contract_details", contractDetailsMap);
    }
    const contract = contracts.find((item) => item.id === contractId);
    if (contract) {
      const serviceDay = getContractServiceDay(contract.no);
      const officialFee = getContractOfficialFee(contract.no) ?? contract.monthlyServiceFee;
      const monthNumbers: Record<string, number> = { فروردین: 1, اردیبهشت: 2, خرداد: 3, تیر: 4, مرداد: 5, شهریور: 6, مهر: 7, آبان: 8, آذر: 9, دی: 10, بهمن: 11, اسفند: 12 };
      let changed = false;
      contractDetailsMap[contractId].months = contractDetailsMap[contractId].months.map((month) => {
        const monthNumber = monthNumbers[month.m];
        if (!monthNumber) return month;
        const plannedDate = `${month.y}/${String(monthNumber).padStart(2, "0")}/${String(serviceDay).padStart(2, "0")}`;
        const targetAmount = typeof officialFee === "number" ? officialFee : month.amount;
        if (month.plannedDate === plannedDate && month.amount === targetAmount) return month;
        changed = true;
        return { ...month, plannedDate, amount: targetAmount };
      });
      if (changed) saveStorage("tlift_contract_details", contractDetailsMap);
    }
    return contractDetailsMap[contractId];
  },

  updateMonthService: (
    contractId: number,
    monthId: number,
    patch: Partial<MonthService>
  ) => {
    const details = appStore.getContractDetails(contractId);
    const updatedMonths = details.months.map((m) => (m.id === monthId ? { ...m, ...patch } : m));
    contractDetailsMap[contractId] = { ...details, months: updatedMonths };
    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  addServiceSubmission: (
    contractId: number,
    monthId: number,
    serviceData: {
      techs: string[];
      doneBy?: string;
      doneDate: string;
      inTime?: string;
      outTime?: string;
      report?: string;
      reminder?: string;
      total: number;
      parts: number;
      wage: number;
      trip: number;
      discount: number;
      faults: number;
      faultsList?: string[];
      partsList?: ServicePartItem[];
    }
  ) => {
    const details = appStore.getContractDetails(contractId);
    const targetMonth = details.months.find((m) => m.id === monthId);

    const updatedMonths = details.months.map((m) =>
      m.id === monthId
        ? {
            ...m,
            done: true,
            date: serviceData.doneDate,
            inTime: serviceData.inTime,
            outTime: serviceData.outTime,
            amount: serviceData.total || m.amount,
            techs: serviceData.techs,
            doneBy: serviceData.doneBy,
            report: serviceData.report,
            reminder: serviceData.reminder,
            faultsCount: serviceData.faults,
            faultsList: serviceData.faultsList,
            partsAmount: serviceData.parts,
            partsList: serviceData.partsList,
            wage: serviceData.wage,
            trip: serviceData.trip,
            discount: serviceData.discount,
          }
        : m
    );

    const newInvoice: Invoice = {
      id: Date.now(),
      title: `سرویس ${targetMonth ? `${targetMonth.m} ${targetMonth.y}` : "دوره"}`,
      date: serviceData.doneDate,
      amount: serviceData.total,
      parts: serviceData.parts,
      wage: serviceData.wage,
    };

    contractDetailsMap[contractId] = {
      ...details,
      months: updatedMonths,
      invoices: [...details.invoices, newInvoice],
    };

    saveStorage("tlift_contract_details", contractDetailsMap);

    // ثبت در لیست کارهای ثبت‌شده آفلاین در صورت عدم اتصال
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const syncState = getSyncState();
    if (isOffline || syncState.isManualOffline || syncState.status === "offline") {
      const contractObj = contracts.find((c) => c.id === contractId);
      recordOfflineService({
        id: `offline_srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        contractId,
        monthId,
        buildingName: contractObj ? contractObj.building : `قرارداد #${contractId}`,
        customerName: contractObj ? contractObj.manager : undefined,
        doneDate: serviceData.doneDate,
        amount: serviceData.total,
        recordedAt: Date.now(),
      });
    }

    notifyListeners();

    // همگام‌سازی خودکار بلافاصله پس از ثبت سرویس
    setTimeout(() => {
      syncNow().catch(() => {});
    }, 150);
  },

  addPayment: (
    contractId: number,
    payment: Omit<PaymentRecord, "id">,
    markMonthId?: number
  ) => {
    const details = appStore.getContractDetails(contractId);
    const newRecord: PaymentRecord = { ...payment, id: Date.now() };

    let updatedMonths = details.months;
    if (markMonthId) {
      updatedMonths = details.months.map((m) =>
        m.id === markMonthId
          ? {
              ...m,
              paid: true,
              paidDate: payment.date,
              paidMethod: payment.method,
              paidRef: payment.ref,
            }
          : m
      );
    }

    contractDetailsMap[contractId] = {
      ...details,
      months: updatedMonths,
      payments: [...details.payments, newRecord],
    };

    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();

    // همگام‌سازی خودکار پس از ثبت پرداخت
    setTimeout(() => {
      syncNow().catch(() => {});
    }, 150);
  },

  cancelMonthPayment: (contractId: number, monthId: number) => {
    const details = appStore.getContractDetails(contractId);
    const updatedMonths = details.months.map((m) =>
      m.id === monthId
        ? {
            ...m,
            paid: false,
            paidDate: undefined,
            paidMethod: undefined,
            paidRef: undefined,
          }
        : m
    );

    const updatedPayments = details.payments.filter((p) => p.monthId !== monthId);

    contractDetailsMap[contractId] = {
      ...details,
      months: updatedMonths,
      payments: updatedPayments,
    };

    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  updatePayment: (
    contractId: number,
    paymentId: number,
    patch: Partial<PaymentRecord>
  ) => {
    const details = appStore.getContractDetails(contractId);
    const updatedPayments = details.payments.map((p) =>
      p.id === paymentId ? { ...p, ...patch } : p
    );
    contractDetailsMap[contractId] = {
      ...details,
      payments: updatedPayments,
    };
    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  deletePayment: (contractId: number, paymentId: number) => {
    const details = appStore.getContractDetails(contractId);
    const target = details.payments.find((p) => p.id === paymentId);
    let updatedMonths = details.months;
    if (target && target.monthId) {
      updatedMonths = details.months.map((m) =>
        m.id === target.monthId
          ? { ...m, paid: false, paidDate: undefined, paidMethod: undefined, paidRef: undefined }
          : m
      );
    }
    const updatedPayments = details.payments.filter((p) => p.id !== paymentId);
    contractDetailsMap[contractId] = {
      ...details,
      months: updatedMonths,
      payments: updatedPayments,
    };
    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  addMonthServiceSlot: (contractId: number) => {
    const details = appStore.getContractDetails(contractId);
    const nextId = details.months.length + 1;
    const lastMonth = details.months[details.months.length - 1];
    const newMonth: MonthService = {
      id: nextId,
      m: "سرویس دوره‌ای",
      y: lastMonth ? lastMonth.y : 1405,
      done: false,
      amount: lastMonth ? lastMonth.amount : 8500000,
      paid: false,
    };

    contractDetailsMap[contractId] = {
      ...details,
      months: [...details.months, newMonth],
    };

    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  // CONTRACT BREAKDOWNS (ثبت و مدیریت خرابی‌ها)
  getContractBreakdowns: (contractId: number): BreakdownItem[] => {
    const details = appStore.getContractDetails(contractId);
    return details.breakdowns || [];
  },

  addContractBreakdown: (
    contractId: number,
    breakdown: Omit<BreakdownItem, "id" | "rowNo" | "createdAt">
  ): BreakdownItem => {
    const details = appStore.getContractDetails(contractId);
    const existing = details.breakdowns || [];
    const newBreakdown: BreakdownItem = {
      ...breakdown,
      id: `brk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      rowNo: existing.length + 1,
      createdAt: Date.now(),
    };

    contractDetailsMap[contractId] = {
      ...details,
      breakdowns: [newBreakdown, ...existing],
    };

    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
    return newBreakdown;
  },

  updateContractBreakdown: (
    contractId: number,
    breakdownId: string,
    updates: Partial<BreakdownItem>
  ) => {
    const details = appStore.getContractDetails(contractId);
    if (!details.breakdowns) return;

    contractDetailsMap[contractId] = {
      ...details,
      breakdowns: details.breakdowns.map((b) => (b.id === breakdownId ? { ...b, ...updates } : b)),
    };

    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  deleteContractBreakdown: (contractId: number, breakdownId: string) => {
    const details = appStore.getContractDetails(contractId);
    if (!details.breakdowns) return;

    const remaining = details.breakdowns.filter((b) => b.id !== breakdownId);
    const reindexed = remaining.map((b, idx) => ({ ...b, rowNo: remaining.length - idx }));

    contractDetailsMap[contractId] = {
      ...details,
      breakdowns: reindexed,
    };

    saveStorage("tlift_contract_details", contractDetailsMap);
    notifyListeners();
  },

  // CUSTOMERS
  getCustomers: () => customers,
  addCustomer: (newCust: Omit<Customer, "id">) => {
    const nextId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
    const cust: Customer = { ...newCust, id: nextId };
    customers = [cust, ...customers];
    saveStorage("tlift_customers", customers);
    notifyListeners();
    return cust;
  },
  updateCustomer: (updated: Customer) => {
    customers = customers.map((c) => (c.id === updated.id ? updated : c));
    saveStorage("tlift_customers", customers);
    notifyListeners();
  },
  toggleCustomerActive: (id: number) => {
    customers = customers.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
    saveStorage("tlift_customers", customers);
    notifyListeners();
  },
  importCustomersFromCsv: (csvText: string, mode: "merge" | "replace" = "replace") => {
    const rows = parseCustomersCsv(csvText);
    if (!rows.length) return { totalRows: 0, customersAdded: 0, customersUpdated: 0 };

    if (mode === "replace") {
      customers = [];
    }

    let nextCustId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
    let customersAdded = 0;
    let customersUpdated = 0;

    rows.forEach((row) => {
      const existingIdx = mode === "merge" ? customers.findIndex((c) => c.name.trim() === row.name.trim()) : -1;
      const custId = existingIdx >= 0 ? customers[existingIdx].id : nextCustId++;
      const converted = convertRowToCustomer(row, custId);

      if (existingIdx >= 0) {
        customers[existingIdx] = { ...customers[existingIdx], ...converted };
        customersUpdated++;
      } else {
        customers.push(converted);
        customersAdded++;
      }
    });

    saveStorage("tlift_customers", customers);
    notifyListeners();

    return { totalRows: rows.length, customersAdded, customersUpdated };
  },

  // STAFF
  getStaff: () => staff,
  addStaff: (newStaff: Omit<Staff, "id">) => {
    const nextId = staff.length > 0 ? Math.max(...staff.map((s) => s.id)) + 1 : 1;
    const item: Staff = { ...newStaff, id: nextId };
    staff = [...staff, item];
    saveStorage("tlift_staff", staff);
    notifyListeners();
    return item;
  },
  updateStaff: (updated: Staff) => {
    staff = staff.map((s) => (s.id === updated.id ? updated : s));
    saveStorage("tlift_staff", staff);
    notifyListeners();
  },
  toggleStaffActive: (id: number) => {
    staff = staff.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    saveStorage("tlift_staff", staff);
    notifyListeners();
  },

  // MARKETING ITEMS
  getMarketingItems: () => marketingItems,
  isItemInMarketing: (name: string, section?: string) => {
    return marketingItems.some(
      (it) => it.name === name && (!section || it.section === section)
    );
  },
  toggleMarketingItem: (item: { name: string; section: string; groupTitle?: string }) => {
    const existingIndex = marketingItems.findIndex(
      (it) => it.name === item.name && it.section === item.section
    );
    let added = false;
    if (existingIndex >= 0) {
      marketingItems = marketingItems.filter((_, idx) => idx !== existingIndex);
      added = false;
    } else {
      const newItem: MarketingItem = {
        id: `${item.section}:${item.name}`,
        name: item.name,
        section: item.section,
        groupTitle: item.groupTitle,
        pinnedAt: Date.now(),
      };
      marketingItems = [...marketingItems, newItem];
      added = true;
    }
    saveStorage("tlift_marketing_items", marketingItems);
    notifyListeners();
    return added;
  },
  removeMarketingItem: (idOrName: string, section?: string) => {
    marketingItems = marketingItems.filter(
      (it) => !(it.id === idOrName || (it.name === idOrName && (!section || it.section === section)))
    );
    saveStorage("tlift_marketing_items", marketingItems);
    notifyListeners();
  },
  clearMarketingItems: () => {
    marketingItems = [];
    saveStorage("tlift_marketing_items", marketingItems);
    notifyListeners();
  },
  // COMPANY ACCESS & GPS POLICY
  getCompanyAccessSettings: () => companyAccessSettings,
  updateCompanyAccessSettings: (settings: CompanyAccessSettings) => {
    companyAccessSettings = settings;
    saveStorage("tlift_company_access_settings_v1", companyAccessSettings);
    notifyListeners();
  },

  // CONTRACT GPS LOCATIONS
  getContractGeoLocation: (contractId: number) => contractGeoLocations.find((item) => item.contractId === contractId),
  getAllContractGeoLocations: () => contractGeoLocations,
  setContractGeoLocation: (location: ContractGeoLocation) => {
    contractGeoLocations = [location, ...contractGeoLocations.filter((item) => item.contractId !== location.contractId)];
    saveStorage("tlift_contract_geo_locations_v1", contractGeoLocations);
    notifyListeners();
  },

  // TECHNICIAN PART DELIVERIES
  getTechnicianPartDeliveries: () => technicianPartDeliveries,
  addTechnicianPartDelivery: (delivery: Omit<TechnicianPartDelivery, "id">) => {
    const item = { ...delivery, id: `delivery-${Date.now()}` };
    technicianPartDeliveries = [item, ...technicianPartDeliveries];
    saveStorage("tlift_technician_part_deliveries_v1", technicianPartDeliveries);
    notifyListeners();
    return item;
  },
  removeTechnicianPartDelivery: (id: string) => {
    technicianPartDeliveries = technicianPartDeliveries.filter((item) => item.id !== id);
    saveStorage("tlift_technician_part_deliveries_v1", technicianPartDeliveries);
    notifyListeners();
  },

  // ACTIVE SERVICE LOCKS
  getActiveServiceAssignments: () => activeServiceAssignments,
  startActiveService: (assignment: ActiveServiceAssignment) => {
    // هر تکنسین فقط یک کار فعال و هر سرویس فقط یک مجری فعال دارد.
    activeServiceAssignments = activeServiceAssignments.filter(
      (item) =>
        item.technicianName !== assignment.technicianName &&
        !(item.contractId === assignment.contractId && item.monthId === assignment.monthId)
    );
    activeServiceAssignments = [...activeServiceAssignments, assignment];
    saveStorage("tlift_active_service_assignments_v1", activeServiceAssignments);
    notifyListeners();
  },
  finishActiveService: (contractId: number, monthId: number, technicianName?: string) => {
    activeServiceAssignments = activeServiceAssignments.filter(
      (item) =>
        !(item.contractId === contractId && item.monthId === monthId) &&
        !(technicianName && item.technicianName === technicianName)
    );
    saveStorage("tlift_active_service_assignments_v1", activeServiceAssignments);
    notifyListeners();
  },

  // SCHEDULED SERVICES
  getScheduledServices: () => scheduledServices,
  toggleScheduledServiceStatus: (id: string) => {
    scheduledServices = scheduledServices.map((s) =>
      s.id === id
        ? {
            ...s,
            status: s.status === "done" ? "pending" : "done",
            lastUpdated: Date.now(),
          }
        : s
    );
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },
  updateScheduledService: (id: string, patch: Partial<ScheduledService>) => {
    scheduledServices = scheduledServices.map((s) =>
      s.id === id ? { ...s, ...patch, lastUpdated: Date.now() } : s
    );
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },
  updateScheduledServiceDate: (id: string, newDate: string) => {
    scheduledServices = scheduledServices.map((s) =>
      s.id === id ? { ...s, date: newDate, lastUpdated: Date.now() } : s
    );
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },
  updateScheduledServiceTechnician: (id: string, newTech: string) => {
    scheduledServices = scheduledServices.map((s) =>
      s.id === id ? { ...s, technician: newTech, lastUpdated: Date.now() } : s
    );
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },
  addScheduledServiceReport: (id: string, report: string) => {
    scheduledServices = scheduledServices.map((s) =>
      s.id === id
        ? {
            ...s,
            report,
            status: "done", // Adding a report automatically marks as done
            lastUpdated: Date.now(),
          }
        : s
    );
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },
  addScheduledServicePartRequest: (
    id: string,
    part: { name: string; qty: number; reason: string }
  ) => {
    scheduledServices = scheduledServices.map((s) => {
      if (s.id !== id) return s;
      const partsRequested = s.partsRequested || [];
      const newPart = {
        id: `part-req-${Date.now()}`,
        name: part.name,
        qty: part.qty,
        reason: part.reason,
        date: new Date().toLocaleDateString("fa-IR"),
      };
      return {
        ...s,
        partsRequested: [...partsRequested, newPart],
        lastUpdated: Date.now(),
      };
    });
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },
  addScheduledService: (service: Omit<ScheduledService, "id">) => {
    const newService: ScheduledService = {
      ...service,
      id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lastUpdated: Date.now(),
    };
    scheduledServices = [newService, ...scheduledServices];
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
    return newService;
  },
  deleteScheduledService: (id: string) => {
    scheduledServices = scheduledServices.filter((s) => s.id !== id);
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },
  resetScheduledServicesToDefault: () => {
    scheduledServices = INITIAL_SCHEDULED_SERVICES;
    saveStorage("tlift_scheduled_services", scheduledServices);
    notifyListeners();
  },

  // Zone Management
  getZones: () => zones,
  addZone: (data: { name: string; city?: string; province?: string }) => {
    const nextId = zones.length > 0 ? Math.max(...zones.map((z) => z.id)) + 1 : 1;
    const newZone: ZoneItem = {
      id: nextId,
      name: data.name.trim(),
      city: data.city?.trim() || "قزوین",
      province: data.province?.trim() || "قزوین",
    };
    zones = [...zones, newZone];
    saveStorage("tlift_zones_v2", zones);
    notifyListeners();
    return newZone;
  },
  updateZone: (id: number, data: { name: string; city?: string; province?: string }) => {
    zones = zones.map((z) =>
      z.id === id
        ? {
            ...z,
            name: data.name.trim(),
            city: data.city?.trim() || z.city,
            province: data.province?.trim() || z.province,
          }
        : z
    );
    saveStorage("tlift_zones_v2", zones);
    notifyListeners();
  },
  deleteZone: (id: number) => {
    zones = zones.filter((z) => z.id !== id);
    saveStorage("tlift_zones_v2", zones);
    notifyListeners();
  },
  resetZonesToDefault: () => {
    zones = INITIAL_ZONES;
    saveStorage("tlift_zones_v2", zones);
    notifyListeners();
  },

  // Checklist Management
  getChecklist: () => checklistItems,
  getChecklistCategories: () => checklistCategories,
  addChecklistCategory: (category: string) => {
    const trimmed = category.trim();
    if (!trimmed || checklistCategories.includes(trimmed)) return;
    checklistCategories = [...checklistCategories, trimmed];
    saveStorage("tlift_checklist_categories_v1", checklistCategories);
    notifyListeners();
  },
  addChecklistItem: (data: Omit<ChecklistItem, "id" | "rowNo">) => {
    const nextId = checklistItems.length > 0 ? Math.max(...checklistItems.map((c) => c.id)) + 1 : 1;
    const nextRowNo = checklistItems.length + 1;
    const newItem: ChecklistItem = {
      id: nextId,
      rowNo: nextRowNo,
      deviceType: data.deviceType.trim() || "آسانسور",
      category: data.category.trim() || "طبقات",
      question: data.question.trim(),
      period: data.period.trim() || "ماهیانه",
    };
    checklistItems = [...checklistItems, newItem];
    if (newItem.category && !checklistCategories.includes(newItem.category)) {
      checklistCategories = [...checklistCategories, newItem.category];
      saveStorage("tlift_checklist_categories_v1", checklistCategories);
    }
    saveStorage("tlift_checklist_v1", checklistItems);
    notifyListeners();
    return newItem;
  },
  updateChecklistItem: (id: number, data: Partial<ChecklistItem>) => {
    checklistItems = checklistItems.map((item) =>
      item.id === id
        ? {
            ...item,
            deviceType: data.deviceType !== undefined ? data.deviceType.trim() : item.deviceType,
            category: data.category !== undefined ? data.category.trim() : item.category,
            question: data.question !== undefined ? data.question.trim() : item.question,
            period: data.period !== undefined ? data.period.trim() : item.period,
          }
        : item
    );
    if (data.category && !checklistCategories.includes(data.category.trim())) {
      checklistCategories = [...checklistCategories, data.category.trim()];
      saveStorage("tlift_checklist_categories_v1", checklistCategories);
    }
    saveStorage("tlift_checklist_v1", checklistItems);
    notifyListeners();
  },
  deleteChecklistItem: (id: number) => {
    checklistItems = checklistItems.filter((item) => item.id !== id);
    // Recalculate rowNo
    checklistItems = checklistItems.map((item, idx) => ({ ...item, rowNo: idx + 1 }));
    saveStorage("tlift_checklist_v1", checklistItems);
    notifyListeners();
  },
  resetChecklistToDefault: () => {
    checklistItems = INITIAL_CHECKLIST;
    checklistCategories = INITIAL_CHECKLIST_CATEGORIES;
    saveStorage("tlift_checklist_v1", checklistItems);
    saveStorage("tlift_checklist_categories_v1", checklistCategories);
    notifyListeners();
  },
};

// React Hooks
export function useContracts() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => contracts
  );
}

export function useCompanyAccessSettings() {
  return useSyncExternalStore(
    (callback) => { listeners.add(callback); return () => listeners.delete(callback); },
    () => companyAccessSettings
  );
}

export function useTechnicianPartDeliveries() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => technicianPartDeliveries
  );
}

export function useActiveServiceAssignments() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => activeServiceAssignments
  );
}

export function useContractDetails(contractId: number) {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => appStore.getContractDetails(contractId)
  );
}

export function useCustomers() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => customers
  );
}

export function useStaff() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => staff
  );
}

export function useMarketingItems() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => marketingItems
  );
}

export function useScheduledServices() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => scheduledServices
  );
}

export function useZones() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => zones
  );
}

export function useChecklist() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => checklistItems
  );
}

export function useChecklistCategories() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => checklistCategories
  );
}

export function useContractGeoLocations() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => contractGeoLocations
  );
}


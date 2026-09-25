import {
  Users,
  TrendingUp,
  Boxes,
  CalendarCheck,
  PenSquare,
  FolderKanban,
  Network,
  Archive,
  DollarSign,
  Truck,
  ImageIcon,
  Sliders,
  UserCog,
  LucideIcon,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
  badge?: boolean;
};

export const navItems: NavItem[] = [
  { id: "marketing", label: "دسترسی سریع", icon: Sparkles },
  { id: "sales", label: "سرویس‌کار", icon: TrendingUp },
  { id: "install", label: "نصب و راه اندازی", icon: Boxes },
  { id: "service", label: "سرویس و نگهداری", icon: CalendarCheck },
  { id: "servicenegar", label: "سرویس نگار", icon: PenSquare, badge: true },
  { id: "cartable", label: "کارتابل", icon: FolderKanban },
  { id: "file", label: "پرونده", icon: Network },
  { id: "store", label: "انبار", icon: Archive },
  { id: "buy", label: "خرید", icon: DollarSign, locked: true },
  { id: "suppliers", label: "تامین کنندگان", icon: Truck, locked: true },
  { id: "visit", label: "بازدید", icon: ImageIcon, locked: true },
  { id: "settings", label: "تنظیمات اولیه", icon: Sliders },
  { id: "user", label: "تغییر کاربر", icon: UserCog },
];

export type MenuGroup = { title: string; items: string[] };

export const salesMenu: MenuGroup[] = [
  {
    title: "مدیریت سرویس‌کار",
    items: ["داشبورد سرویس‌کاران", "سرویس‌های انجام‌شده", "ساعات کارکرد", "وضعیت کارهای جاری"],
  },
  {
    title: "قطعات و تجهیزات",
    items: ["قطعات تحویل‌شده", "قطعات مصرف‌شده", "گزارش عملکرد ماهانه"],
  },
];

export const cartableMenu: MenuGroup[] = [
  {
    title: "وظایف و پیگیری‌ها",
    items: ["یادداشت‌های روزانه", "وظایف محوله", "درخواست‌های مرخصی", "پیام‌های دریافتی"],
  },
];

export const serviceMenu: MenuGroup[] = [
  {
    title: "گزارشات",
    items: [
      "داشبورد",
      "قرارداد ها",
      "ساختمان ها",
      "خرابی ها",
      "سرویس ها",
      "یادآورها",
      "بیمه ها",
      "پرداختی ها",
      "مدیریت زمانبندی سرویس ها و خرابی ها",
    ],
  },
  {
    title: "چاپ ها",
    items: [
      "قراردادها",
      "بیمه",
      "پرداختی ها",
      "اقساط",
      "سرویس ها",
      "خرابی ها",
      "قطعات مصرفی",
    ],
  },
  {
    title: "ثبت جدید",
    items: [
      "ثبت قرارداد سرویس نگهداری جدید",
      "ثبت قرارداد جنرال جدید",
      "ثبت قرارداد متفرقه جدید",
      "ثبت خرابی جدید",
      "ثبت سرویس جدید",
    ],
  },
];

export const fileMenu: MenuGroup[] = [
  { title: "مشتریان", items: ["لیست مشتریان", "آپلود فایل CSV مشتریان", "چاپ گزارش مشتریان", "چاپ گزارش مشتریان بدهکار"] },
  { title: "دستگاه‌ها", items: ["لیست دستگاه‌ها"] },
  { title: "ساختمان‌ها", items: ["لیست ساختمان‌ها", "چاپ گزارش تراز ساختمان‌ها"] },
  { title: "پیام ها", items: ["لیست پیام ها"] },
  { title: "حضور و غیاب", items: ["لیست حضور و غیاب"] },
];

export const settingsMenu: MenuGroup[] = [
  {
    title: "تنظیمات پایه",
    items: [
      "مدیریت مدیران و دسترسی‌ها",
      "مدیریت هاست و خروجی cPanel",
      "داشبورد ساز",
      "شارژ پیامک",
      "قالب پیام",
      "مشخصات دستگاه",
      "مدیریت فیلدها",
      "روزهای تعطیل",
      "پیامک های ارسال شده",
      "منطقه",
      "تنظیمات چاپ فاکتور/ پیش فاکتور",
    ],
  },
  { title: "اعضای شرکت", items: ["سرویسکار و مسئول انجام", "کارشناسان نصب راه اندازی", "تنظمیات نظرسنجی سرویسکار"] },
  { title: "مالی", items: ["ضمانت ها", "بانک ها", "واحدها", "قطعات", "خدمات"] },
  { title: "بازاریابی و فروش", items: ["نحوه آشنایی", "نوع فعالیت"] },
  { title: "فرم بازدید", items: ["دلایل شکست سرنخ", "قالب مفاد پیش فاکتور / فاکتور"] },
  { title: "نصب و راه اندازی", items: ["عملیات و مراحل نصب و راه اندازی"] },
  { title: "سرویس و نگهداری", items: ["قالب قرارداد", "دلایل فسخ قرارداد", "چک لیست", "دسته بندی چک لیست", "دلایل خرابی", "آپلود فایلهای CSV قراردادها", "آپلود فایلهای CSV مشتریان"] },
];

export type Staff = {
  id: number;
  username: string;
  first: string;
  last: string;
  activity: string;
  birth: string;
  phone: string;
  color: string;
  active: boolean;
  service: boolean;
  install: boolean;
  avatar: string;
};

export const initialStaff: Staff[] = [
  { first: "مجتبی", last: "فرهمند", phone: "09109532035", color: "#f8a3a3", birth: "" },
  { first: "میثم", last: "سهرابی", phone: "09126817884", color: "", birth: "" },
  { first: "بهمن", last: "کشاورز", phone: "09128827734", color: "#1f9d3a", birth: "" },
  { first: "محمد حسن", last: "رحیمی زاده", phone: "09193893589", color: "#8a6a10", birth: "" },
  { first: "مرتضی", last: "قاسمعلی", phone: "09196605863", color: "#4bb3d4", birth: "" },
  { first: "محسن", last: "امامی برسری", phone: "09192868509", color: "#e0cdbd", birth: "۱۶ اردیبهشت ۱۳۶۳" },
].map((x, i) => ({
  id: i + 1,
  username: x.phone,
  first: x.first,
  last: x.last,
  activity: "",
  birth: x.birth,
  phone: x.phone,
  color: x.color,
  active: true,
  service: true,
  install: false,
  avatar: `https://i.pravatar.cc/120?img=${i + 11}`,
}));

export type Customer = {
  id: number;
  name: string;
  isLegal?: boolean;
  phone?: string;
  buildings: number;
  leads?: number;
  installContracts?: number;
  serviceContracts?: number;
  active: boolean;
  sms: boolean;
  suspended?: boolean;
};

export type Part = {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  price: number;
};

export const initialParts: Part[] = [
  { id: 1, code: "PRT-101", name: "لنت ترمز الکو", category: "مکانیکال", unit: "جفت", stock: 14, price: 850000 },
  { id: 2, code: "PRT-102", name: "سیم بکسل نمره 10 گوستاولف", category: "کشش", unit: "متر", stock: 120, price: 420000 },
  { id: 3, code: "PRT-103", name: "روغن هیدرولیک بهران 68", category: "روانکاری", unit: "لیتر", stock: 45, price: 180000 },
  { id: 4, code: "PRT-104", name: "میکروسوئیچ اشنایدر", category: "الکتریکال", unit: "عدد", stock: 30, price: 290000 },
  { id: 5, code: "PRT-105", name: "کفشک راهنما کابین T9", category: "مکانیکال", unit: "عدد", stock: 24, price: 340000 },
  { id: 6, code: "PRT-106", name: "دیکتاتور آسانسور اونو", category: "درب", unit: "عدد", stock: 18, price: 650000 },
  { id: 7, code: "PRT-107", name: "شالتر پروانه‌ای", category: "الکتریکال", unit: "عدد", stock: 12, price: 410000 },
  { id: 8, code: "PRT-108", name: "تراول کابل 24 رشته دت وایلر", category: "الکتریکال", unit: "متر", stock: 85, price: 950000 },
];

// نرم‌افزار به‌صورت خام شروع می‌شود؛ اطلاعات واقعی فقط از CSV یا ثبت دستی وارد می‌شوند.
export const initialCustomers: Customer[] = [];

export const provinces = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
];

export const usages = ["مسکونی", "تجاری", "صنعتی", "اداری", "بهداشتی درمانی", "آموزشی", "سایر"];
export const zones = ["حکیم", "شهرک قدس", "مرکز شهر", "مینودر", "بلوار شهید بهشتی"];

export type Contract = {
  id: number;
  no: string;
  building: string;
  manager: string;
  zone: string;
  start: string;
  end: string;
  kind: "general" | "misc" | "draft" | "renew";
  phone?: string;
  buildingName?: string;
  coordinator?: string;
  coordinatorPhone?: string;
  subscriptionNo?: string;
  signDate?: string;
  address?: string;
  isLegal?: boolean;
  locationStatus?: string;
  isCanceled?: boolean;
  cancelDate?: string;
  customer?: string;
  monthlyServiceFee?: number;
};

export const initialContracts: Contract[] = [];

export const cities: Record<string, string[]> = {
  "تهران": ["تهران", "شهریار", "ری"],
  "قزوین": ["قزوین", "الوند", "تاکستان"],
  "البرز": ["کرج", "فردیس", "نظرآباد"],
  "اصفهان": ["اصفهان", "کاشان", "نجف آباد"],
  "فارس": ["شیراز", "مرودشت"],
  "خراسان رضوی": ["مشهد", "نیشابور"],
};

export const recentItems = [
  { title: "پرونده - چاپ گزارش مشتریان بدهکار", time: "چند لحظه پیش" },
  { title: "سرویس و نگهداری - مشاهده ی قرارداد", time: "2 ساعت پیش" },
  { title: "پرونده - چاپ گزارش مشتریان", time: "3 ساعت پیش" },
  { title: "سرویس و نگهداری - قرارداد ها", time: "6 ساعت پیش" },
  { title: "پرونده - پرونده مالی مشتری", time: "3 ساعت پیش" },
  { title: "سرویس و نگهداری - مشاهده ی قرارداد", time: "3 ساعت پیش" },
];

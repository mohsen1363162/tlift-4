import React, { useState, useMemo } from "react";
import {
  Printer,
  Filter,
  Search,
  RotateCw,
  SlidersHorizontal,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileCheck2,
  Phone,
  Building2,
  Calendar,
  X,
  Check,
  ArrowUpDown,
  SquareArrowOutUpRight,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import type { Theme } from "./theme";
import { Contract } from "./data";
import { useCustomers, appStore } from "./store";

type DebtorItem = {
  id: number;
  name: string;
  phone: string;
  building: string;
  debt: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  debtType: "سرویس" | "قطعات و خرابی" | "جامع" | "معوق";
  status: "active" | "inactive";
};

// Realistic initial dataset matching screenshot 35
const INITIAL_DEBTORS: DebtorItem[] = [
  { id: 1, name: "* کردلو مجتمع صدرا", phone: "09123819022", building: "مجتمع صدرا", debt: 135500000, lastPaymentDate: "1405/01/20", lastPaymentAmount: 8500000, debtType: "جامع", status: "active" },
  { id: 2, name: "* صفرپور کوچه مظاهر محمدی *", phone: "09191823490", building: "مظاهر محمدی", debt: 84600000, lastPaymentDate: "1404/12/15", lastPaymentAmount: 6000000, debtType: "سرویس", status: "active" },
  { id: 3, name: "* اصلانی ولیعصر ع *", phone: "09351239841", building: "ولیعصر", debt: 77200000, lastPaymentDate: "1405/02/01", lastPaymentAmount: 7500000, debtType: "قطعات و خرابی", status: "active" },
  { id: 4, name: "* شریفی بلوک 20 *", phone: "09127765123", building: "بلوک 20 کوثر", debt: 75000000, lastPaymentDate: "1404/11/28", lastPaymentAmount: 5000000, debtType: "سرویس", status: "active" },
  { id: 5, name: "* صالحی رسالت 11 *", phone: "09194561287", building: "رسالت 11", debt: 71900000, lastPaymentDate: "1405/01/10", lastPaymentAmount: 8000000, debtType: "معوق", status: "active" },
  { id: 6, name: "* شهبازی پارس شرقی *", phone: "09129873412", building: "پارس شرقی", debt: 70000000, lastPaymentDate: "1404/12/20", lastPaymentAmount: 7000000, debtType: "سرویس", status: "active" },
  { id: 7, name: "* گلزنی کوچه 37", phone: "09361230987", building: "کوچه 37 بهار", debt: 66500000, lastPaymentDate: "1405/02/10", lastPaymentAmount: 6500000, debtType: "جامع", status: "active" },
  { id: 8, name: "* حامد عظیمی *", phone: "09121817263", building: "عظیمی پاسداران", debt: 66000000, lastPaymentDate: "1405/01/25", lastPaymentAmount: 7500000, debtType: "سرویس", status: "active" },
  { id: 9, name: "* حسینی فر", phone: "09193827162", building: "حسینی فر", debt: 66000000, lastPaymentDate: "1404/12/05", lastPaymentAmount: 5500000, debtType: "معوق", status: "active" },
  { id: 10, name: "* حسینی بلوار معلم *", phone: "09126549832", building: "معلم 14", debt: 66000000, lastPaymentDate: "1405/02/12", lastPaymentAmount: 6600000, debtType: "سرویس", status: "active" },
  { id: 11, name: "* دشتی بلوار کوچه محمد یزدی", phone: "09378129034", building: "محمد یزدی", debt: 59500000, lastPaymentDate: "1404/11/15", lastPaymentAmount: 6000000, debtType: "قطعات و خرابی", status: "active" },
  { id: 12, name: "* محمدی بلوار مالک اشتر", phone: "09191827364", building: "مالک اشتر پلاک 12", debt: 55000000, lastPaymentDate: "1405/01/18", lastPaymentAmount: 7500000, debtType: "سرویس", status: "active" },
  { id: 13, name: "* پژوم فرزانگان 1", phone: "09128934521", building: "فرزانگان 1", debt: 48000000, lastPaymentDate: "1405/02/05", lastPaymentAmount: 8000000, debtType: "سرویس", status: "active" },
  { id: 14, name: "* کشانچی فارابی 14", phone: "09357612345", building: "فارابی 14", debt: 44000000, lastPaymentDate: "1404/12/28", lastPaymentAmount: 7000000, debtType: "قطعات و خرابی", status: "active" },
  { id: 15, name: "* قدیری خیابان شهدای غواص", phone: "09123490812", building: "شهدای غواص", debt: 41000000, lastPaymentDate: "1405/01/05", lastPaymentAmount: 6500000, debtType: "معوق", status: "active" },
  { id: 16, name: "* چگینی حکمت 73 پلاک 19 ط 3", phone: "09192837465", building: "حکمت 73", debt: 38500000, lastPaymentDate: "1405/02/15", lastPaymentAmount: 8500000, debtType: "سرویس", status: "active" },
  { id: 17, name: "* مسعود حسینی فرزانگان 1", phone: "09124567890", building: "فرزانگان 1 بلوک ب", debt: 32000000, lastPaymentDate: "1405/01/22", lastPaymentAmount: 7000000, debtType: "سرویس", status: "active" },
  { id: 18, name: "* نظری ساختمان امید", phone: "09368901234", building: "ساختمان امید", debt: 29000000, lastPaymentDate: "1404/10/20", lastPaymentAmount: 5000000, debtType: "معوق", status: "active" },
  { id: 19, name: "* داوود غیاثوند نرگس 24", phone: "09199876543", building: "نرگس 24", debt: 25000000, lastPaymentDate: "1405/02/18", lastPaymentAmount: 7500000, debtType: "سرویس", status: "active" },
  { id: 20, name: "* غیاثوند عارف سپهر3", phone: "09128765432", building: "عارف سپهر 3", debt: 22500000, lastPaymentDate: "1405/03/01", lastPaymentAmount: 8500000, debtType: "سرویس", status: "active" },
  { id: 21, name: "* سرخیل توحید", phone: "09381234567", building: "توحید غربی", debt: 19500000, lastPaymentDate: "1405/01/30", lastPaymentAmount: 6000000, debtType: "سرویس", status: "active" },
  { id: 22, name: "* ابراهیمی فارابی 14", phone: "09123849102", building: "فارابی 14 پلاک 8", debt: 16000000, lastPaymentDate: "1405/02/20", lastPaymentAmount: 8000000, debtType: "سرویس", status: "active" },
  { id: 23, name: "* گچ کوب خیابان سلیمانی پلاک 21", phone: "09196543210", building: "سلیمانی 21", debt: 14500000, lastPaymentDate: "1405/01/12", lastPaymentAmount: 7000000, debtType: "قطعات و خرابی", status: "active" },
];

const fa = (n: number | string) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

const money = (n: number) =>
  fa(n.toLocaleString("fa-IR")) + " ریال";

export default function CustomerReportsPage({
  t,
  reportType = "debtors",
  onOpenContract,
  onOpenCustomerProfile,
}: {
  t: Theme;
  reportType?: "debtors" | "general";
  onOpenContract: (c: Contract) => void;
  onOpenCustomerProfile?: (customerName: string) => void;
}) {
  const isDebtorReport = reportType === "debtors";
  const [showFilter, setShowFilter] = useState(true);
  const [q, setQ] = useState("");
  const [selectedSpecificCustomer, setSelectedSpecificCustomer] = useState("");
  const [selectedCustomerStatus, setSelectedCustomerStatus] = useState("all");
  const [debtTypeFilter, setDebtTypeFilter] = useState("all");
  const [minDebt, setMinDebt] = useState("");
  const [maxDebt, setMaxDebt] = useState("");
  const [minLastPay, setMinLastPay] = useState("");
  const [maxLastPay, setMaxLastPay] = useState("");
  const [paymentStatusMode, setPaymentStatusMode] = useState<"پرداختی" | "داشته" | "نداشته" | "در" | "دستی">("داشته");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Filtered dataset
  const filteredList = useMemo(() => {
    return INITIAL_DEBTORS.filter((item) => {
      // General search query
      if (q.trim()) {
        const query = q.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchPhone = item.phone.includes(query);
        const matchBuilding = item.building.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchBuilding) return false;
      }

      // Specific customer select
      if (selectedSpecificCustomer && item.name !== selectedSpecificCustomer) {
        return false;
      }

      // Customer active status
      if (selectedCustomerStatus === "active" && item.status !== "active") return false;
      if (selectedCustomerStatus === "inactive" && item.status !== "inactive") return false;

      // Debt type
      if (debtTypeFilter !== "all" && item.debtType !== debtTypeFilter) return false;

      // Debt Range
      if (minDebt) {
        const minVal = parseInt(minDebt.replace(/\D/g, ""), 10);
        if (!isNaN(minVal) && item.debt < minVal) return false;
      }
      if (maxDebt) {
        const maxVal = parseInt(maxDebt.replace(/\D/g, ""), 10);
        if (!isNaN(maxVal) && item.debt > maxVal) return false;
      }

      // Last payment range
      if (minLastPay && item.lastPaymentAmount) {
        const minVal = parseInt(minLastPay.replace(/\D/g, ""), 10);
        if (!isNaN(minVal) && item.lastPaymentAmount < minVal) return false;
      }
      if (maxLastPay && item.lastPaymentAmount) {
        const maxVal = parseInt(maxLastPay.replace(/\D/g, ""), 10);
        if (!isNaN(maxVal) && item.lastPaymentAmount > maxVal) return false;
      }

      return true;
    });
  }, [
    q,
    selectedSpecificCustomer,
    selectedCustomerStatus,
    debtTypeFilter,
    minDebt,
    maxDebt,
    minLastPay,
    maxLastPay,
  ]);

  const totalCount = filteredList.length;
  const totalDebtSum = useMemo(
    () => filteredList.reduce((acc, curr) => acc + curr.debt, 0),
    [filteredList]
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayedItems = useMemo(
    () => filteredList.slice((page - 1) * pageSize, page * pageSize),
    [filteredList, page, pageSize]
  );

  const handleOpenContractForCustomer = (item: DebtorItem) => {
    const contract = appStore.getOrCreateContractForCustomer(item.name, item.debt);
    onOpenContract(contract);
  };

  const handleExportExcel = () => {
    // Generate CSV data for Persian Excel
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "ردیف,نام مشتری,تلفن همراه,نام ساختمان,مانده بدهی (ریال),نوع بدهی,آخرین پرداخت,مبلغ آخرین پرداخت\n";
    filteredList.forEach((row, i) => {
      csvContent += `${i + 1},"${row.name}","${row.phone}","${row.building}",${row.debt},"${row.debtType}","${row.lastPaymentDate || "-"}","${row.lastPaymentAmount || 0}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `گزارش_مشتریان_بدهکار_${new Date().toLocaleDateString("fa-IR")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("فایل گزارش با فرمت اکسل (CSV) با موفقیت دریافت شد");
  };

  const handleResetFilters = () => {
    setQ("");
    setSelectedSpecificCustomer("");
    setSelectedCustomerStatus("all");
    setDebtTypeFilter("all");
    setMinDebt("");
    setMaxDebt("");
    setMinLastPay("");
    setMaxLastPay("");
    setPage(1);
    notify("فیلترها بازنشانی شدند");
  };

  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden ${t.body}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b px-4 py-3 ${t.border} ${t.chrome}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/10 text-violet-500">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h1 className={`text-[15px] font-bold ${t.text}`}>
              {isDebtorReport ? "چاپ گزارش مشتریان بدهکار" : "چاپ گزارش مشتریان"}
            </h1>
            <p className={`text-[11.5px] ${t.sub}`}>
              گزارش تفصیلی وضعیت مانده بدهی، تاریخچه تسویه‌حساب و دسترسی مستقیم به پرونده قرارداد سرویس
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="flex items-center gap-1.5 rounded bg-violet-600 px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-sm hover:bg-violet-700 transition"
          >
            <Printer size={15} />
            <span>چاپ گزارش</span>
          </button>
        </div>
      </div>

      {/* Main scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Advanced Search Accordion Card */}
        <div className={`rounded-md border ${t.border} ${t.card} overflow-hidden shadow-sm`}>
          <div
            onClick={() => setShowFilter((v) => !v)}
            className={`flex cursor-pointer items-center justify-between border-b px-4 py-2.5 text-[13px] font-semibold ${
              t.border
            } ${t.dark ? "bg-[#252525]" : "bg-neutral-100"}`}
          >
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-violet-500" />
              <span>جستجوی پیشرفته</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-neutral-400 font-normal">
              <span>{showFilter ? "بستن پنل جستجو" : "باز کردن فیلترها"}</span>
              {showFilter ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </div>
          </div>

          {showFilter && (
            <div className="p-4 space-y-4 text-[12.5px]">
              {/* Row 0: Action button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    notify(`فیلتر با موفقیت اعمال شد. ${fa(filteredList.length)} مورد یافت گردید.`);
                  }}
                  className="flex items-center gap-1.5 rounded bg-violet-600/90 px-4 py-2 text-[12px] font-medium text-white hover:bg-violet-600 transition"
                >
                  <Filter size={13} />
                  <span>اعمال فیلتر و مشاهده نتایج</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="پاک کردن فیلترها"
                  className={`flex h-8 w-8 items-center justify-center rounded border ${t.border} ${t.hover} ${t.sub}`}
                >
                  <RotateCw size={14} />
                </button>
              </div>

              {/* Row 1: Search, Specific Customer, Customers Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Search */}
                <div>
                  <label className={`block mb-1.5 text-[12px] font-medium ${t.sub}`}>جستجو</label>
                  <div className={`flex items-center gap-2 rounded border px-2.5 py-1.5 ${t.input}`}>
                    <input
                      value={q}
                      onChange={(e) => {
                        setQ(e.target.value);
                        setPage(1);
                      }}
                      placeholder="براساس نام و موبایل مشتری"
                      className="w-full bg-transparent outline-none text-[12px]"
                    />
                    <Search size={14} className={t.sub} />
                  </div>
                </div>

                {/* Specific Customer */}
                <div>
                  <label className={`block mb-1.5 text-[12px] font-medium ${t.sub}`}>مشتری مشخص</label>
                  <div className={`relative rounded border ${t.border} ${t.input}`}>
                    <select
                      value={selectedSpecificCustomer}
                      onChange={(e) => {
                        setSelectedSpecificCustomer(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-transparent px-2.5 py-1.5 text-[12px] outline-none appearance-none"
                    >
                      <option value="" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        همه مشتریان
                      </option>
                      {INITIAL_DEBTORS.map((c) => (
                        <option
                          key={c.id}
                          value={c.name}
                          className={t.dark ? "bg-neutral-800" : "bg-white"}
                        >
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className={`absolute left-2.5 top-2.5 pointer-events-none ${t.sub}`} />
                  </div>
                </div>

                {/* Customers Status */}
                <div>
                  <label className={`block mb-1.5 text-[12px] font-medium ${t.sub}`}>مشتریان</label>
                  <div className={`relative rounded border ${t.border} ${t.input}`}>
                    <select
                      value={selectedCustomerStatus}
                      onChange={(e) => {
                        setSelectedCustomerStatus(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-transparent px-2.5 py-1.5 text-[12px] outline-none appearance-none"
                    >
                      <option value="all" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        همه وضعیت‌ها
                      </option>
                      <option value="active" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        مشتریان فعال
                      </option>
                      <option value="inactive" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        مشتریان غیرفعال
                      </option>
                    </select>
                    <ChevronDown size={13} className={`absolute left-2.5 top-2.5 pointer-events-none ${t.sub}`} />
                  </div>
                </div>
              </div>

              {/* Row 2: Debt Type, Debt Range, Last Payment Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Debt Type */}
                <div>
                  <label className={`block mb-1.5 text-[12px] font-medium ${t.sub}`}>نوع بدهی</label>
                  <div className={`relative rounded border ${t.border} ${t.input}`}>
                    <select
                      value={debtTypeFilter}
                      onChange={(e) => {
                        setDebtTypeFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full bg-transparent px-2.5 py-1.5 text-[12px] outline-none appearance-none"
                    >
                      <option value="all" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        همه نوع‌های بدهی
                      </option>
                      <option value="سرویس" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        بدهی شهریه سرویس و نگهداری
                      </option>
                      <option value="قطعات و خرابی" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        بدهی فاکتور قطعات و خرابی
                      </option>
                      <option value="جامع" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        بدهی جامع کلی
                      </option>
                      <option value="معوق" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                        بدهی‌های معوق سررسید گذشته
                      </option>
                    </select>
                    <ChevronDown size={13} className={`absolute left-2.5 top-2.5 pointer-events-none ${t.sub}`} />
                  </div>
                </div>

                {/* Debt Range */}
                <div>
                  <label className={`block mb-1.5 text-[12px] font-medium ${t.sub}`}>بازه مانده بدهی</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className={`flex items-center rounded border px-2 py-1 ${t.input}`}>
                      <input
                        value={minDebt}
                        onChange={(e) =>
                          setMinDebt(
                            e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          )
                        }
                        placeholder="حداقل"
                        className="w-full bg-transparent text-[11.5px] outline-none text-left"
                      />
                      <span className={`text-[10px] ${t.sub} mr-1`}>ریال</span>
                    </div>
                    <div className={`flex items-center rounded border px-2 py-1 ${t.input}`}>
                      <input
                        value={maxDebt}
                        onChange={(e) =>
                          setMaxDebt(
                            e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          )
                        }
                        placeholder="حداکثر"
                        className="w-full bg-transparent text-[11.5px] outline-none text-left"
                      />
                      <span className={`text-[10px] ${t.sub} mr-1`}>ریال</span>
                    </div>
                  </div>
                </div>

                {/* Last Payment Range */}
                <div>
                  <label className={`block mb-1.5 text-[12px] font-medium ${t.sub}`}>بازه مبلغ آخرین پرداخت</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className={`flex items-center rounded border px-2 py-1 ${t.input}`}>
                      <input
                        value={minLastPay}
                        onChange={(e) =>
                          setMinLastPay(
                            e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          )
                        }
                        placeholder="حداقل"
                        className="w-full bg-transparent text-[11.5px] outline-none text-left"
                      />
                      <span className={`text-[10px] ${t.sub} mr-1`}>ریال</span>
                    </div>
                    <div className={`flex items-center rounded border px-2 py-1 ${t.input}`}>
                      <input
                        value={maxLastPay}
                        onChange={(e) =>
                          setMaxLastPay(
                            e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          )
                        }
                        placeholder="حداکثر"
                        className="w-full bg-transparent text-[11.5px] outline-none text-left"
                      />
                      <span className={`text-[10px] ${t.sub} mr-1`}>ریال</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Payment status in timeframe */}
              <div>
                <label className={`block mb-1.5 text-[12px] font-medium ${t.sub}`}>
                  وضعیت پرداخت در بازه زمانی
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`flex items-center rounded border p-0.5 ${t.border} ${t.dark ? "bg-[#1f1f1f]" : "bg-neutral-200"}`}>
                    {(["پرداختی", "داشته", "نداشته", "در", "دستی"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentStatusMode(mode)}
                        className={`rounded px-3 py-1 text-[11.5px] transition ${
                          paymentStatusMode === mode
                            ? "bg-violet-600 text-white font-medium shadow-sm"
                            : `${t.sub} hover:text-white`
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[12px]">
                    <span className={t.sub}>از</span>
                    <input
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      placeholder="انتخاب تاریخ..."
                      className={`w-28 rounded border px-2 py-1 text-[11.5px] text-center outline-none ${t.input}`}
                    />
                    <span className={t.sub}>تا</span>
                    <input
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      placeholder="انتخاب تاریخ..."
                      className={`w-28 rounded border px-2 py-1 text-[11.5px] text-center outline-none ${t.input}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Top Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status summary tag */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded border px-3 py-1 text-[12px] font-medium ${
              t.border
            } ${t.dark ? "bg-[#252525]" : "bg-neutral-100"} ${t.text}`}>
              <Filter size={13} className="text-violet-400" />
              {q || selectedSpecificCustomer || selectedCustomerStatus !== "all" || debtTypeFilter !== "all" || minDebt || maxDebt ? (
                <span>فیلترهای سفارشی اعمال شده‌اند</span>
              ) : (
                <span>فیلتر شده براساس: فیلتری اعمال نشده است!</span>
              )}
            </span>

            <span className={`text-[12px] ${t.sub}`}>
              مجموع کل مانده بدهی: <strong className="text-violet-500 font-bold">{money(totalDebtSum)}</strong>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPrintModalOpen(true)}
              className="flex items-center gap-1.5 rounded bg-violet-600/90 px-3 py-1.5 text-[12px] font-medium text-white shadow hover:bg-violet-600 transition"
            >
              <Printer size={14} />
              <span>چاپ نتایج</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFilter((v) => !v)}
              className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[12px] ${t.border} ${t.hover} ${t.text}`}
            >
              <SlidersHorizontal size={14} className={t.sub} />
              <span>تغییر فیلتر</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              title="خروجی فایل اکسل"
              className={`flex h-8 w-8 items-center justify-center rounded border ${t.border} ${t.hover} text-emerald-500`}
            >
              <FileSpreadsheet size={15} />
            </button>
            <button
              type="button"
              title="تنظیمات ستون‌ها"
              className={`flex h-8 w-8 items-center justify-center rounded border ${t.border} ${t.hover} ${t.sub}`}
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Debtors Table */}
        <div className={`rounded-md border ${t.border} ${t.card} overflow-hidden shadow-sm`}>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[12.5px]">
              <thead className={`${t.head} ${t.sub} border-b ${t.border}`}>
                <tr>
                  <th className="w-14 px-4 py-3 font-medium text-center">ردیف</th>
                  <th className="px-4 py-3 font-medium">نام مشتری و ساختمان</th>
                  <th className="w-48 px-4 py-3 font-medium text-left">مانده بدهی</th>
                  <th className="w-14 px-2 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody className={t.text}>
                {displayedItems.map((item, idx) => {
                  const rowNum = (page - 1) * pageSize + idx + 1;
                  const isMenuOpen = menuOpenId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenContractForCustomer(item)}
                      className={`group cursor-pointer border-b ${t.border} transition-colors ${
                        t.dark ? "hover:bg-violet-950/20" : "hover:bg-violet-50/70"
                      }`}
                    >
                      {/* Row Index */}
                      <td className="px-4 py-3 text-center text-[12px] font-mono text-neutral-400">
                        {fa(rowNum)}
                      </td>

                      {/* Customer Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-neutral-100 group-hover:text-violet-400 transition">
                            {item.name}
                          </span>
                          <span className="opacity-0 group-hover:opacity-100 text-[11px] text-violet-400 transition flex items-center gap-1 mr-2">
                            <span>(مشاهده پرونده و قرارداد)</span>
                            <SquareArrowOutUpRight size={12} />
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11.5px] text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Building2 size={11} className="text-neutral-500" />
                            {item.building}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={11} className="text-neutral-500" />
                            {fa(item.phone)}
                          </span>
                          {item.lastPaymentDate && (
                            <span className="text-[11px] text-neutral-500">
                              آخرین پرداخت: {fa(item.lastPaymentDate)} ({fa((item.lastPaymentAmount || 0).toLocaleString("fa-IR"))} ریال)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Debt Amount */}
                      <td className="px-4 py-3 text-left">
                        <div className="font-bold text-[13.5px] text-amber-500 font-mono tracking-wide">
                          {money(item.debt)}
                        </div>
                        <div className="text-[10.5px] text-neutral-400 mt-0.5">
                          نوع: {item.debtType}
                        </div>
                      </td>

                      {/* Row Actions Menu */}
                      <td
                        className="px-2 py-3 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setMenuOpenId(isMenuOpen ? null : item.id)}
                          className={`rounded p-1.5 ${t.hover} ${t.sub}`}
                        >
                          <MoreVertical size={15} />
                        </button>

                        {isMenuOpen && (
                          <div
                            className={`absolute left-4 top-8 z-40 w-52 rounded border py-1 shadow-2xl text-right text-[12px] ${
                              t.border
                            } ${t.dark ? "bg-[#232323]" : "bg-white"}`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                handleOpenContractForCustomer(item);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-right text-violet-400 font-medium ${t.hover}`}
                            >
                              <SquareArrowOutUpRight size={13} />
                              <span>مشاهده پرونده و قرارداد</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                onOpenCustomerProfile?.(item.name.replace(/^\*\s*/, ""));
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-right ${t.hover} ${t.text}`}
                            >
                              <Building2 size={13} />
                              <span>پروفایل و اطلاعات مشتری</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenId(null);
                                notify(`پیامک یادآوری بدهی ${money(item.debt)} برای ${item.name} ارسال شد.`);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-right ${t.hover} ${t.text}`}
                            >
                              <MessageSquare size={13} />
                              <span>ارسال پیامک یادآوری بدهی</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {displayedItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertTriangle size={24} className="text-amber-500 opacity-60" />
                        <span>هیچ مشتری یا طرف حسابی با فیلترهای مشخص‌شده یافت نشد.</span>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-1 text-[12px] text-violet-400 hover:underline"
                        >
                          پاک کردن فیلترها
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination Bar (matches screenshot 35) */}
          <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${t.border} text-[12px] ${t.sub}`}>
            {/* Total items found */}
            <div className="flex items-center gap-2 font-medium">
              <span>{fa(totalCount)} مورد پیدا شد</span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`rounded border p-1 ${t.border} ${page <= 1 ? "opacity-30 cursor-not-allowed" : t.hover}`}
              >
                <ChevronRight size={14} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const pNum = i + 1;
                  const isActive = page === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`h-7 w-7 rounded border text-[11.5px] font-medium transition ${
                        isActive
                          ? "bg-violet-600 text-white border-violet-500 shadow-sm"
                          : `${t.border} ${t.hover} ${t.text}`
                      }`}
                    >
                      {fa(pNum)}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="px-1">...</span>}
                {totalPages > 5 && (
                  <button
                    type="button"
                    onClick={() => setPage(totalPages)}
                    className={`h-7 w-7 rounded border text-[11.5px] font-medium ${
                      page === totalPages
                        ? "bg-violet-600 text-white border-violet-500"
                        : `${t.border} ${t.hover} ${t.text}`
                    }`}
                  >
                    {fa(totalPages)}
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`rounded border p-1 ${t.border} ${page >= totalPages ? "opacity-30 cursor-not-allowed" : t.hover}`}
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page size dropdown */}
              <div className={`relative mr-3 rounded border ${t.border} ${t.input}`}>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-transparent px-2.5 py-1 text-[11.5px] outline-none appearance-none"
                >
                  <option value={10} className={t.dark ? "bg-neutral-800" : "bg-white"}>
                    ۱۰ / صفحه
                  </option>
                  <option value={20} className={t.dark ? "bg-neutral-800" : "bg-white"}>
                    ۲۰ / صفحه
                  </option>
                  <option value={50} className={t.dark ? "bg-neutral-800" : "bg-white"}>
                    ۵۰ / صفحه
                  </option>
                  <option value={100} className={t.dark ? "bg-neutral-800" : "bg-white"}>
                    ۱۰۰ / صفحه
                  </option>
                </select>
                <ChevronDown size={12} className={`absolute left-2 top-2 pointer-events-none ${t.sub}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Report Modal */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white text-neutral-900 shadow-2xl overflow-hidden font-[Tahoma,system-ui]">
            {/* Modal Actions */}
            <div className="flex items-center justify-between border-b bg-neutral-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-violet-600" />
                <span className="font-bold text-[14px]">پیش‌نمایش چاپ گزارش بدهی مشتریان</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded bg-violet-600 px-4 py-1.5 text-[12.5px] font-medium text-white shadow hover:bg-violet-700 transition"
                >
                  <Printer size={15} />
                  <span>ارسال به چاپگر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="rounded p-1.5 text-neutral-500 hover:bg-neutral-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Print Document Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-neutral-900">
              {/* Document Header */}
              <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-4">
                <div>
                  <h2 className="text-[17px] font-black text-neutral-900">
                    شرکت فنی و مهندسی آسانسور و پله‌برقی توانمند
                  </h2>
                  <p className="text-[12px] text-neutral-600 mt-1">
                    گزارش تراز و صورت مانده بدهی مشتریان و طرفین قرارداد
                  </p>
                </div>
                <div className="text-left text-[11.5px] text-neutral-600 space-y-1">
                  <div>تاریخ گزارش: <span className="font-semibold text-neutral-900">{new Date().toLocaleDateString("fa-IR")}</span></div>
                  <div>تعداد کل موارد: <span className="font-semibold text-neutral-900">{fa(filteredList.length)}</span></div>
                  <div>واحد پول: <span className="font-semibold text-neutral-900">ریال ایران</span></div>
                </div>
              </div>

              {/* Printable Table */}
              <table className="w-full text-right text-[12px] border-collapse border border-neutral-300">
                <thead>
                  <tr className="bg-neutral-200 text-neutral-800 font-bold border-b border-neutral-400">
                    <th className="border border-neutral-300 px-2.5 py-2 text-center w-12">ردیف</th>
                    <th className="border border-neutral-300 px-3 py-2">نام مشتری</th>
                    <th className="border border-neutral-300 px-3 py-2">ساختمان</th>
                    <th className="border border-neutral-300 px-3 py-2 text-center">شماره تماس</th>
                    <th className="border border-neutral-300 px-3 py-2 text-center">نوع بدهی</th>
                    <th className="border border-neutral-300 px-3 py-2 text-left">مانده بدهی (ریال)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 1 ? "bg-neutral-50" : "bg-white"}>
                      <td className="border border-neutral-300 px-2.5 py-1.5 text-center font-mono">{fa(i + 1)}</td>
                      <td className="border border-neutral-300 px-3 py-1.5 font-semibold">{c.name}</td>
                      <td className="border border-neutral-300 px-3 py-1.5">{c.building}</td>
                      <td className="border border-neutral-300 px-3 py-1.5 text-center font-mono">{fa(c.phone)}</td>
                      <td className="border border-neutral-300 px-3 py-1.5 text-center">{c.debtType}</td>
                      <td className="border border-neutral-300 px-3 py-1.5 text-left font-bold font-mono text-neutral-900">
                        {money(c.debt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-200 font-bold text-neutral-900 border-t-2 border-neutral-400">
                    <td colSpan={5} className="border border-neutral-300 px-3 py-2 text-left">
                      جمع کل مطالبات و مانده بدهی مشتریان:
                    </td>
                    <td className="border border-neutral-300 px-3 py-2 text-left font-mono text-[13px] text-violet-900">
                      {money(totalDebtSum)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Signature block */}
              <div className="grid grid-cols-3 gap-4 pt-10 text-center text-[12px] text-neutral-700">
                <div>
                  <div className="font-semibold mb-8">مسئول حسابداری و امور مالی</div>
                  <div className="border-t border-dashed border-neutral-400 pt-1 text-[11px]">امضا و تاریخ</div>
                </div>
                <div>
                  <div className="font-semibold mb-8">مدیر خدمات پس از فروش و سرویس</div>
                  <div className="border-t border-dashed border-neutral-400 pt-1 text-[11px]">امضا و تاریخ</div>
                </div>
                <div>
                  <div className="font-semibold mb-8">مدیر عامل / مهر شرکت</div>
                  <div className="border-t border-dashed border-neutral-400 pt-1 text-[11px]">امضا و مهر رسمی</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-800 px-4 py-2 text-[12.5px] text-white shadow-lg flex items-center gap-2 animate-fade-in">
          <Check size={14} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

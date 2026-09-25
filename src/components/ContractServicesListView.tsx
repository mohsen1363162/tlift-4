import { useState } from "react";
import {
  Wrench,
  ArrowRight,
  Search,
  Settings,
  RotateCw,
  FileText,
  ChevronDown,
  Pin,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Eye,
  Pencil,
  Printer,
  Bell,
  CheckCircle,
  Trash2,
  Cpu,
  Star,
  X,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Contract } from "../data";
import {
  MonthService,
  appStore,
  useContractDetails,
  useStaff,
} from "../store";
import BreakdownModal from "./BreakdownModal";
import { getPreviousJalaliMonthInfo } from "../utils/workHoursTracker";

interface ThemeProps {
  dark: boolean;
  border: string;
  head: string;
  sub: string;
  text: string;
  hover: string;
  body: string;
  input: string;
}

interface ContractServicesListViewProps {
  t: ThemeProps;
  contract: Contract;
  months?: MonthService[];
  onBack: () => void;
  onShowToast: (msg: string) => void;
  onOpenServiceReport: (month: MonthService) => void;
}

const fa = (n: string | number) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

const money = (n: number) => fa(n.toLocaleString("en-US")) + " ریال";

type ServiceTab =
  | "انجام شده"
  | "انجام نشده"
  | "دارای مغایرت"
  | "در انتظار تایید"
  | "همه";

export default function ContractServicesListView({
  t,
  contract,
  onBack,
  onShowToast,
  onOpenServiceReport,
}: ContractServicesListViewProps) {
  const details = useContractDetails(contract.id);
  const staffList = useStaff();
  const months = details.months || [];

  // Filter state
  const [activeTab, setActiveTab] = useState<ServiceTab>("انجام شده");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreStats, setShowMoreStats] = useState(false);

  // Checkboxes for report source
  const [filterCentralSoftware, setFilterCentralSoftware] = useState(false);
  const [filterTechnician, setFilterTechnician] = useState(false);

  // Selection state for multiple rows
  const [selectedMonthIds, setSelectedMonthIds] = useState<number[]>([]);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  // Selected row menu state
  const [openMenuMonthId, setOpenMenuMonthId] = useState<number | null>(null);

  // Bulk / Price edit modal state
  const [priceEditTarget, setPriceEditTarget] = useState<"done" | "notDone" | "selected" | null>(null);
  const [newPriceValue, setNewPriceValue] = useState<string>("7,000,000");

  // Single service edit / mark done modal
  const [editingMonth, setEditingMonth] = useState<MonthService | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTech, setEditTech] = useState("محسن امامی برسری");
  const [editAmount, setEditAmount] = useState("");
  const [editPartsAmount, setEditPartsAmount] = useState("0");
  const [editDelay, setEditDelay] = useState("بموقع");
  const [isMarkDoneMode, setIsMarkDoneMode] = useState(false);

  // Financial Stats
  const totalMonthsAmount = months.filter((m) => m.done).reduce((acc, m) => acc + m.amount, 0);
  const totalPaid = details.payments.reduce((acc, p) => acc + p.amount, 0);
  const debt = Math.max(0, totalMonthsAmount - totalPaid);

  const stats = [
    ["شماره قرارداد", fa(contract.no)],
    ["جمع مبلغ قابل پرداخت", money(totalMonthsAmount)],
    ["پرداختی", money(totalPaid)],
    ["مانده بدهی قرارداد", money(debt)],
    ["مانده بدهی ساختمان", money(debt)],
    ["مانده مشتری", money(debt)],
    ["نام ساختمان", contract.building],
    ["مسئول هماهنگی/مشتری", contract.manager],
  ];

  // اطلاعات ماه گذشته شمسی (مثلاً در مهرماه، ماه گذشته شهریور است)
  const prevMonthInfo = getPreviousJalaliMonthInfo();
  const isPastMonthPending = (m: MonthService) => {
    return !m.done && m.m === prevMonthInfo.monthName && m.y === prevMonthInfo.year;
  };

  // Counts
  const doneCount = months.filter((m) => m.done).length;
  const notDoneCount = months.filter((m) => isPastMonthPending(m)).length;
  const discrepancyCount = 0;
  const pendingCount = 0;
  const totalCount = months.length;

  // Filtered Services
  const filteredServices = months.filter((m) => {
    if (activeTab === "انجام شده" && !m.done) return false;
    // کارهای ماه گذشته فقط جزو سرویس‌های انجام‌نشده قرار می‌گیرند
    if (activeTab === "انجام نشده" && !isPastMonthPending(m)) return false;
    if (activeTab === "دارای مغایرت" || activeTab === "در انتظار تایید") return false;

    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      const techMatch = (m.doneBy || "").toLowerCase().includes(q) || (m.techs || []).some((t) => t.toLowerCase().includes(q));
      const monthMatch = (m.m || "").toLowerCase().includes(q);
      const dateMatch = (m.date || "").toLowerCase().includes(q) || (m.plannedDate || "").toLowerCase().includes(q);
      return techMatch || monthMatch || dateMatch;
    }
    return true;
  });

  // Default delay text helper
  const getDelayOrAdvance = (m: MonthService, index: number) => {
    if (m.delayOrAdvance) return m.delayOrAdvance;
    if (!m.done) return "بدون تاریخ انجام";
    if (index === 0) return "۴ روز تاخیر";
    if (index === 1) return "۱ روز تاخیر";
    if (index === 2) return "بموقع";
    if (index === 3) return "۲ روز تاخیر";
    return "بموقع";
  };

  // Default planned date helper
  const getPlannedDate = (m: MonthService) => {
    if (m.plannedDate) return m.plannedDate;
    return `۸ ${m.m} ${m.y}`;
  };

  // Default tech helper
  const getTechName = (m: MonthService, index: number) => {
    if (!m.done) return "-";
    if (m.doneBy) return m.doneBy;
    if (m.techs && m.techs.length > 0) return m.techs.join("، ");
    if (index === 0) return "محسن امامی برسری";
    if (index === 1 || index === 2) return "مرتضی قاسمعلی";
    if (index === 3) return "بهمن کشاورز";
    return "محسن امامی برسری";
  };

  // Default score helper
  const getScore = (index: number) => {
    if (index === 1 || index === 2) return 3;
    return 5;
  };

  // Selection state helpers
  const isAllSelected =
    filteredServices.length > 0 &&
    filteredServices.every((m) => selectedMonthIds.includes(m.id));

  const isSomeSelected =
    filteredServices.some((m) => selectedMonthIds.includes(m.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const currentFilteredIds = new Set(filteredServices.map((m) => m.id));
      setSelectedMonthIds((prev) => prev.filter((id) => !currentFilteredIds.has(id)));
    } else {
      const currentFilteredIds = filteredServices.map((m) => m.id);
      setSelectedMonthIds((prev) => Array.from(new Set([...prev, ...currentFilteredIds])));
    }
  };

  const toggleSelectMonth = (id: number) => {
    setSelectedMonthIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkMarkSelectedDone = () => {
    if (selectedMonthIds.length === 0) return;
    let count = 0;
    selectedMonthIds.forEach((id) => {
      const m = months.find((x) => x.id === id);
      if (m && !m.done) {
        count++;
        appStore.updateMonthService(contract.id, id, {
          done: true,
          date: `1405/${String(id).padStart(2, "0")}/10`,
          doneBy: "محسن امامی برسری",
          techs: ["محسن امامی برسری"],
          delayOrAdvance: "بموقع",
        });
      }
    });
    if (count > 0) {
      onShowToast(`${fa(count)} سرویس انتخابی به عنوان انجام شده ثبت شد`);
    } else {
      onShowToast("تمامی سرویس‌های انتخابی قبلاً انجام شده‌اند");
    }
  };

  const handleBulkPrintChecklist = () => {
    onShowToast(`چک‌لیست ${fa(selectedMonthIds.length)} سرویس انتخاب شده آماده چاپ شد`);
  };

  const handleBulkPriceSave = () => {
    const cleanNum = parseInt(newPriceValue.replace(/\D/g, ""), 10) || 7000000;
    if (priceEditTarget === "selected") {
      months.forEach((m) => {
        if (selectedMonthIds.includes(m.id)) {
          appStore.updateMonthService(contract.id, m.id, { amount: cleanNum });
        }
      });
      onShowToast(
        `قیمت ${fa(selectedMonthIds.length)} سرویس انتخاب شده به ${money(cleanNum)} تغییر یافت`
      );
      setPriceEditTarget(null);
      return;
    }

    const targetDone = priceEditTarget === "done";
    months.forEach((m) => {
      if (m.done === targetDone) {
        appStore.updateMonthService(contract.id, m.id, { amount: cleanNum });
      }
    });
    onShowToast(
      `قیمت سرویس‌های ${targetDone ? "انجام شده" : "انجام نشده"} به ${money(cleanNum)} تغییر یافت`
    );
    setPriceEditTarget(null);
  };

  const handleSaveSingleEdit = () => {
    if (!editingMonth) return;
    const cleanAmount = parseInt(editAmount.replace(/\D/g, ""), 10) || editingMonth.amount;
    const cleanParts = parseInt(editPartsAmount.replace(/\D/g, ""), 10) || 0;

    appStore.updateMonthService(contract.id, editingMonth.id, {
      done: isMarkDoneMode ? true : editingMonth.done,
      date: editDate || editingMonth.date || "1405/06/10",
      doneBy: editTech,
      techs: [editTech],
      amount: cleanAmount,
      partsAmount: cleanParts,
      delayOrAdvance: editDelay,
    });

    onShowToast(
      isMarkDoneMode
        ? `سرویس ماه ${editingMonth.m} به عنوان انجام شده ثبت شد`
        : `اطلاعات سرویس ماه ${editingMonth.m} به‌روزرسانی شد`
    );
    setEditingMonth(null);
    setOpenMenuMonthId(null);
  };

  const handleDeleteService = (month: MonthService) => {
    if (confirm(`آیا از حذف سرویس ماه ${month.m} اطمینان دارید؟`)) {
      appStore.updateMonthService(contract.id, month.id, {
        done: false,
        date: undefined,
        doneBy: undefined,
        techs: undefined,
      });
      onShowToast(`سرویس ماه ${month.m} لغو گردید`);
      setOpenMenuMonthId(null);
    }
  };

  const openMarkDoneModal = (month: MonthService) => {
    setEditingMonth(month);
    setIsMarkDoneMode(true);
    setEditDate(`1405/${String(month.id).padStart(2, "0")}/10`);
    setEditTech("محسن امامی برسری");
    setEditAmount(month.amount.toLocaleString("en-US"));
    setEditPartsAmount("0");
    setEditDelay("بموقع");
    setOpenMenuMonthId(null);
  };

  const openEditModal = (month: MonthService) => {
    setEditingMonth(month);
    setIsMarkDoneMode(false);
    setEditDate(month.date || `1405/${String(month.id).padStart(2, "0")}/10`);
    setEditTech(month.doneBy || "محسن امامی برسری");
    setEditAmount(month.amount.toLocaleString("en-US"));
    setEditPartsAmount(month.partsAmount ? month.partsAmount.toLocaleString("en-US") : "0");
    setEditDelay(month.delayOrAdvance || "بموقع");
    setOpenMenuMonthId(null);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 font-[Tahoma,system-ui]">
      {/* 1. Top Stats Strip (Matching sshot-2.png) */}
      <div className={`grid grid-cols-8 overflow-hidden rounded border ${t.border}`}>
        {stats.map(([k, v], i) => (
          <div
            key={i}
            className={`border-s px-3 py-2 ${t.border} ${
              t.dark ? "bg-[#232323]" : "bg-neutral-50"
            }`}
          >
            <div className={`mb-1 flex items-center justify-between gap-1 text-[11px] ${t.sub}`}>
              <span className="truncate">{k}</span>
              <Pin size={11} className="shrink-0" />
            </div>
            <div
              className={`truncate text-[12px] font-medium ${
                i === 0
                  ? "text-sky-400"
                  : i === 2
                  ? "text-emerald-500 font-bold"
                  : i === 3 && debt === 0
                  ? "text-emerald-500 font-bold"
                  : t.text
              }`}
            >
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* Expand/Collapse Toggle (Matching sshot-2.png) */}
      <div className="mt-1 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setShowMoreStats(!showMoreStats)}
          className={`flex items-center gap-1 text-[12px] ${t.sub} hover:text-white transition`}
        >
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${showMoreStats ? "rotate-180" : ""}`}
          />
          <span>مشاهده بیشتر</span>
        </button>
      </div>

      {showMoreStats && (
        <div
          className={`mt-2 rounded-lg border p-3 text-[12px] animate-in fade-in ${t.border} ${
            t.dark ? "bg-[#1e1e1e]" : "bg-white"
          }`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-neutral-300">
            <div>
              <span className="text-neutral-500">شماره قرارداد قبلی:</span>{" "}
              <span className="font-mono">{fa("4120")}</span>
            </div>
            <div>
              <span className="text-neutral-500">منطقه:</span>{" "}
              <span>{contract.zone || "عارف سپهر"}</span>
            </div>
            <div>
              <span className="text-neutral-500">آدرس ساختمان:</span>{" "}
              <span className="truncate">{contract.building}</span>
            </div>
            <div>
              <span className="text-neutral-500">دستگاه:</span>{" "}
              <span className="font-mono">۱ (114851)</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Header Bar: Title with Wrench and Back Button (Matching sshot-2.png) */}
      <div className="mt-3 flex items-center justify-between">
        {/* Left: Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded border border-neutral-700 bg-[#252525] px-3.5 py-1 text-[12px] text-neutral-200 hover:bg-[#2d2d2d] hover:text-white transition active:scale-95 shadow-sm"
        >
          <ArrowRight size={14} />
          <span>بازگشت</span>
        </button>

        {/* Right: Title "سرویس‌ها" with Wrench icon */}
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-bold text-neutral-100">سرویس‌ها</span>
          <Wrench size={19} className="text-neutral-300 stroke-[2.2]" />
        </div>
      </div>

      {/* Dashed separator (Matching sshot-2.png) */}
      <div className="my-2.5 border-b border-dashed border-neutral-700/60" />

      {/* 3. Controls & Filter Bar (Matching sshot-2.png, sshot-4.png & sshot-6.png) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search and Action Icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onShowToast("دریافت خروجی گزارش فاکتور و سرویس‌ها")}
            title="خروجی و چاپ گزارش"
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-700 bg-[#232323] text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition"
          >
            <FileText size={15} />
          </button>

          <button
            type="button"
            onClick={() => onShowToast("لیست سرویس‌ها به‌روزرسانی شد")}
            title="تازه‌سازی"
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-700 bg-[#232323] text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition"
          >
            <RotateCw size={14} />
          </button>

          <button
            type="button"
            onClick={() => onShowToast("تنظیمات ستون‌های سرویس")}
            title="تنظیمات جدول"
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-700 bg-[#232323] text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition"
          >
            <Settings size={15} />
          </button>

          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو خودکار با بیش از ۲ کاراکتر"
              className="w-56 sm:w-64 rounded-lg border border-neutral-700 bg-[#202020] px-3 py-1.5 pl-8 text-[11.5px] text-neutral-200 placeholder:text-neutral-500 focus:border-purple-500 focus:outline-none transition"
            />
            <Search size={14} className="absolute left-2.5 text-neutral-400 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-7 text-neutral-500 hover:text-neutral-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Status Pills & Price Edit Buttons (Ordered right to left in RTL) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* دکمه ویرایش قیمت موارد انتخاب شده (در صورت انتخاب چند سطر) */}
          {selectedMonthIds.length > 0 && (
            <button
              type="button"
              onClick={() => setPriceEditTarget("selected")}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500 bg-purple-900/50 px-3 py-1 text-[11.5px] font-semibold text-purple-200 hover:bg-purple-800/60 transition shadow-sm animate-in fade-in"
            >
              <Pencil size={12} />
              <span>ویرایش قیمت موارد انتخابی ({fa(selectedMonthIds.length)})</span>
            </button>
          )}

          {/* ویرایش قیمت سرویس های انجام نشده (sshot-6) */}
          <button
            type="button"
            onClick={() => setPriceEditTarget("notDone")}
            className="rounded-lg border border-neutral-700 bg-[#252525] px-3 py-1 text-[11.5px] text-neutral-300 hover:bg-[#2c2c2c] hover:text-white transition"
          >
            ویرایش قیمت سرویس های انجام نشده
          </button>

          {/* ویرایش قیمت سرویس های انجام شده (sshot-6) */}
          <button
            type="button"
            onClick={() => setPriceEditTarget("done")}
            className="rounded-lg border border-neutral-700 bg-[#252525] px-3 py-1 text-[11.5px] text-neutral-300 hover:bg-[#2c2c2c] hover:text-white transition"
          >
            ویرایش قیمت سرویس های انجام شده
          </button>

          {/* Pill: همه [۱۲] */}
          <button
            type="button"
            onClick={() => setActiveTab("همه")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "همه"
                ? "border-neutral-500 bg-[#2c2c2c] text-white ring-1 ring-neutral-400/50"
                : "border-neutral-700/80 bg-[#1e1e1e] text-neutral-300 hover:bg-[#252525]"
            }`}
          >
            <span>همه</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-neutral-800 px-1 text-[10px] font-mono text-neutral-300 border border-neutral-700">
              {fa(totalCount)}
            </span>
          </button>

          {/* Pill: در انتظار تایید [۰] */}
          <button
            type="button"
            onClick={() => setActiveTab("در انتظار تایید")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "در انتظار تایید"
                ? "border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500/60"
                : "border-amber-900/40 bg-amber-950/20 text-amber-300 hover:bg-amber-950/35"
            }`}
          >
            <span>در انتظار تایید</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-900/60 px-1 text-[10px] font-mono text-amber-200 border border-amber-700/60">
              {fa(pendingCount)}
            </span>
          </button>

          {/* Pill: دارای مغایرت [۰] */}
          <button
            type="button"
            onClick={() => setActiveTab("دارای مغایرت")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "دارای مغایرت"
                ? "border-red-500 bg-red-950/40 text-red-200 ring-1 ring-red-500/60"
                : "border-red-900/40 bg-red-950/20 text-red-300 hover:bg-red-950/35"
            }`}
          >
            <span>دارای مغایرت</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-900/60 px-1 text-[10px] font-mono text-red-200 border border-red-700/60">
              {fa(discrepancyCount)}
            </span>
          </button>

          {/* Pill: انجام نشده [۸] */}
          <button
            type="button"
            onClick={() => setActiveTab("انجام نشده")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "انجام نشده"
                ? "border-rose-500 bg-rose-950/50 text-rose-200 ring-1 ring-rose-500/60"
                : "border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/35"
            }`}
          >
            <span>انجام نشده ({prevMonthInfo.monthName})</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-900/70 px-1.5 text-[10px] font-mono text-rose-200 border border-rose-700/60">
              {fa(notDoneCount)}
            </span>
          </button>

          {/* Pill: انجام شده [۴] */}
          <button
            type="button"
            onClick={() => setActiveTab("انجام شده")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "انجام شده"
                ? "border-emerald-500 bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-500/60"
                : "border-emerald-900/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/35"
            }`}
          >
            <span>انجام شده</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-800 px-1.5 text-[10px] font-mono text-emerald-100 border border-emerald-600/60">
              {fa(doneCount)}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Sub-filters Checkboxes & Multi-select Toolbar */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 text-[11.5px]">
        <div className="flex items-center gap-5 text-neutral-300">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterCentralSoftware}
              onChange={(e) => setFilterCentralSoftware(e.target.checked)}
              className="rounded border-neutral-700 bg-[#252525] text-purple-600 focus:ring-0 h-3.5 w-3.5 accent-purple-600 cursor-pointer"
            />
            <span>ثبت گزارش توسط کاربر نرم افزار مرکزی</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterTechnician}
              onChange={(e) => setFilterTechnician(e.target.checked)}
              className="rounded border-neutral-700 bg-[#252525] text-purple-600 focus:ring-0 h-3.5 w-3.5 accent-purple-600 cursor-pointer"
            />
            <span>ثبت گزارش توسط سرویسکار</span>
          </label>
        </div>

        {/* Selected rows action bar */}
        {selectedMonthIds.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-purple-700/60 bg-purple-950/50 px-3 py-1 text-[11.5px] text-purple-200 animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
                {fa(selectedMonthIds.length)}
              </span>
              <span>مورد انتخاب شده</span>
            </div>

            <span className="text-purple-700">|</span>

            <button
              type="button"
              onClick={() => setPriceEditTarget("selected")}
              className="hover:text-white underline transition"
            >
              ویرایش قیمت
            </button>

            <span className="text-purple-700">|</span>

            <button
              type="button"
              onClick={handleBulkMarkSelectedDone}
              className="hover:text-emerald-300 underline transition"
            >
              ثبت انجام شده
            </button>

            <span className="text-purple-700">|</span>

            <button
              type="button"
              onClick={handleBulkPrintChecklist}
              className="hover:text-white underline transition"
            >
              چاپ چک‌لیست
            </button>

            <span className="text-purple-700">|</span>

            <button
              type="button"
              onClick={() => setSelectedMonthIds([])}
              className="text-neutral-400 hover:text-white transition flex items-center gap-0.5"
            >
              <X size={11} />
              <span>لغو انتخاب</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Table Container */}
      <div className="mt-3 flex-1 overflow-x-auto rounded-xl border border-neutral-800 bg-[#1a1a1a] shadow">
        {/* If tab is "دارای مغایرت" or "در انتظار تایید", show empty list table structure (Matching sshot-7.png) */}
        {activeTab === "دارای مغایرت" || activeTab === "در انتظار تایید" ? (
          <table className="w-full text-right text-[11.5px] border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#222] text-neutral-400 font-medium select-none">
                <th className="px-2.5 py-2.5 text-center w-9">
                  <input
                    type="checkbox"
                    disabled
                    className="h-3.5 w-3.5 rounded border-neutral-700 bg-[#252525] text-purple-600 opacity-40 cursor-not-allowed"
                  />
                </th>
                <th className="px-3 py-2.5 text-center w-12">ردیف</th>
                <th className="px-3 py-2.5">شماره سرویس</th>
                <th className="px-3 py-2.5">نوع</th>
                <th className="px-3 py-2.5">دستگاه</th>
                <th className="px-3 py-2.5">شماره ملی</th>
                <th className="px-3 py-2.5">تاریخ سرویس</th>
                <th className="px-3 py-2.5 text-center">تعداد گزارش‌های متناقض</th>
                <th className="px-3 py-2.5">آخرین تاریخ ثبت گزارش</th>
                <th className="px-3 py-2.5">شماره قرارداد</th>
                <th className="px-3 py-2.5">مشتری</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={11} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="relative flex items-center justify-center text-neutral-600">
                      <svg
                        className="h-16 w-16 text-neutral-600/70"
                        viewBox="0 0 64 64"
                        fill="currentColor"
                      >
                        <path d="M12 24 L52 24 L52 48 C52 50.2 50.2 52 48 52 L16 52 C13.8 52 12 50.2 12 48 Z" fill="#292929" stroke="#3d3d3d" strokeWidth="2" />
                        <path d="M12 36 L24 36 L28 42 L36 42 L40 36 L52 36" fill="none" stroke="#4a4a4a" strokeWidth="2" />
                        <rect x="20" y="16" width="24" height="14" rx="2" fill="#202020" stroke="#383838" strokeWidth="1.5" />
                        <line x1="24" y1="21" x2="36" y2="21" stroke="#444" strokeWidth="1.5" />
                        <line x1="24" y1="25" x2="32" y2="25" stroke="#444" strokeWidth="1.5" />
                      </svg>
                      <div className="absolute -top-1.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#333] border border-neutral-600 text-neutral-400 shadow">
                        <span className="text-[10px] leading-none">•••</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-medium text-neutral-400">
                      لیست خالی می باشد
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          /* Table for "انجام شده", "انجام نشده", "همه" (Matching sshot-2.png, sshot-4.png, sshot-6.png) */
          <table className="w-full text-right text-[11.5px] border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#222] text-neutral-400 font-medium select-none">
                {/* مربع کوچک انتخاب همه در بالا (Master Checkbox) */}
                <th className="px-2.5 py-2.5 text-center w-9">
                  <input
                    type="checkbox"
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    title="انتخاب همه سرویس‌ها"
                    className="h-3.5 w-3.5 cursor-pointer rounded border-neutral-700 bg-[#252525] text-purple-600 focus:ring-0 accent-purple-600"
                  />
                </th>
                <th className="px-3 py-2.5 text-center w-12">ردیف</th>
                <th className="px-3 py-2.5">سرویسکاران انجام دهنده</th>
                <th className="px-3 py-2.5 text-center">تاریخ برنامه ریزی شده</th>
                <th className="px-3 py-2.5 text-center">تاریخ انجام</th>
                <th className="px-3 py-2.5 text-center">تاخیر یا تعجیل</th>
                <th className="px-3 py-2.5 text-left">جمع مبلغ قطعه</th>
                <th className="px-3 py-2.5 text-left">قیمت نهایی سرویس</th>
                <th className="px-3 py-2.5 text-center w-24">امتیاز</th>
                <th className="px-3 py-2.5 text-center">فاکتور تایید نشده</th>
                <th className="px-2.5 py-2.5 text-center w-12">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-neutral-400">
                    هیچ موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredServices.map((m, idx) => {
                  const delayText = getDelayOrAdvance(m, idx);
                  const plannedDate = getPlannedDate(m);
                  const tech = getTechName(m, idx);
                  const stars = getScore(idx);
                  const isMenuOpen = openMenuMonthId === m.id;
                  const isSelected = selectedMonthIds.includes(m.id);

                  return (
                    <tr
                      key={m.id}
                      onClick={() => toggleSelectMonth(m.id)}
                      className={`border-b border-neutral-850 hover:bg-neutral-800/40 transition group cursor-pointer text-neutral-200 select-none ${
                        isSelected ? "bg-purple-950/25 border-purple-900/40" : ""
                      }`}
                    >
                      {/* مربع کوچک انتخاب سطر (Row Checkbox) */}
                      <td
                        className="px-2.5 py-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectMonth(m.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectMonth(m.id);
                          }}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-neutral-700 bg-[#252525] text-purple-600 focus:ring-0 accent-purple-600"
                        />
                      </td>

                      {/* ردیف */}
                      <td className="px-3 py-3 text-center font-mono text-neutral-400">
                        {fa(idx + 1)}
                      </td>

                      {/* سرویسکاران انجام دهنده */}
                      <td className="px-3 py-3 font-medium text-neutral-200">
                        {m.done ? (
                          <span>{tech}</span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>

                      {/* تاریخ برنامه ریزی شده */}
                      <td className="px-3 py-3 text-center font-mono text-neutral-300">
                        {fa(plannedDate)}
                      </td>

                      {/* تاریخ انجام */}
                      <td className="px-3 py-3 text-center font-mono text-neutral-300">
                        {m.done && m.date ? (
                          fa(m.date)
                        ) : m.done ? (
                          fa(`${idx + 7} ${m.m} ${m.y}`)
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>

                      {/* تاخیر یا تعجیل */}
                      <td className="px-3 py-3 text-center text-neutral-300">
                        <span
                          className={`text-[11.5px] ${
                            delayText.includes("تاخیر")
                              ? "text-rose-400"
                              : delayText.includes("بموقع")
                              ? "text-emerald-400"
                              : "text-neutral-400"
                          }`}
                        >
                          {delayText}
                        </span>
                      </td>

                      {/* جمع مبلغ قطعه */}
                      <td className="px-3 py-3 text-left font-mono font-medium text-neutral-200">
                        {m.partsAmount && m.partsAmount > 0
                          ? money(m.partsAmount)
                          : idx === 3 && m.done
                          ? "۳,۵۰۰,۰۰۰ ریال"
                          : "-"}
                      </td>

                      {/* قیمت نهایی سرویس */}
                      <td className="px-3 py-3 text-left font-mono font-medium text-neutral-200">
                        {money(m.amount || 7000000)}
                      </td>

                      {/* امتیاز */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-0.5 text-amber-400">
                          {Array.from({ length: 5 }).map((_, s) => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                s < stars
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-neutral-600"
                              }
                            />
                          ))}
                        </div>
                      </td>

                      {/* فاکتور تایید نشده */}
                      <td className="px-3 py-3 text-center text-neutral-400">
                        ندارد
                      </td>

                      {/* عملیات (Three Dots Menu Column) */}
                      <td
                        className="px-2.5 py-3 text-center relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuMonthId(isMenuOpen ? null : m.id);
                          }}
                          className="rounded p-1 text-neutral-400 hover:text-white hover:bg-neutral-700 transition"
                          title="عملیات سرویس"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {/* Dropdown Menu (Matching sshot-3.png and sshot-5.png) */}
                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-2 top-10 z-50 min-w-[185px] overflow-hidden rounded-xl border border-neutral-700 bg-[#252525] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100 text-right text-[11.5px]"
                          >
                            {m.done ? (
                              /* Menu for "انجام شده" (Matching sshot-3.png) */
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onOpenServiceReport(m);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                                >
                                  <Eye size={14} className="text-sky-400" />
                                  <span>مشاهده گزارش سرویس</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onOpenServiceReport(m);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                                >
                                  <Pencil size={14} className="text-amber-400" />
                                  <span>ویرایش</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onShowToast(`چک‌لیست سرویس ماه ${m.m} برای چاپ آماده شد`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                                >
                                  <Printer size={14} className="text-neutral-400" />
                                  <span>چاپ چک لیست</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onShowToast(`یادآور برای سرویس ماه ${m.m} ثبت شد`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                                >
                                  <Bell size={14} className="text-purple-400" />
                                  <span>یادآور</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    setIsBreakdownModalOpen(true);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-amber-400 hover:bg-neutral-700 hover:text-amber-300 transition"
                                >
                                  <AlertTriangle size={14} className="text-amber-400" />
                                  <span>ثبت خرابی</span>
                                </button>
                              </>
                            ) : (
                              /* Menu for "انجام نشده" (Matching sshot-5.png) */
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onOpenServiceReport(m);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-emerald-300 hover:bg-neutral-700 hover:text-emerald-200 transition font-medium"
                                >
                                  <CheckCircle size={14} className="text-emerald-400" />
                                  <span>انجام سرویس</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    setIsBreakdownModalOpen(true);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-amber-400 hover:bg-neutral-700 hover:text-amber-300 transition"
                                >
                                  <AlertTriangle size={14} className="text-amber-400" />
                                  <span>ثبت خرابی</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteService(m)}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-rose-300 hover:bg-rose-950/40 transition"
                                >
                                  <Trash2 size={14} className="text-rose-400" />
                                  <span>حذف</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onShowToast(`چک‌لیست سرویس ماه ${m.m} چاپ شد`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                                >
                                  <Printer size={14} className="text-neutral-400" />
                                  <span>چاپ چک لیست</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onShowToast("دسترسی به مشخصات فنی آسانسور و استانداردها");
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                                >
                                  <Cpu size={14} className="text-cyan-400" />
                                  <span>دسترسی به مشخصات فنی</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuMonthId(null);
                                    onShowToast(`یادآور سرویس تنظیم گردید`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-neutral-200 hover:bg-neutral-700 hover:text-white transition"
                                >
                                  <Bell size={14} className="text-purple-400" />
                                  <span>یادآور</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. Bottom Pagination & Footer Bar (Matching sshot-2.png & sshot-4.png) */}
      <div className="mt-3 flex items-center justify-between border-t border-neutral-800 pt-3 text-[12px] text-neutral-400">
        {/* Left: Pagination */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded border border-neutral-700 p-1 text-neutral-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight size={14} />
            </button>
            <span className="px-2 font-mono text-neutral-200">{fa(currentPage)}</span>
            <button
              type="button"
              disabled={filteredServices.length <= pageSize}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded border border-neutral-700 p-1 text-neutral-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-[#222] px-2 py-0.5 text-[11px] text-neutral-300 focus:outline-none"
            >
              <option value={10}>۱۰ / صفحه</option>
              <option value={20}>۲۰ / صفحه</option>
              <option value={50}>۵۰ / صفحه</option>
            </select>
          </div>
        </div>

        {/* Right: Record count */}
        <div className="text-neutral-400 text-[12px]">
          {activeTab === "دارای مغایرت" || activeTab === "در انتظار تایید"
            ? "موردی پیدا نشد!"
            : `${fa(filteredServices.length)} مورد پیدا شد`}
        </div>
      </div>

      {/* Modal: Bulk Price Edit */}
      {priceEditTarget !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPriceEditTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-700 bg-[#222] p-5 shadow-2xl text-right"
          >
            <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
              <span className="text-[14px] font-bold text-white">
                {priceEditTarget === "selected"
                  ? `ویرایش قیمت ${fa(selectedMonthIds.length)} سرویس انتخاب شده`
                  : priceEditTarget === "done"
                  ? "ویرایش قیمت سرویس‌های انجام شده"
                  : "ویرایش قیمت سرویس‌های انجام نشده"}
              </span>
              <button
                type="button"
                onClick={() => setPriceEditTarget(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="my-4">
              <label className="block text-[12px] text-neutral-300 mb-1.5">
                مبلغ جدید هر سرویس (ریال):
              </label>
              <input
                type="text"
                value={newPriceValue}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setNewPriceValue(val ? Number(val).toLocaleString("en-US") : "");
                }}
                className="w-full rounded-lg border border-neutral-700 bg-[#2a2a2a] px-3 py-2 text-[13px] text-white font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPriceEditTarget(null)}
                className="rounded-lg border border-neutral-700 px-4 py-1.5 text-[12px] text-neutral-300 hover:bg-neutral-800"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleBulkPriceSave}
                className="rounded-lg bg-purple-600 px-5 py-1.5 text-[12px] font-semibold text-white hover:bg-purple-700 shadow"
              >
                ثبت تغییر قیمت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Single Service Edit / Mark as Done */}
      {editingMonth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setEditingMonth(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-700 bg-[#222] p-5 shadow-2xl text-right"
          >
            <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
              <span className="text-[14px] font-bold text-white">
                {isMarkDoneMode
                  ? `ثبت انجام سرویس ماه ${editingMonth.m}`
                  : `ویرایش سرویس ماه ${editingMonth.m}`}
              </span>
              <button
                type="button"
                onClick={() => setEditingMonth(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 my-4 text-[12px]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">تاریخ انجام سرویس</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-[#2a2a2a] px-3 py-2 text-white font-mono focus:border-purple-500 focus:outline-none"
                    placeholder="1405/06/10"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">سرویسکار انجام دهنده</label>
                  <select
                    value={editTech}
                    onChange={(e) => setEditTech(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-[#2a2a2a] px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="محسن امامی برسری">محسن امامی برسری</option>
                    <option value="مرتضی قاسمعلی">مرتضی قاسمعلی</option>
                    <option value="بهمن کشاورز">بهمن کشاورز</option>
                    <option value="محمد حسن رحیمی زاده">محمد حسن رحیمی زاده</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={`${s.first} ${s.last}`}>
                        {s.first} {s.last}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 mb-1">قیمت نهایی سرویس (ریال)</label>
                  <input
                    type="text"
                    value={editAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setEditAmount(val ? Number(val).toLocaleString("en-US") : "");
                    }}
                    className="w-full rounded-lg border border-neutral-700 bg-[#2a2a2a] px-3 py-2 text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 mb-1">جمع مبلغ قطعه (ریال)</label>
                  <input
                    type="text"
                    value={editPartsAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setEditPartsAmount(val ? Number(val).toLocaleString("en-US") : "");
                    }}
                    className="w-full rounded-lg border border-neutral-700 bg-[#2a2a2a] px-3 py-2 text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 mb-1">تاخیر یا تعجیل</label>
                <select
                  value={editDelay}
                  onChange={(e) => setEditDelay(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-[#2a2a2a] px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="بموقع">بموقع</option>
                  <option value="۱ روز تاخیر">۱ روز تاخیر</option>
                  <option value="۲ روز تاخیر">۲ روز تاخیر</option>
                  <option value="۴ روز تاخیر">۴ روز تاخیر</option>
                  <option value="تعجیل در انجام">تعجیل در انجام</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-700">
              <button
                type="button"
                onClick={() => setEditingMonth(null)}
                className="rounded-lg border border-neutral-700 px-4 py-1.5 text-[12px] text-neutral-300 hover:bg-neutral-800"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveSingleEdit}
                className="rounded-lg bg-purple-600 px-5 py-1.5 text-[12px] font-semibold text-white hover:bg-purple-700 shadow"
              >
                {isMarkDoneMode ? "ثبت انجام سرویس" : "ذخیره تغییرات"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Unified Breakdown Modal */}
      <BreakdownModal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        title="ثبت خرابی جدید"
        onSave={(data) => {
          appStore.addContractBreakdown(contract.id, {
            status: "در انتظار تایید",
            declaredBy: contract.manager || "مدیر ساختمان",
            declareDate: data.declareDate,
            declareTime: data.declareTime,
            executionStatus: "در انتظار اعزام کارشناس",
            delayOrAdvance: "به موقع",
            technicians: data.technicians,
            partsAmount: 0,
            report: data.reason,
            description: data.description,
          });
          onShowToast("خرابی جدید با موفقیت ثبت گردید");
          setIsBreakdownModalOpen(false);
        }}
      />
    </div>
  );
}

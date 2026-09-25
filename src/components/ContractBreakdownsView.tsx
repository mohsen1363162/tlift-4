import { useState } from "react";
import {
  AlertCircle,
  Plus,
  ArrowRight,
  Search,
  Settings,
  RotateCw,
  FileText,
  ChevronDown,
  Pin,
  ChevronRight,
  ChevronLeft,
  X,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Contract } from "../data";
import BreakdownModal from "./BreakdownModal";
import {
  BreakdownItem,
  BreakdownStatus,
  appStore,
  useContractDetails,
  useStaff,
} from "../store";

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

interface ContractBreakdownsViewProps {
  t: ThemeProps;
  contract: Contract;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const fa = (n: string | number) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

const money = (n: number) => fa(n.toLocaleString("en-US")) + " ریال";

type FilterTab = "همه" | BreakdownStatus;

export default function ContractBreakdownsView({
  t,
  contract,
  onBack,
  onShowToast,
}: ContractBreakdownsViewProps) {
  const details = useContractDetails(contract.id);
  const staffList = useStaff();
  const breakdowns = details.breakdowns || [];

  // Filter & Search State
  const [activeTab, setActiveTab] = useState<FilterTab>("همه");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreStats, setShowMoreStats] = useState(false);

  // Modal State for New Breakdown
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BreakdownItem | null>(null);

  // Form Fields
  const [formStatus, setFormStatus] = useState<BreakdownStatus>("در انتظار تایید");
  const [formDeclaredBy, setFormDeclaredBy] = useState(
    contract.manager?.replace(/^\*\s*/, "") || "مدیر ساختمان"
  );
  const [formPhone, setFormPhone] = useState(contract.phone || "09121817744");
  const [formDeclareDate, setFormDeclareDate] = useState("1405/06/15");
  const [formDeclareTime, setFormDeclareTime] = useState("10:30");
  const [formExecutionStatus, setFormExecutionStatus] = useState("در انتظار اعزام کارشناس");
  const [formResolveDate, setFormResolveDate] = useState("");
  const [formDelayOrAdvance, setFormDelayOrAdvance] = useState("به موقع");
  const [formTechs, setFormTechs] = useState<string[]>(["محسن امامی برسری"]);
  const [formPartsAmount, setFormPartsAmount] = useState<string>("0");
  const [formReport, setFormReport] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Calculate Financial stats matching ContractView
  const totalMonthsAmount = details.months.filter((m) => m.done).reduce((acc, m) => acc + m.amount, 0);
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

  // Counts for tabs
  const counts = {
    همه: breakdowns.length,
    "انجام شده": breakdowns.filter((b) => b.status === "انجام شده").length,
    "انجام نشده": breakdowns.filter((b) => b.status === "انجام نشده").length,
    "باطل شده": breakdowns.filter((b) => b.status === "باطل شده").length,
    "دارای مغایرت": breakdowns.filter((b) => b.status === "دارای مغایرت").length,
    "در انتظار تایید": breakdowns.filter((b) => b.status === "در انتظار تایید").length,
  };

  // Filtered List
  const filteredBreakdowns = breakdowns.filter((item) => {
    if (activeTab !== "همه" && item.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      const matchDeclared = (item.declaredBy || "").toLowerCase().includes(q);
      const matchReport = (item.report || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      const matchTechs = item.technicians.some((t) => t.toLowerCase().includes(q));
      const matchStatus = item.status.toLowerCase().includes(q);
      const matchExec = (item.executionStatus || "").toLowerCase().includes(q);
      return (
        matchDeclared ||
        matchReport ||
        matchDesc ||
        matchTechs ||
        matchStatus ||
        matchExec
      );
    }
    return true;
  });

  const openNewBreakdown = () => {
    setEditingItem(null);
    setFormStatus("در انتظار تایید");
    setFormDeclaredBy(contract.manager?.replace(/^\*\s*/, "") || "مدیر ساختمان");
    setFormPhone(contract.phone || "09121817744");
    setFormDeclareDate("1405/06/15");
    setFormDeclareTime("10:30");
    setFormExecutionStatus("در انتظار اعزام کارشناس");
    setFormResolveDate("");
    setFormDelayOrAdvance("به موقع");
    setFormTechs(["محسن امامی برسری"]);
    setFormPartsAmount("0");
    setFormReport("");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const openEditBreakdown = (item: BreakdownItem) => {
    setEditingItem(item);
    setFormStatus(item.status);
    setFormDeclaredBy(item.declaredBy);
    setFormPhone(item.contactPhone || "");
    setFormDeclareDate(item.declareDate);
    setFormDeclareTime(item.declareTime || "10:00");
    setFormExecutionStatus(item.executionStatus);
    setFormResolveDate(item.resolveDate || "");
    setFormDelayOrAdvance(item.delayOrAdvance || "به موقع");
    setFormTechs(item.technicians || []);
    setFormPartsAmount(item.partsAmount ? item.partsAmount.toLocaleString("en-US") : "0");
    setFormReport(item.report || "");
    setFormDescription(item.description || "");
    setIsModalOpen(true);
  };

  const handleSaveBreakdown = () => {
    if (!formDeclaredBy.trim()) {
      onShowToast("لطفاً نام اعلام‌کننده را وارد کنید");
      return;
    }

    const cleanPartsAmount = parseInt(formPartsAmount.replace(/\D/g, ""), 10) || 0;

    if (editingItem) {
      appStore.updateContractBreakdown(contract.id, editingItem.id, {
        status: formStatus,
        declaredBy: formDeclaredBy.trim(),
        contactPhone: formPhone.trim(),
        declareDate: formDeclareDate.trim(),
        declareTime: formDeclareTime.trim(),
        executionStatus: formExecutionStatus.trim(),
        resolveDate: formResolveDate.trim() || undefined,
        delayOrAdvance: formDelayOrAdvance.trim(),
        technicians: formTechs.length > 0 ? formTechs : ["محسن امامی برسری"],
        partsAmount: cleanPartsAmount,
        report: formReport.trim(),
        description: formDescription.trim(),
      });
      onShowToast("خرابی با موفقیت ویرایش شد");
    } else {
      appStore.addContractBreakdown(contract.id, {
        status: formStatus,
        declaredBy: formDeclaredBy.trim(),
        contactPhone: formPhone.trim(),
        declareDate: formDeclareDate.trim(),
        declareTime: formDeclareTime.trim(),
        executionStatus: formExecutionStatus.trim(),
        resolveDate: formResolveDate.trim() || undefined,
        delayOrAdvance: formDelayOrAdvance.trim(),
        technicians: formTechs.length > 0 ? formTechs : ["محسن امامی برسری"],
        partsAmount: cleanPartsAmount,
        report: formReport.trim(),
        description: formDescription.trim(),
      });
      onShowToast("خرابی جدید با موفقیت ثبت گردید");
    }

    setIsModalOpen(false);
  };

  const handleDeleteBreakdown = (id: string) => {
    if (confirm("آیا از حذف این خرابی اطمینان دارید؟")) {
      appStore.deleteContractBreakdown(contract.id, id);
      onShowToast("خرابی مورد نظر حذف شد");
    }
  };

  const getStatusBadgeStyle = (status: BreakdownStatus) => {
    switch (status) {
      case "انجام شده":
        return "bg-emerald-950/60 border-emerald-700/60 text-emerald-400";
      case "انجام نشده":
        return "bg-rose-950/60 border-rose-700/60 text-rose-400";
      case "باطل شده":
        return "bg-red-950/40 border-red-800/60 text-red-300";
      case "دارای مغایرت":
        return "bg-amber-950/60 border-amber-700/60 text-amber-400";
      case "در انتظار تایید":
        return "bg-pink-950/60 border-pink-700/60 text-pink-300";
      default:
        return "bg-neutral-800 border-neutral-700 text-neutral-300";
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 font-[Tahoma,system-ui]">
      {/* 1. Top Stats Strip (Identical to ContractView / sshot-1.png & sshot-3.png) */}
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

      {/* Expand/Collapse Toggle */}
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
              <span>{contract.zone || "امام سجاد"}</span>
            </div>
            <div>
              <span className="text-neutral-500">آدرس ساختمان:</span>{" "}
              <span className="truncate">{contract.building}</span>
            </div>
            <div>
              <span className="text-neutral-500">تعداد سرویس‌های ثبت‌شده:</span>{" "}
              <span className="font-mono">{fa(details.months.length)}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Header Bar: Title and Return Button (Matching sshot-3.png) */}
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

        {/* Right: Title with exclamation circle icon */}
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-neutral-100">لیست خرابی ها</span>
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-400 text-neutral-300">
            <AlertCircle size={17} className="stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* Dashed separator (Matching sshot-3.png) */}
      <div className="my-2.5 border-b border-dashed border-neutral-700/60" />

      {/* 3. Controls & Filter Bar (Matching sshot-3.png and sshot-4.png) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search and Action Icons */}
        <div className="flex items-center gap-2">
          {/* Document / PDF Export */}
          <button
            type="button"
            onClick={() => onShowToast("دریافت خروجی گزارش خرابی‌ها")}
            title="خروجی و چاپ"
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-700 bg-[#232323] text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition"
          >
            <FileText size={15} />
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => onShowToast("لیست خرابی‌ها به‌روزرسانی شد")}
            title="تازه‌سازی لیست"
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-700 bg-[#232323] text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition"
          >
            <RotateCw size={14} />
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => onShowToast("تنظیمات نمایش ستون‌های جدول")}
            title="تنظیمات جدول"
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-700 bg-[#232323] text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition"
          >
            <Settings size={15} />
          </button>

          {/* Search Box */}
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

        {/* Right: Filter Status Pills and "ثبت خرابی" Button (Ordered right to left in RTL) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Button "ثبت خرابی" */}
          <button
            type="button"
            onClick={openNewBreakdown}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 text-[12px] font-semibold text-white shadow transition hover:bg-purple-700 active:scale-95"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>ثبت خرابی</span>
          </button>

          {/* Pill: همه */}
          <button
            type="button"
            onClick={() => setActiveTab("همه")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "همه"
                ? "border-purple-500 bg-[#2b2b2b] text-white ring-1 ring-purple-500/60"
                : "border-neutral-700/80 bg-[#1e1e1e] text-neutral-300 hover:bg-[#252525]"
            }`}
          >
            <span>همه</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-neutral-800 px-1 text-[10px] font-mono text-neutral-300 border border-neutral-700">
              {fa(counts["همه"])}
            </span>
          </button>

          {/* Pill: در انتظار تایید */}
          <button
            type="button"
            onClick={() => setActiveTab("در انتظار تایید")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "در انتظار تایید"
                ? "border-pink-500 bg-pink-950/40 text-pink-200 ring-1 ring-pink-500/60"
                : "border-pink-900/40 bg-pink-950/20 text-pink-300 hover:bg-pink-950/35"
            }`}
          >
            <span>در انتظار تایید</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink-900/60 px-1 text-[10px] font-mono text-pink-200 border border-pink-700/60">
              {fa(counts["در انتظار تایید"])}
            </span>
          </button>

          {/* Pill: دارای مغایرت */}
          <button
            type="button"
            onClick={() => setActiveTab("دارای مغایرت")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "دارای مغایرت"
                ? "border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500/60"
                : "border-amber-900/40 bg-amber-950/20 text-amber-300 hover:bg-amber-950/35"
            }`}
          >
            <span>دارای مغایرت</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-900/60 px-1 text-[10px] font-mono text-amber-200 border border-amber-700/60">
              {fa(counts["دارای مغایرت"])}
            </span>
          </button>

          {/* Pill: باطل شده */}
          <button
            type="button"
            onClick={() => setActiveTab("باطل شده")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "باطل شده"
                ? "border-red-500 bg-red-950/50 text-red-200 ring-1 ring-red-500/60"
                : "border-red-900/40 bg-red-950/20 text-red-300 hover:bg-red-950/35"
            }`}
          >
            <span>باطل شده</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-900/60 px-1 text-[10px] font-mono text-red-200 border border-red-700/60">
              {fa(counts["باطل شده"])}
            </span>
          </button>

          {/* Pill: انجام نشده */}
          <button
            type="button"
            onClick={() => setActiveTab("انجام نشده")}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-[11.5px] font-medium transition ${
              activeTab === "انجام نشده"
                ? "border-rose-500 bg-rose-950/50 text-rose-200 ring-1 ring-rose-500/60"
                : "border-rose-900/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/35"
            }`}
          >
            <span>انجام نشده</span>
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-900/60 px-1 text-[10px] font-mono text-rose-200 border border-rose-700/60">
              {fa(counts["انجام نشده"])}
            </span>
          </button>

          {/* Pill: انجام شده */}
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
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-800/80 px-1 text-[10px] font-mono text-emerald-100 border border-emerald-600/60">
              {fa(counts["انجام شده"])}
            </span>
          </button>
        </div>
      </div>

      {/* 4. Table Container (Matching sshot-3.png and sshot-4.png) */}
      <div className="mt-3 flex-1 overflow-x-auto rounded-xl border border-neutral-800 bg-[#1a1a1a] shadow">
        <table className="w-full text-right text-[11.5px] border-collapse min-w-[950px]">
          {/* Table Header */}
          <thead>
            <tr className="border-b border-neutral-800 bg-[#222] text-neutral-400 font-medium select-none">
              <th className="px-3 py-2.5 text-center w-12">ردیف</th>
              <th className="px-3 py-2.5 text-center w-28">وضعیت</th>
              <th className="px-3 py-2.5">سرویسکاران</th>
              <th className="px-3 py-2.5 text-center">تاریخ اعلام</th>
              <th className="px-3 py-2.5 text-center">وضعیت انجام</th>
              <th className="px-3 py-2.5 text-center">تاریخ رفع خرابی</th>
              <th className="px-3 py-2.5 text-center">تاخیر یا تعجیل</th>
              <th className="px-3 py-2.5">اعلام شده توسط</th>
              <th className="px-3 py-2.5 text-left">جمع مبلغ قطعه</th>
              <th className="px-3 py-2.5">گزارش</th>
              <th className="px-3 py-2.5">توضیحات</th>
              <th className="px-3 py-2.5 text-center w-16">عملیات</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredBreakdowns.length === 0 ? (
              /* Empty State (Matching sshot-3.png & sshot-4.png) */
              <tr>
                <td colSpan={12} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    {/* Empty In-Tray Graphic with Speech Bubble */}
                    <div className="relative flex items-center justify-center text-neutral-600">
                      {/* Document Inbox Tray */}
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
                      {/* Speech Bubble floating over */}
                      <div className="absolute -top-1.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#333] border border-neutral-600 text-neutral-400 shadow">
                        <span className="text-[10px] leading-none">•••</span>
                      </div>
                    </div>

                    {/* Text */}
                    <span className="text-[13px] font-medium text-neutral-400">
                      لیست خالی می باشد
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBreakdowns.map((item, idx) => (
                <tr
                  key={item.id}
                  className="border-b border-neutral-850 hover:bg-neutral-800/40 transition group text-neutral-200"
                >
                  {/* ردیف */}
                  <td className="px-3 py-3 text-center font-mono text-neutral-400">
                    {fa(idx + 1)}
                  </td>

                  {/* وضعیت */}
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium ${getStatusBadgeStyle(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  {/* سرویسکاران */}
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.technicians.map((t, i) => (
                        <span
                          key={i}
                          className="rounded bg-neutral-800 px-1.5 py-0.5 text-[11px] text-neutral-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* تاریخ اعلام */}
                  <td className="px-3 py-3 text-center font-mono text-neutral-300">
                    {fa(item.declareDate)}
                    {item.declareTime && (
                      <span className="block text-[10px] text-neutral-500">
                        ساعت {fa(item.declareTime)}
                      </span>
                    )}
                  </td>

                  {/* وضعیت انجام */}
                  <td className="px-3 py-3 text-center text-neutral-300">
                    <span className="rounded bg-neutral-800/80 px-2 py-0.5 text-[11px]">
                      {item.executionStatus || "در دست اقدام"}
                    </span>
                  </td>

                  {/* تاریخ رفع خرابی */}
                  <td className="px-3 py-3 text-center font-mono text-neutral-400">
                    {item.resolveDate ? fa(item.resolveDate) : "—"}
                  </td>

                  {/* تاخیر یا تعجیل */}
                  <td className="px-3 py-3 text-center text-neutral-300">
                    <span
                      className={`text-[11px] ${
                        item.delayOrAdvance?.includes("تاخیر")
                          ? "text-rose-400"
                          : item.delayOrAdvance?.includes("به موقع")
                          ? "text-emerald-400"
                          : "text-neutral-300"
                      }`}
                    >
                      {item.delayOrAdvance || "به موقع"}
                    </span>
                  </td>

                  {/* اعلام شده توسط */}
                  <td className="px-3 py-3 font-medium text-neutral-200">
                    <div>{item.declaredBy}</div>
                    {item.contactPhone && (
                      <div className="text-[10px] font-mono text-neutral-500">
                        {fa(item.contactPhone)}
                      </div>
                    )}
                  </td>

                  {/* جمع مبلغ قطعه */}
                  <td className="px-3 py-3 text-left font-mono font-medium text-neutral-200">
                    {item.partsAmount > 0 ? money(item.partsAmount) : "۰ ریال"}
                  </td>

                  {/* گزارش */}
                  <td className="px-3 py-3 text-neutral-300 max-w-[200px]">
                    <div className="truncate" title={item.report}>
                      {item.report || "—"}
                    </div>
                  </td>

                  {/* توضیحات */}
                  <td className="px-3 py-3 text-neutral-400 max-w-[150px]">
                    <div className="truncate" title={item.description}>
                      {item.description || "—"}
                    </div>
                  </td>

                  {/* عملیات */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditBreakdown(item)}
                        title="ویرایش خرابی"
                        className="rounded p-1 text-neutral-400 hover:text-white hover:bg-neutral-700 transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBreakdown(item.id)}
                        title="حذف خرابی"
                        className="rounded p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Bottom Pagination & Footer Bar (Matching sshot-3.png) */}
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
              disabled={filteredBreakdowns.length <= pageSize}
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
          {filteredBreakdowns.length === 0
            ? "موردی پیدا نشد!"
            : `نمایش ${fa(filteredBreakdowns.length)} مورد`}
        </div>
      </div>

      {/* 6. Register / Edit Breakdown Modal */}
      <BreakdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "ویرایش اطلاعات خرابی" : "ثبت خرابی جدید"}
        initialData={
          editingItem
            ? {
                declareDate: editingItem.declareDate,
                declareTime: editingItem.declareTime || "10:30",
                reason: editingItem.report || "توقف بین طبقات",
                description: editingItem.description || "",
                technicians: editingItem.technicians,
              }
            : undefined
        }
        onSave={(data) => {
          if (editingItem) {
            appStore.updateContractBreakdown(contract.id, editingItem.id, {
              declareDate: data.declareDate,
              declareTime: data.declareTime,
              report: data.reason,
              description: data.description,
              technicians: data.technicians,
            });
            onShowToast("خرابی با موفقیت ویرایش شد");
          } else {
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
          }
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Lightbulb,
  CalendarDays,
  FileText,
  User,
  Printer,
  Edit3,
  MoreVertical,
  Menu,
  Search,
  Settings,
  RotateCw,
  FileDown,
  FileSpreadsheet,
  Inbox,
  FolderOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Building2,
  Phone,
  Save,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { Theme } from "../theme";
import type { Contract } from "../data";
import {
  MonthService,
  ServiceChecklistStatus,
  useChecklist,
  useChecklistCategories,
  appStore,
} from "../store";
import PartsManagementModal, { ServicePartData } from "./PartsManagementModal";

interface ServiceReportViewProps {
  t: Theme;
  contract: Contract;
  monthService: MonthService;
  onShowToast: (msg: string) => void;
  onClose?: () => void;
}

export default function ServiceReportView({
  t,
  contract,
  monthService,
  onShowToast,
  onClose,
}: ServiceReportViewProps) {
  const checklist = useChecklist();
  const allCategories = useChecklistCategories();

  // Local state for MonthService to allow live edits
  const [service, setService] = useState<MonthService>(() => ({
    ...monthService,
    serviceNo: monthService.serviceNo || "774917",
    plannedDate: monthService.plannedDate || "۱۴۰۵/۰۳/۲۶",
    date: monthService.date || "۱۴۰۵/۰۳/۲۸",
    buildingName: monthService.buildingName || contract.building || "حسینی فر چهاراه پادگان",
    deviceNo: monthService.deviceNo || "1",
    report:
      monthService.report ||
      `سرویس آسانسور ${monthService.m} ${monthService.y} انجام شد`,
    techs:
      monthService.techs && monthService.techs.length > 0
        ? monthService.techs
        : [
            "محسن امامی برسری",
            "مرتضی قاسمعلی",
            "محمد حسن رحیمی زاده",
            "بهمن کشاورز",
            "میثم سهرابی",
            "مجتبی فرهمند",
          ],
    reminder: monthService.reminder || "-",
    customerFollowup: monthService.customerFollowup || "-",
    trip: monthService.trip ?? 0,
    wage: monthService.wage ?? 0,
    partsAmount: monthService.partsAmount ?? 0,
    discount: monthService.discount ?? 0,
    tax: monthService.tax ?? 0,
    checklistResults: monthService.checklistResults || {},
    partsList: monthService.partsList || [],
    attachments: monthService.attachments || [],
  }));

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [partsSearch, setPartsSearch] = useState("");

  // Category ordering matching screenshots sshot-6, 7, 8, 9
  const displayCategoryOrder = [
    "چاله آسانسور",
    "داخل چاه",
    "داخل کابین",
    "روی کابین",
    "طبقات",
    "موتور خانه",
  ];

  // Helper for Persian formatted numbers
  const fa = (n: string | number) =>
    String(n)
      .replace(/0/g, "۰")
      .replace(/1/g, "۱")
      .replace(/2/g, "۲")
      .replace(/3/g, "۳")
      .replace(/4/g, "۴")
      .replace(/5/g, "۵")
      .replace(/6/g, "۶")
      .replace(/7/g, "۷")
      .replace(/8/g, "۸")
      .replace(/9/g, "۹");

  const money = (n: number) => fa(n.toLocaleString("en-US")) + " ریال";

  // Toggle checklist status on item click
  const handleToggleChecklist = (itemId: number) => {
    const current = service.checklistResults?.[itemId] || "ok";
    let next: ServiceChecklistStatus = "ok";
    if (current === "ok") next = "fault";
    else if (current === "fault") next = "na";
    else next = "ok";

    const updatedChecklist = {
      ...(service.checklistResults || {}),
      [itemId]: next,
    };

    const updated = { ...service, checklistResults: updatedChecklist };
    setService(updated);
    appStore.updateMonthService(contract.id, service.id, updated);
    onShowToast(`وضعیت ردیف ${itemId} تغییر کرد`);
  };

  // Technicians formatted string
  const techsText = service.techs?.join("، ") || "محسن امامی برسری";

  // Filtered Parts
  const filteredParts = useMemo(() => {
    if (!service.partsList) return [];
    if (!partsSearch.trim()) return service.partsList;
    return service.partsList.filter((p) =>
      p.name.toLowerCase().includes(partsSearch.trim().toLowerCase())
    );
  }, [service.partsList, partsSearch]);

  // Edit modal state
  const [editReportText, setEditReportText] = useState(service.report || "");
  const [editTechsText, setEditTechsText] = useState(techsText);
  const [editDate, setEditDate] = useState(service.date || "");
  const [editPlannedDate, setEditPlannedDate] = useState(service.plannedDate || "");
  const [editWage, setEditWage] = useState(service.wage || 0);
  const [editTrip, setEditTrip] = useState(service.trip || 0);
  const [editDiscount, setEditDiscount] = useState(service.discount || 0);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTechs = editTechsText
      .split(/[،,]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const updated: MonthService = {
      ...service,
      report: editReportText,
      techs: updatedTechs,
      date: editDate,
      plannedDate: editPlannedDate,
      wage: Number(editWage),
      trip: Number(editTrip),
      discount: Number(editDiscount),
    };

    setService(updated);
    appStore.updateMonthService(contract.id, service.id, updated);
    setShowEditModal(false);
    onShowToast("اطلاعات گزارش سرویس با موفقیت ذخیره شد");
  };

  return (
    <div
      dir="rtl"
      className={`min-h-full w-full select-text p-4 md:p-6 ${
        t.dark ? "bg-[#141414] text-neutral-200" : "bg-[#f4f5f7] text-neutral-800"
      }`}
    >
      {/* 1. TOP HEADER (Matching sshot-4.png) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-neutral-700/50">
        {/* Right side: Title & Metadata */}
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
              <ShieldCheck size={20} className="text-purple-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              اطلاعات سرویس {fa(service.plannedDate || "۱۴۰۵/۰۳/۲۶")}
            </h1>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={14} className="text-purple-400" />
              <span>شماره سرویس {fa(service.serviceNo || "۷۷۴۹۱۷")}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-neutral-400" />
              <span>تاریخ انجام {fa(service.date || "۱۴۰۵/۰۳/۲۸")}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <FileText size={14} className="text-neutral-400" />
              <span>شماره قرارداد {fa(contract.no || "۵۴۷۵")}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <User size={14} className="text-neutral-400" />
              <span>مشتری {contract.manager || contract.building || "* حسینی فر"}</span>
            </div>
          </div>
        </div>

        {/* Left side: Buttons (Matching sshot-18.png) */}
        <div className="flex items-center gap-2">
          {/* Print Factor button */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#322c3e] px-3.5 text-xs font-medium text-purple-200 border border-purple-900/40 shadow-sm transition hover:bg-[#3b3449] active:scale-95"
          >
            <Printer size={14} className="text-purple-300" />
            <span>چاپ فاکتور سرویس</span>
          </button>

          {/* Edit button */}
          <button
            type="button"
            onClick={() => {
              setEditReportText(service.report || "");
              setEditTechsText(techsText);
              setEditDate(service.date || "");
              setEditPlannedDate(service.plannedDate || "");
              setEditWage(service.wage || 0);
              setEditTrip(service.trip || 0);
              setEditDiscount(service.discount || 0);
              setShowEditModal(true);
            }}
            className="flex h-8 items-center gap-1.5 px-2 text-xs text-neutral-300 transition hover:text-white"
          >
            <Edit3 size={13} />
            <span>ویرایش</span>
          </button>

          {/* More options button */}
          <button
            type="button"
            className="flex h-8 w-7 items-center justify-center text-neutral-400 transition hover:text-white"
          >
            <MoreVertical size={16} />
          </button>

          {/* Hamburger menu button */}
          <button
            type="button"
            className="flex h-8 w-7 items-center justify-center text-neutral-400 transition hover:text-white"
          >
            <Menu size={16} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ms-1.5 flex h-8 items-center gap-1.5 rounded-md bg-rose-500/20 px-3 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition active:scale-95"
              title="بستن پنجره"
            >
              <X size={14} />
              <span>بستن پنجره</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN TABLE CARD: مشخصات سرویس (Matching sshot-4.png) */}
      <div
        className={`mb-6 overflow-hidden rounded-xl border shadow-sm ${
          t.dark ? "border-[#282828] bg-[#1a1a1a]" : "border-neutral-200 bg-white"
        }`}
      >
        <div className="divide-y divide-neutral-800/60 text-xs">
          {/* Row 1: دستگاه */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">دستگاه</span>
            <span className="font-mono font-medium text-neutral-100">{fa(service.deviceNo || "1")}</span>
          </div>

          {/* Row 2: نام ساختمان */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">نام ساختمان</span>
            <span className="font-medium text-neutral-100">
              {service.buildingName || contract.building || "حسینی فر چهاراه پادگان"}
            </span>
          </div>

          {/* Row 3: گزارش سرویس */}
          <div className="flex items-start justify-between px-5 py-3">
            <span className="text-neutral-400 shrink-0">گزارش سرویس</span>
            <span className="text-left font-medium text-neutral-100 max-w-2xl leading-relaxed">
              {service.report || `سرویس آسانسور ${service.m} ${service.y} انجام شد`}
            </span>
          </div>

          {/* Row 4: نام سرویسکار */}
          <div className="flex items-start justify-between px-5 py-3">
            <span className="text-neutral-400 shrink-0">نام سرویسکار</span>
            <span className="text-left font-medium text-neutral-200 max-w-2xl leading-relaxed">
              {techsText}
            </span>
          </div>

          {/* Row 5: یادآوری سرویس بعدی */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">یادآوری سرویس بعدی</span>
            <span className="text-neutral-400">{service.reminder || "-"}</span>
          </div>

          {/* Row 6: پیگیری مشتری */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">پیگیری مشتری</span>
            <span className="text-neutral-400">{service.customerFollowup || "-"}</span>
          </div>

          {/* Row 7: تاریخ برنامه ریزی شده */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">تاریخ برنامه ریزی شده</span>
            <span className="font-mono font-medium text-neutral-100">{fa(service.plannedDate || "۱۴۰۵/۰۳/۲۶")}</span>
          </div>

          {/* Row 8: هزینه ایاب و ذهاب */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">هزینه ایاب و ذهاب</span>
            <span className="font-mono text-neutral-300">{money(service.trip || 0)}</span>
          </div>

          {/* Row 9: دستمزد */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">دستمزد</span>
            <span className="font-mono text-neutral-300">{money(service.wage || 0)}</span>
          </div>

          {/* Row 10: جمع هزینه قطعات */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">جمع هزینه قطعات</span>
            <span className="font-mono text-neutral-300">{money(service.partsAmount || 0)}</span>
          </div>

          {/* Row 11: تخفیف */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">تخفیف</span>
            <span className="font-mono text-neutral-300">{money(service.discount || 0)}</span>
          </div>

          {/* Row 12: مالیات */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">مالیات</span>
            <span className="font-mono text-neutral-300">{money(service.tax || 0)}</span>
          </div>

          {/* Row 13: مجموع */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">مجموع</span>
            <span className="font-mono text-neutral-300">{money(0)}</span>
          </div>

          {/* Row 14: مبلغ سرویس ماهیانه */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-neutral-400">مبلغ سرویس ماهیانه</span>
            <span className="font-mono text-neutral-300">{money(0)}</span>
          </div>
        </div>
      </div>

      {/* 3. SECOND CARD: قطعات مصرفی (Matching sshot-5.png) */}
      <div
        className={`mb-6 overflow-hidden rounded-xl border shadow-sm ${
          t.dark ? "border-[#282828] bg-[#1a1a1a]" : "border-neutral-200 bg-white"
        }`}
      >
        {/* Header bar of parts */}
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b p-3.5 ${t.dark ? "border-[#282828] bg-[#1d1d1d]" : "border-neutral-200 bg-neutral-50"}`}>
          {/* Right side: Badge with count */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-200">قطعات مصرفی</span>
            <span className="flex h-5 w-6 items-center justify-center rounded-full bg-neutral-700/60 text-[11px] font-bold text-neutral-300">
              {fa(service.partsList?.length || 0)}
            </span>
          </div>

          {/* Left tools: Search, Settings, Refresh, PDF, Excel */}
          <div className="flex items-center gap-2">
            <div className={`flex h-7 w-56 items-center gap-2 rounded border px-2.5 text-xs transition ${
              t.dark ? "border-[#333] bg-[#222] text-neutral-200" : "border-neutral-300 bg-white text-neutral-800"
            }`}>
              <Search size={12} className="text-neutral-400" />
              <input
                type="text"
                value={partsSearch}
                onChange={(e) => setPartsSearch(e.target.value)}
                placeholder="جستجو خودکار با بیش از 2 کاراکتر"
                className="w-full bg-transparent text-[11px] outline-none placeholder:text-neutral-500"
              />
            </div>

            <button type="button" title="تنظیمات جدول" className="rounded p-1.5 text-neutral-400 hover:text-neutral-200">
              <Settings size={14} />
            </button>
            <button type="button" title="تازه‌سازی" className="rounded p-1.5 text-neutral-400 hover:text-neutral-200">
              <RotateCw size={14} />
            </button>
            <button type="button" title="خروجی PDF" className="rounded p-1.5 text-neutral-400 hover:text-purple-400">
              <FileDown size={14} />
            </button>
            <button type="button" title="خروجی Excel" className="rounded p-1.5 text-neutral-400 hover:text-emerald-400">
              <FileSpreadsheet size={14} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        {filteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
            <Inbox size={48} className="mb-2 stroke-1 text-neutral-600" />
            <p className="text-xs">لیست خالی می باشد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead>
                <tr className={`border-b text-center ${t.dark ? "border-[#2b2b2b] bg-[#202020] text-neutral-400" : "border-neutral-200 bg-neutral-100 text-neutral-600"}`}>
                  <th className="py-2.5 px-3 w-12 text-center">ردیف</th>
                  <th className="py-2.5 px-3">عنوان</th>
                  <th className="py-2.5 px-3 text-center">تعداد</th>
                  <th className="py-2.5 px-3 text-center">قیمت</th>
                  <th className="py-2.5 px-3 text-center">تخفیف</th>
                  <th className="py-2.5 px-3 text-center">رسمی</th>
                  <th className="py-2.5 px-3 text-center">مالیات</th>
                  <th className="py-2.5 px-3 text-center">قیمت کل</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.map((part, idx) => (
                  <tr key={idx} className="border-b border-neutral-800 text-center">
                    <td className="py-2.5 px-3 text-neutral-500 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-200 font-medium">{part.name}</td>
                    <td className="py-2.5 px-3 text-neutral-300 font-mono">{fa(part.qty)}</td>
                    <td className="py-2.5 px-3 text-neutral-300 font-mono">{fa(part.price.toLocaleString())}</td>
                    <td className="py-2.5 px-3 text-neutral-400">۰</td>
                    <td className="py-2.5 px-3 text-neutral-400">خیر</td>
                    <td className="py-2.5 px-3 text-neutral-400">۰</td>
                    <td className="py-2.5 px-3 text-neutral-200 font-mono font-medium">
                      {fa((part.qty * part.price).toLocaleString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info (matching sshot-5.png) */}
        <div className={`flex items-center justify-between border-t px-4 py-2 text-[11px] text-neutral-500 ${t.dark ? "border-[#262626] bg-[#171717]" : "border-neutral-200 bg-neutral-50"}`}>
          <div className="flex items-center gap-2">
            <span>20 / صفحه</span>
            <span>{"< 1 >"}</span>
          </div>
          <div>{filteredParts.length === 0 ? "موردی پیدا نشد!" : `${fa(filteredParts.length)} مورد`}</div>
        </div>
      </div>

      {/* 4. THIRD CARD: فایل‌ها و پیوست‌ها (Matching sshot-5.png) */}
      <div
        className={`mb-6 overflow-hidden rounded-xl border p-8 shadow-sm text-center ${
          t.dark ? "border-[#282828] bg-[#1a1a1a]" : "border-neutral-200 bg-white"
        }`}
      >
        <div className="flex flex-col items-center justify-center text-neutral-500">
          <FolderOpen size={44} className="mb-2 stroke-1 text-neutral-600" />
          <p className="text-xs">فایلی برای نمایش وجود ندارد</p>
        </div>
      </div>

      {/* 5. FOURTH CARD: چک لیست‌های بازرسی انجام شده (Matching sshot-6.png, 7, 8, 9) */}
      <div className="space-y-6">
        {displayCategoryOrder.map((catName) => {
          const categoryItems = checklist.filter((item) => item.category === catName);
          if (categoryItems.length === 0) return null;

          return (
            <div key={catName}>
              {/* Category Header */}
              <div className="mb-2 px-1">
                <h3 className="text-sm font-semibold text-neutral-200">{catName}</h3>
              </div>

              {/* Items Card */}
              <div
                className={`overflow-hidden rounded-xl border shadow-sm divide-y ${
                  t.dark ? "border-[#282828] bg-[#1a1a1a] divide-[#242424]" : "border-neutral-200 bg-white divide-neutral-100"
                }`}
              >
                {categoryItems.map((item) => {
                  const status = service.checklistResults?.[item.id] || "ok";

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-5 py-3.5 transition hover:bg-white/[0.015]"
                    >
                      {/* Right (First in RTL): Question text */}
                      <span className="text-xs text-neutral-200 font-normal leading-relaxed text-right">
                        {item.question}
                      </span>

                      {/* Left (Second in RTL): Status Badge */}
                      <button
                        type="button"
                        onClick={() => handleToggleChecklist(item.id)}
                        title="برای تغییر وضعیت کلیک کنید"
                        className="flex items-center gap-1 text-xs font-medium transition active:scale-95 shrink-0"
                      >
                        {status === "ok" ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300">
                            <span>سالم</span>
                            <span className="font-bold text-[13px]">✓</span>
                          </span>
                        ) : status === "fault" ? (
                          <span className="flex items-center gap-1.5 text-rose-500 hover:text-rose-400">
                            <span>معیوب</span>
                            <XCircle size={13} />
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300">
                            <span>عدم دسترسی / بررسی</span>
                            <AlertCircle size={13} />
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-xl border p-5 shadow-2xl ${
              t.dark ? "border-[#383838] bg-[#1f1f1f] text-neutral-100" : "border-neutral-200 bg-white text-neutral-900"
            }`}
          >
            <div className="mb-4 flex items-center justify-between border-b pb-3 border-neutral-700/50">
              <h3 className="text-sm font-bold text-purple-400">ویرایش اطلاعات گزارش سرویس</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded p-1 text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block text-neutral-400">متن گزارش سرویس:</label>
                <textarea
                  rows={2}
                  value={editReportText}
                  onChange={(e) => setEditReportText(e.target.value)}
                  className={`w-full rounded-md border p-2 text-xs outline-none ${
                    t.dark ? "border-[#333] bg-[#181818] text-white focus:border-purple-500" : "border-neutral-300 bg-neutral-50"
                  }`}
                />
              </div>

              <div>
                <label className="mb-1 block text-neutral-400">اسامی تکنسین‌ها (با کاما جدا کنید):</label>
                <input
                  type="text"
                  value={editTechsText}
                  onChange={(e) => setEditTechsText(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-xs outline-none ${
                    t.dark ? "border-[#333] bg-[#181818] text-white focus:border-purple-500" : "border-neutral-300 bg-neutral-50"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-neutral-400">تاریخ برنامه‌ریزی شده:</label>
                  <input
                    type="text"
                    value={editPlannedDate}
                    onChange={(e) => setEditPlannedDate(e.target.value)}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs outline-none font-mono ${
                      t.dark ? "border-[#333] bg-[#181818] text-white focus:border-purple-500" : "border-neutral-300 bg-neutral-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-neutral-400">تاریخ انجام سرویس:</label>
                  <input
                    type="text"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs outline-none font-mono ${
                      t.dark ? "border-[#333] bg-[#181818] text-white focus:border-purple-500" : "border-neutral-300 bg-neutral-50"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-neutral-400">ایاب و ذهاب (ریال):</label>
                  <input
                    type="number"
                    value={editTrip}
                    onChange={(e) => setEditTrip(Number(e.target.value))}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs outline-none font-mono ${
                      t.dark ? "border-[#333] bg-[#181818] text-white" : "border-neutral-300 bg-neutral-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-neutral-400">دستمزد (ریال):</label>
                  <input
                    type="number"
                    value={editWage}
                    onChange={(e) => setEditWage(Number(e.target.value))}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs outline-none font-mono ${
                      t.dark ? "border-[#333] bg-[#181818] text-white" : "border-neutral-300 bg-neutral-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-neutral-400">تخفیف (ریال):</label>
                  <input
                    type="number"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(Number(e.target.value))}
                    className={`w-full rounded-md border px-3 py-1.5 text-xs outline-none font-mono ${
                      t.dark ? "border-[#333] bg-[#181818] text-white" : "border-neutral-300 bg-neutral-50"
                    }`}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-neutral-700/50">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded px-3.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  <Save size={13} />
                  <span>ذخیره تغییرات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT FACTOR MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white text-neutral-900 shadow-2xl">
            {/* Modal top toolbar */}
            <div className="flex items-center justify-between border-b px-5 py-3 text-neutral-700">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-purple-600" />
                <h3 className="text-sm font-bold">پیش‌نمایش چاپ فاکتور سرویس آسانسور</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  <Printer size={13} />
                  <span>پرینت نهایی</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="rounded p-1 text-neutral-400 hover:text-neutral-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* A4 Factor Body */}
            <div className="flex-1 overflow-y-auto p-8 text-xs font-sans" dir="rtl">
              <div className="rounded-lg border border-neutral-300 p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900">فاکتور و صورتجلسه رسمی سرویس دوره‌ای آسانسور</h2>
                    <p className="text-[11px] text-neutral-500 mt-1">سامانه تخصصی مدیریت خدمات آسانسور و بالابر</p>
                  </div>
                  <div className="text-left font-mono text-[11px] space-y-1">
                    <div>شماره سرویس: <strong>{service.serviceNo || "774917"}</strong></div>
                    <div>شماره قرارداد: <strong>{contract.no || "5475"}</strong></div>
                    <div>تاریخ سرویس: <strong>{service.date || "1405/03/28"}</strong></div>
                  </div>
                </div>

                {/* Building and Customer */}
                <div className="grid grid-cols-2 gap-4 rounded bg-neutral-50 p-3 border border-neutral-200 text-[11.5px]">
                  <div>
                    <span className="text-neutral-500">مشتری / کارفرما: </span>
                    <strong className="text-neutral-900">{contract.manager || "حسینی فر"}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500">نام ساختمان: </span>
                    <strong className="text-neutral-900">{contract.building || "حسینی فر چهاراه پادگان"}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-neutral-500">آدرس: </span>
                    <span className="text-neutral-800">{contract.address || "قزوین چهار راه پادگان نبش کوچه متانت"}</span>
                  </div>
                </div>

                {/* Service report statement */}
                <div className="rounded border border-neutral-200 p-3">
                  <div className="text-[11.5px] font-bold text-neutral-800 mb-1">شرح عملیات انجام شده:</div>
                  <p className="text-neutral-700 leading-relaxed text-[11px]">
                    {service.report || `سرویس آسانسور خرداد 1405 انجام شد و کلیه ۳۸ آیتم چک‌لیست استانداردهای عملکردی، ایمنی موتورخانه، چاه، کابین و درب‌ها کنترل گردید.`}
                  </p>
                  <div className="mt-2 text-[10.5px] text-neutral-600">
                    تکنسین‌های مجری: {techsText}
                  </div>
                </div>

                {/* Financial Summary */}
                <table className="w-full border-collapse border border-neutral-300 text-center text-[11px]">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-neutral-300 py-1.5 px-2">شرح</th>
                      <th className="border border-neutral-300 py-1.5 px-2 w-36">مبلغ (ریال)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-neutral-300 py-1.5 px-3 text-right">حق سرویس و نگهداری ماهیانه</td>
                      <td className="border border-neutral-300 py-1.5 px-2 font-mono">{money(service.amount || 0)}</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-300 py-1.5 px-3 text-right">قطعات مصرفی و تعویضی</td>
                      <td className="border border-neutral-300 py-1.5 px-2 font-mono">{money(service.partsAmount || 0)}</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-300 py-1.5 px-3 text-right">اجرت و دستمزد خدمات مازاد</td>
                      <td className="border border-neutral-300 py-1.5 px-2 font-mono">{money(service.wage || 0)}</td>
                    </tr>
                    <tr>
                      <td className="border border-neutral-300 py-1.5 px-3 text-right">ایاب و ذهاب</td>
                      <td className="border border-neutral-300 py-1.5 px-2 font-mono">{money(service.trip || 0)}</td>
                    </tr>
                    <tr className="bg-neutral-50 font-bold">
                      <td className="border border-neutral-300 py-2 px-3 text-right text-neutral-900">مجموع قابل پرداخت</td>
                      <td className="border border-neutral-300 py-2 px-2 font-mono text-purple-700">
                        {money((service.amount || 0) + (service.partsAmount || 0) + (service.wage || 0) + (service.trip || 0) - (service.discount || 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Signatures */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center text-[11px] pt-6 border-t">
                  <div>
                    <p className="font-bold">امضای سرویسکار مجری</p>
                    <div className="mt-10 text-neutral-400">..............................</div>
                  </div>
                  <div>
                    <p className="font-bold">امضا و تایید مدیر ساختمان</p>
                    <div className="mt-10 text-neutral-400">..............................</div>
                  </div>
                  <div>
                    <p className="font-bold">مهر شرکت</p>
                    <div className="mt-10 text-neutral-400">..............................</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

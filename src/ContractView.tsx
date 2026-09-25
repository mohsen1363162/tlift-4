import { useState, useEffect, useRef } from "react";
import {
  Pin,
  ChevronDown,
  Trash2,
  Printer,
  FileText,
  Paperclip,
  Wallet,
  Building2,
  Plus,
  Pencil,
  ShieldCheck,
  PlayCircle,
  Users,
  UserCheck,
  Files,
  Grid2X2,
  List,
  CalendarDays,
  Wrench,
  ClipboardList,
  AlertTriangle,
  FileCheck2,
  Bell,
  Umbrella,
  History,
  Ban,
  Trash,
  Package,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Zap,
  ArrowDownCircle,
  Receipt,
  RotateCcw,
  X,
  Clock,
  User,
  Sparkles,
  Info,
  Check,
  MoreVertical,
} from "lucide-react";
import type { Theme } from "./theme";
import { Contract } from "./data";
import ServiceForm from "./ServiceForm";
import ContractRibbonBar from "./components/ContractRibbonBar";
import ServiceReportView from "./components/ServiceReportView";
import { ContractPaymentsView } from "./components/ContractPaymentsView";
import ContractBreakdownsView from "./components/ContractBreakdownsView";
import ContractServicesListView from "./components/ContractServicesListView";
import BreakdownModal from "./components/BreakdownModal";
import { Field, inputCls, SearchSelect, DatePicker } from "./ui";
import { appStore, useContractDetails, MonthService, PaymentRecord, Invoice } from "./store";

const fa = (n: string | number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function ContractView({
  t,
  contract,
  initialSubView = "overview",
  onOpenServiceReport,
}: {
  t: Theme;
  contract: Contract;
  initialSubView?: "overview" | "payments" | "breakdowns" | "services";
  onOpenServiceReport?: (monthService: MonthService, contract: Contract) => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const [subView, setSubView] = useState<"overview" | "payments" | "breakdowns" | "services">(initialSubView);

  const details = useContractDetails(contract.id);
  const { months, payments, invoices } = details;
  const breakdowns = details.breakdowns || [];

  // Selected Month State for Summary Card
  const [selectedMonthId, setSelectedMonthId] = useState<number>(() => {
    const firstDone = months.find((m) => m.done);
    return firstDone ? firstDone.id : months[0]?.id || 1;
  });
  const [serviceReportModalMonth, setServiceReportModalMonth] = useState<MonthService | null>(null);

  // Quick Pay Modal State
  const [quickPayModalMonth, setQuickPayModalMonth] = useState<MonthService | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState<string>("8,500,000");
  const [quickPayDate, setQuickPayDate] = useState<string>("1405/06/24");
  const [quickPayMethod, setQuickPayMethod] = useState<string>("کارت به کارت");
  const [quickPayRef, setQuickPayRef] = useState<string>("");

  // Floating Quick-View Popover State (پنجره نمای سریع سرویس طبق تصویر ارسالی)
  const [quickViewMonth, setQuickViewMonth] = useState<MonthService | null>(null);
  const [quickViewPos, setQuickViewPos] = useState<{ top: number; left: number } | null>(null);
  const quickViewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const openQuickView = (s: MonthService, targetEl: HTMLElement) => {
    if (quickViewTimerRef.current) clearTimeout(quickViewTimerRef.current);
    const rect = targetEl.getBoundingClientRect();
    const popoverWidth = Math.min(580, window.innerWidth - 24);
    const popoverHeight = 440;

    // Position vertically above the card:
    let top = rect.top - popoverHeight - 10;
    // If not enough room on top, place below the card
    if (top < 12) {
      top = Math.max(12, rect.bottom + 8);
    }
    // If still off bottom of screen, clamp within viewport
    if (top + popoverHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - popoverHeight - 12);
    }

    // Position horizontally centered on the card:
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    if (left + popoverWidth > window.innerWidth - 14) {
      left = window.innerWidth - popoverWidth - 14;
    }
    if (left < 14) {
      left = 14;
    }

    setQuickViewPos({ top, left });
    setQuickViewMonth(s);
  };

  const scheduleCloseQuickView = () => {
    if (quickViewTimerRef.current) clearTimeout(quickViewTimerRef.current);
    quickViewTimerRef.current = setTimeout(() => {
      setQuickViewMonth(null);
    }, 280);
  };

  const cancelCloseQuickView = () => {
    if (quickViewTimerRef.current) clearTimeout(quickViewTimerRef.current);
  };

  const [serviceIdx, setServiceIdx] = useState<number | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  // Keep selectedMonthId valid
  useEffect(() => {
    if (months.length > 0 && !months.some((m) => m.id === selectedMonthId)) {
      setSelectedMonthId(months[0].id);
    }
  }, [months, selectedMonthId]);

  // Financial Calculations
  const baseContractPayable = months.filter((m) => m.done).reduce((acc, m) => acc + m.amount, 0);
  const extraInvoicesAmount = invoices.reduce((acc, i) => acc + i.amount, 0);
  const totalPayable = baseContractPayable + extraInvoicesAmount;
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const debt = Math.max(0, totalPayable - totalPaid);

  const money = (n: number) => fa(n.toLocaleString("en-US")) + " ریال";

  const stats = [
    ["شماره قرارداد", fa(contract.no)],
    ["جمع مبلغ قابل پرداخت", money(totalPayable)],
    ["پرداختی", money(totalPaid)],
    ["مانده بدهی قرارداد", money(debt)],
    ["مانده بدهی ساختمان", money(debt)],
    ["مانده مشتری", money(debt)],
    ["نام ساختمان", contract.building],
    ["مسئول هماهنگی/مشتری", contract.manager],
  ];

  const actions = [
    ["چاپ تاریخچه قرارداد", Printer],
    ["چاپ کاردکس قرارداد", Printer],
    ["چاپ فاکتور سرویس ها", Printer],
    ["پرداخت ها", CreditCard],
    ["پرونده مالی قرارداد", Wallet],
    ["مستندات قرارداد", Paperclip],
    ["پرونده مالی مشتری", Wallet],
    ["پرونده مالی ساختمان", Building2],
    ["ضمانت نامه ها", FileCheck2],
    ["پیش فاکتور / فاکتورها", PlayCircle],
    ["مفاصاحساب بیمه", ShieldCheck],
    ["ویرایش قرارداد", Pencil],
    ["افزودن دستگاه", Plus],
    ["ویرایش نمایندگان", Users],
    ["سرویس کار مقیم", UserCheck],
    ["الحاقیه ها", Files],
  ] as const;

  const deviceTabs = [
    ["خرابی ها", AlertTriangle],
    ["سرویس ها", ClipboardList],
    ["سرویس و تعمیر", Wrench],
    ["زمانبندی سرویس های قرارداد", CalendarDays],
    ["چک لیست اختصاصی", FileText],
    ["مستندات", Paperclip],
    ["بیمه", Umbrella],
    ["یادآوری ها", Bell],
    ["تاریخچه توقف‌ها", History],
  ] as const;

  // Handle Quick Payment Execution
  const executeQuickPayment = (
    monthId: number,
    amountStr: string,
    payDate: string,
    method: string,
    refCode: string
  ) => {
    const targetMonth = months.find((m) => m.id === monthId);
    if (!targetMonth) {
      notify("ماه مورد نظر یافت نشد");
      return;
    }

    const cleanNum = parseInt(amountStr.replace(/\D/g, ""), 10) || targetMonth.amount;
    if (cleanNum <= 0) {
      notify("مبلغ پرداخت معتبر نیست");
      return;
    }

    const paymentDate = payDate || "1405/06/24";
    const paymentMethod = method || "کارت به کارت";
    const paymentRef = refCode || `TRX-${Math.floor(10000 + Math.random() * 90000)}`;

    appStore.addPayment(
      contract.id,
      {
        title: `پرداخت سریع سرویس ${targetMonth.m} ${targetMonth.y}`,
        date: paymentDate,
        amount: cleanNum,
        method: paymentMethod,
        ref: paymentRef,
        monthId: monthId,
      },
      monthId
    );

    notify(`پرداخت سریع ماه ${targetMonth.m} ${fa(targetMonth.y)} به مبلغ ${money(cleanNum)} ذخیره شد`);
  };

  // Revert/Cancel a Payment
  const cancelPaymentForMonth = (monthId: number) => {
    const targetMonth = months.find((m) => m.id === monthId);
    if (!targetMonth) return;

    appStore.cancelMonthPayment(contract.id, monthId);
    notify(`پرداخت ماه ${targetMonth.m} لغو گردید`);
  };

  if (subView === "payments") {
    return (
      <ContractPaymentsView
        t={t}
        contract={contract}
        onBack={() => setSubView("overview")}
        onShowToast={notify}
      />
    );
  }

  if (subView === "breakdowns") {
    return (
      <ContractBreakdownsView
        t={t}
        contract={contract}
        onBack={() => setSubView("overview")}
        onShowToast={notify}
      />
    );
  }

  if (subView === "services") {
    return (
      <ContractServicesListView
        t={t}
        contract={contract}
        months={months}
        onBack={() => setSubView("overview")}
        onShowToast={notify}
        onOpenServiceReport={(month) => {
          const idx = months.findIndex((m) => m.id === month.id);
          if (idx !== -1) setServiceIdx(idx);
          else onOpenServiceReport?.(month, contract);
        }}
      />
    );
  }

  if (serviceIdx !== null) {
    const s = months[serviceIdx];
    return (
      <div className="flex h-full flex-col">
        <ServiceForm
          t={t}
          planDate={`${s.y}/${String(s.id).padStart(2, "0")}/13`}
          baseAmount={s.amount || 7000000}
          contractRibbon={
            <ContractRibbonBar
              t={t}
              contract={contract}
              contractNo={contract.no}
              totalPayable={totalPayable}
              totalPaid={totalPaid}
              debt={debt}
              buildingDebt={debt}
              customerDebt={debt}
            />
          }
          initialData={{
            techs: s.techs,
            doneBy: s.doneBy || "محسن امامی برسری",
            report: s.report,
            reminder: s.reminder,
            doneDate: s.date || "1405/06/25",
            inTime: s.inTime || "10:00",
            outTime: s.outTime || "11:30",
            wage: s.wage,
            trip: s.trip,
            discount: s.discount,
            faultsList: s.faultsList,
            partsList: s.partsList,
          }}
          onBack={() => setServiceIdx(null)}
          onSubmit={(d) => {
            appStore.addServiceSubmission(contract.id, s.id, d);
            setServiceIdx(null);
            notify("گزارش سرویس با موفقیت ثبت و ذخیره شد");
          }}
        />
      </div>
    );
  }

  const selectedMonthObj = months.find((m) => m.id === selectedMonthId) || months[0];
  const unpaidCount = months.filter((m) => !m.paid).length;
  const paidCount = months.filter((m) => m.paid).length;

  return (
    <div className="relative h-full overflow-y-auto p-3">
      {/* stats strip */}
      <div className={`grid grid-cols-8 overflow-hidden rounded border ${t.border}`}>
        {stats.map(([k, v], i) => (
          <div key={i} className={`border-s px-3 py-2 ${t.border} ${t.dark ? "bg-[#232323]" : "bg-neutral-50"}`}>
            <div className={`mb-1 flex items-center justify-between gap-1 text-[11px] ${t.sub}`}>
              <span className="truncate">{k}</span>
              <Pin size={11} className="shrink-0" />
            </div>
            <div className={`truncate text-[12px] ${i === 0 ? "text-sky-400" : t.text}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className={`mt-1 flex items-center justify-center gap-1 text-[12px] ${t.sub}`}>
        <ChevronDown size={13} /> مشاهده بیشتر
      </div>

      <div className={`mt-2 text-right text-[12px] ${t.sub}`}>مشاهده قرارداد قبلی: {fa("3449")}</div>

      {/* main buttons */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => notify("تمدید قرارداد")}
          className="flex items-center gap-1 rounded bg-violet-500 px-4 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
        >
          <ChevronDown size={13} /> تمدید قرارداد
        </button>
        <button type="button" className={`rounded border px-4 py-1.5 text-[12.5px] ${t.border} ${t.text} ${t.hover}`}>
          مشاهده قرارداد جنرال
        </button>
        <button type="button" className={`rounded border px-4 py-1.5 text-[12.5px] ${t.border} ${t.text} ${t.hover}`}>
          فسخ قرارداد
        </button>
        <button type="button" className={`rounded border px-2 py-1.5 ${t.border} ${t.sub}`}>
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          onClick={() => notify("حذف قرارداد")}
          className="flex items-center gap-1 rounded border border-red-600 px-4 py-1.5 text-[12.5px] text-red-500 hover:bg-red-600/10"
        >
          <Trash2 size={14} /> حذف قرارداد
        </button>
        <div className="flex-1" />
        <div className={`flex items-center gap-1 rounded border px-3 py-1.5 text-[12.5px] ${t.border} ${t.text}`}>
          <List size={14} /> باز شده
        </div>
        <Grid2X2 size={16} className={t.sub} />
      </div>

      {/* action grid */}
      <div
        className={`mt-3 flex flex-wrap justify-start gap-x-6 gap-y-3 rounded p-3 ${
          t.dark ? "bg-[#232323]" : "bg-neutral-50"
        }`}
      >
        {actions.map(([label, I]) => {
          const isPayments = label === "پرداخت ها";
          return (
            <div key={label} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (isPayments) {
                    setSubView("payments");
                  } else {
                    notify(label);
                  }
                }}
                className={`flex items-center gap-1.5 text-[12.5px] transition-colors ${
                  isPayments
                    ? "font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700"
                    : `${t.text} hover:text-violet-400`
                }`}
              >
                <span>{label}</span>
                <I
                  size={14}
                  className={
                    isPayments
                      ? "text-purple-600 dark:text-purple-400"
                      : t.sub
                  }
                />
              </button>

              {/* Corner quick print icon specifically for payments */}
              {isPayments && (
                <button
                  type="button"
                  title="چاپ مستقیم پرداختی‌ها"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubView("payments");
                  }}
                  className={`rounded p-1 text-neutral-400 hover:text-purple-600 hover:bg-purple-500/10 transition-colors`}
                >
                  <Printer size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* device card (Matching sshot-17.png) */}
      <div className={`mt-3 rounded-xl border p-3.5 ${t.border} ${t.dark ? "bg-[#1f1f1f]" : "bg-white"}`}>
        {/* Device Header */}
        <div className="flex items-center justify-between border-b pb-2.5 border-neutral-700/40 text-[12.5px]">
          {/* Right: Next service amount */}
          <div className="text-neutral-300 font-medium">
            مبلغ سرویس بعدی: <span className="font-mono text-white">۰ ریال</span>
          </div>

          {/* Center: Status count */}
          <div className="flex items-center gap-1.5 text-neutral-400 font-normal text-[12px]">
            <button
              type="button"
              onClick={() => setSubView("services")}
              className="hover:text-purple-300 hover:underline transition cursor-pointer"
              title="مشاهده صفحه لیست سرویس‌ها (سرویس شده، سرویس نشده و...)"
            >
              {fa(months.length)} سرویس برنامه ریزی شده
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => setSubView("breakdowns")}
              className="hover:text-amber-300 hover:underline transition cursor-pointer"
              title="مشاهده لیست خرابی‌های این دستگاه و قرارداد"
            >
              {breakdowns.length > 0 ? (
                <span className="font-semibold text-amber-400 font-mono">
                  {fa(breakdowns.length)} خرابی
                </span>
              ) : (
                "بدون خرابی"
              )}
            </button>
          </div>

          {/* Left: Device identifier & tools */}
          <div className="flex items-center gap-2 text-neutral-300">
            <div className="flex items-center gap-1 font-mono font-bold text-neutral-200">
              <User size={14} className="text-purple-400" />
              <span>{fa("1")}</span>
            </div>
            <button type="button" className="text-neutral-400 hover:text-white" title="ویرایش دستگاه">
              <Pencil size={13} />
            </button>
            <button type="button" className="text-rose-400 hover:text-rose-300" title="حذف دستگاه">
              <Trash size={13} />
            </button>
            <span className="text-neutral-500">⌄</span>
          </div>
        </div>

        {/* Device Toolbar Buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {deviceTabs.map(([label, I]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (label === "خرابی ها") {
                  setSubView("breakdowns");
                } else if (label === "سرویس ها" || label === "سرویس و تعمیر") {
                  setSubView("services");
                } else {
                  notify(label);
                }
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition ${
                label === "خرابی ها"
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  : label === "سرویس ها"
                  ? "border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                  : `${t.border} ${t.text} ${t.hover}`
              }`}
            >
              <span>{label}</span>
              <I
                size={13}
                className={
                  label === "خرابی ها"
                    ? "text-amber-400"
                    : label === "سرویس ها"
                    ? "text-purple-400"
                    : t.sub
                }
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsBreakdownModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/60 bg-purple-500/10 px-3 py-1.5 text-[12px] text-purple-400 hover:bg-purple-500/20 transition active:scale-95"
          >
            <AlertTriangle size={13} /> ثبت خرابی
          </button>
          <button
            type="button"
            onClick={() => notify("اعلام توقف")}
            className="flex items-center gap-1 rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-500/20"
          >
            <Ban size={13} /> اعلام توقف
          </button>
        </div>

        {/* Months Grid with Quick Pay */}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {months.map((s) => {
            const isSelected = selectedMonthId === s.id;
            return (
              <div
                key={s.id}
                className={`group flex w-[98px] flex-col overflow-hidden rounded-xl border transition-all duration-150 ${
                  isSelected
                    ? "border-purple-500 ring-2 ring-purple-500/50 shadow-md scale-[1.02]"
                    : s.paid
                    ? "border-emerald-700/60 hover:border-emerald-500"
                    : `${t.border} hover:border-purple-400`
                } ${t.dark ? "bg-[#1f1f1f]" : "bg-white"}`}
              >
                {/* Month Card Upper Section */}
                <div
                  role="button"
                  tabIndex={0}
                  onMouseEnter={(e) => openQuickView(s, e.currentTarget)}
                  onMouseLeave={scheduleCloseQuickView}
                  onClick={(e) => {
                    setSelectedMonthId(s.id);
                    openQuickView(s, e.currentTarget);
                  }}
                  onDoubleClick={() => {
                    const idx = months.findIndex((m) => m.id === s.id);
                    if (idx !== -1) setServiceIdx(idx);
                  }}
                  title="برای مشاهده پنجره نمای سریع سرویس، ماوس را روی کارت ببرید یا کلیک کنید"
                  className={`relative flex h-[82px] cursor-pointer flex-col items-center justify-between p-2 transition ${
                    s.done
                      ? isSelected
                        ? "bg-[#184528] text-white"
                        : "bg-[#163c24] hover:bg-[#1b482c] text-white"
                      : isSelected
                      ? t.dark
                        ? "bg-purple-950/40 text-purple-200"
                        : "bg-purple-50 text-purple-900"
                      : t.dark
                      ? "bg-[#222] hover:bg-[#272727] text-neutral-300"
                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {/* Top info row: day + quick window icon */}
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[13.5px] font-bold font-mono">
                      {fa(s.plannedDate?.split(/[/-]/).pop() || "-")}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQuickView(s, (e.currentTarget.closest('[role="button"]') as HTMLElement) || e.currentTarget);
                      }}
                      title="نمای سریع سرویس"
                      className="rounded p-0.5 text-neutral-400 hover:text-white hover:bg-white/10"
                    >
                      <MoreVertical size={13} />
                    </button>
                  </div>

                  {/* Month name and year */}
                  <span className="text-[11.5px] font-semibold">
                    {s.m} {fa(s.y)}
                  </span>

                  {/* Status icon & label */}
                  <div className="flex items-center gap-1">
                    {s.done ? (
                      <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check size={9} className="stroke-[3]" />
                      </div>
                    ) : (
                      <CalendarDays size={11} className="text-neutral-500" />
                    )}
                    <span className={`text-[9.5px] truncate ${s.done ? "font-mono font-medium text-emerald-300" : "text-neutral-400"}`}>
                      {s.done ? fa(s.date || "") : "برنامه‌ریزی شده"}
                    </span>
                  </div>
                </div>

                {/* Direct quick pay action right under each month */}
                <div
                  className={`flex flex-col border-t p-1.5 text-center ${t.border} ${
                    s.paid
                      ? t.dark
                        ? "bg-emerald-950/40"
                        : "bg-emerald-50/70"
                      : t.dark
                      ? "bg-[#181818]"
                      : "bg-neutral-50"
                  }`}
                >
                  {s.paid ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-500">
                        <CheckCircle2 size={11} />
                        پرداخت شده
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelPaymentForMonth(s.id);
                        }}
                        title="لغو پرداخت این ماه"
                        className="text-[9px] text-neutral-400 hover:text-red-400 hover:underline"
                      >
                        لغو پرداخت
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMonthId(s.id);
                        setQuickPayAmount(s.amount.toLocaleString("en-US"));
                        setQuickPayModalMonth(s);
                      }}
                      className="flex w-full items-center justify-center gap-1 rounded bg-purple-600 py-1 text-[10.5px] font-medium text-white transition hover:bg-purple-700 active:scale-95 shadow-sm"
                    >
                      <Zap size={10} className="fill-white" />
                      پرداخت سریع
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {Array.from({ length: 2 }).map((_, i) => (
            <button
              key={"n" + i}
              type="button"
              onClick={() => {
                appStore.addMonthServiceSlot(contract.id);
                notify("سرویس دوره‌ای جدید اضافه شد");
              }}
              className={`flex h-[116px] w-[98px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[11px] ${t.border} ${t.sub} hover:border-purple-500 hover:text-purple-400 transition`}
            >
              <Plus size={16} />
              <span>سرویس جدید</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Quick View Popover Window (نمای سریع سرویس طبق تصویر ارسالی) */}
      {quickViewMonth && quickViewPos && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[0.5px]"
            onClick={() => setQuickViewMonth(null)}
          />
          <div
            onMouseEnter={cancelCloseQuickView}
            onMouseLeave={scheduleCloseQuickView}
            style={{
              top: `${quickViewPos.top}px`,
              left: `${quickViewPos.left}px`,
            }}
            className="fixed z-50 w-[570px] max-w-[95vw] rounded-2xl border border-slate-200/90 dark:border-neutral-700 bg-white dark:bg-[#1a1c22] p-4 text-neutral-800 dark:text-neutral-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-150 select-none"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-neutral-800/80 pb-3 mb-3">
              <div>
                <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-400 block mb-0.5">
                  نمای سریع سرویس
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black font-mono text-slate-800 dark:text-white">
                    سرویس {fa(quickViewMonth.serviceNo || 774480 + quickViewMonth.id)}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      quickViewMonth.done
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                    }`}
                  >
                    {quickViewMonth.done ? "انجام شده" : "برنامه‌ریزی شده"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 shadow-xs">
                  {fa(quickViewMonth.date || quickViewMonth.plannedDate || "۱۴۰۵/۰۶/۲۵")}
                </span>

                <button
                  type="button"
                  onClick={() => notify("اطلاعات سرویس بروزرسانی شد")}
                  title="بروزرسانی داده‌ها"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition"
                >
                  <RotateCcw size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setQuickViewMonth(null)}
                  title="بستن"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Two Columns Body */}
            <div className="grid grid-cols-12 gap-3.5">
              {/* Right Side: Service Details & Tech Transit (7 cols) */}
              <div className="col-span-7 flex flex-col gap-2.5 text-xs">
                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200/80 dark:border-neutral-700/70 bg-slate-50/60 dark:bg-neutral-800/40 p-2 text-right">
                    <span className="text-[10px] text-slate-400 block mb-0.5">تاریخ انجام</span>
                    <span className="font-mono font-bold text-[12.5px] text-slate-800 dark:text-neutral-100">
                      {quickViewMonth.done && quickViewMonth.date ? fa(quickViewMonth.date) : (quickViewMonth.date ? fa(quickViewMonth.date) : "انجام نشده")}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-neutral-700/70 bg-slate-50/60 dark:bg-neutral-800/40 p-2 text-right">
                    <span className="text-[10px] text-slate-400 block mb-0.5">تاریخ برنامه‌ریزی</span>
                    <span className="font-mono font-bold text-[12.5px] text-slate-800 dark:text-neutral-100">
                      {fa(quickViewMonth.plannedDate || `${quickViewMonth.y}/${String(quickViewMonth.id).padStart(2, "0")}/24`)}
                    </span>
                  </div>
                </div>

                {/* Technician Name */}
                <div className="rounded-xl border border-slate-200/80 dark:border-neutral-700/70 bg-slate-50/60 dark:bg-neutral-800/40 p-2 text-right">
                  <span className="text-[10px] text-slate-400 block mb-0.5">سرویسکار انجام‌دهنده</span>
                  <span className="font-bold text-[12.5px] text-slate-800 dark:text-neutral-100">
                    {quickViewMonth.doneBy || quickViewMonth.techs?.[0] || contract.technician || "بهمن کشاورز"}
                  </span>
                </div>

                {/* Section: تردد سرویسکارها */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px] text-slate-700 dark:text-slate-200">
                    <span className="h-3.5 w-1 rounded-full bg-sky-500" />
                    <span>تردد سرویسکارها</span>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 dark:border-neutral-700/70 bg-white dark:bg-neutral-800/60 p-2 flex items-center justify-between shadow-2xs">
                    <span className="font-semibold text-slate-700 dark:text-neutral-200">
                      {quickViewMonth.doneBy || quickViewMonth.techs?.[0] || contract.technician || "بهمن کشاورز"}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                      <span className="rounded-md border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 px-2 py-0.5 text-slate-600 dark:text-slate-300">
                        ورود {fa(quickViewMonth.inTime || "۱۱:۳۹")}
                      </span>
                      <span className="rounded-md border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 px-2 py-0.5 text-slate-600 dark:text-slate-300">
                        خروج {fa(quickViewMonth.outTime || "۱۲:۱۰")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section: گزارش سرویس */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px] text-slate-700 dark:text-slate-200">
                    <span className="h-3.5 w-1 rounded-full bg-sky-500" />
                    <span>گزارش سرویس</span>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 dark:border-neutral-700/70 bg-white dark:bg-neutral-800/60 p-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed min-h-[38px] shadow-2xs">
                    {quickViewMonth.report || (quickViewMonth.done ? "سرویس آسانسور شهریور ماه صورت گرفت بدهی فاکتور شد" : "هنوز گزارشی برای این سرویس ثبت نشده است")}
                  </div>
                </div>

                {/* Section: قطعات مصرف‌شده */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px] text-slate-700 dark:text-slate-200">
                    <span className="h-3.5 w-1 rounded-full bg-sky-500" />
                    <span>قطعات مصرف‌شده</span>
                  </div>
                  <div className="text-[11px]">
                    {quickViewMonth.partsList && quickViewMonth.partsList.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {quickViewMonth.partsList.map((p, idx) => (
                          <span key={idx} className="rounded-md border bg-slate-50 dark:bg-neutral-800 px-2 py-0.5 font-medium text-slate-700 dark:text-neutral-200">
                            {p.name} ({fa(p.quantity)} عدد)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-bold text-sky-600 dark:text-sky-400">
                        • ۰ قلم
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Left Side: خلاصه مالی (5 cols) */}
              <div className="col-span-5 rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-gradient-to-b from-[#e0f2fe]/45 via-[#f0f9ff]/30 to-[#ecfdf5]/40 dark:from-slate-900/90 dark:to-slate-850/90 p-3.5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-sky-400/10 pointer-events-none blur-xl" />

                <div>
                  {/* Financial Header */}
                  <div className="flex items-center gap-1.5 border-b border-sky-200/50 dark:border-sky-800/40 pb-2 mb-2">
                    <span className="h-5 w-1 rounded-full bg-sky-500" />
                    <div>
                      <div className="font-bold text-[13px] text-slate-800 dark:text-white leading-tight">
                        خلاصه مالی
                      </div>
                      <div className="text-[9.5px] text-slate-400 dark:text-slate-400">
                        ریز هزینه‌های سرویس
                      </div>
                    </div>
                  </div>

                  {/* Financial Rows */}
                  <div className="flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between border-b border-dashed border-sky-200/40 dark:border-sky-800/30 pb-1">
                      <span>مبلغ سرویس</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-100">
                        {fa((quickViewMonth.amount || contract.monthlyAmount || 7500000).toLocaleString())} ریال
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-dashed border-sky-200/40 dark:border-sky-800/30 pb-1">
                      <span>قطعات</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-100">
                        {fa((quickViewMonth.partsAmount || 0).toLocaleString())} ریال
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-dashed border-sky-200/40 dark:border-sky-800/30 pb-1">
                      <span>دستمزد</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-100">
                        {fa((quickViewMonth.wage || 0).toLocaleString())} ریال
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-dashed border-sky-200/40 dark:border-sky-800/30 pb-1">
                      <span>ایاب‌وذهاب</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-100">
                        {fa((quickViewMonth.trip || 0).toLocaleString())} ریال
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-dashed border-sky-200/40 dark:border-sky-800/30 pb-1">
                      <span>تخفیف</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-100">
                        {fa((quickViewMonth.discount || 0).toLocaleString())} ریال
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-1">
                      <span>مالیات</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-neutral-100">
                        {fa((quickViewMonth.tax || 0).toLocaleString())} ریال
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Total Box */}
                <div className="mt-3 rounded-xl border border-emerald-300/70 dark:border-emerald-800/60 bg-[#dcfce7]/75 dark:bg-emerald-950/60 p-2.5 flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-slate-800 dark:text-neutral-200">
                    مبلغ نهایی سرویس
                  </span>
                  <span className="font-mono font-black text-[13.5px] text-emerald-700 dark:text-emerald-400">
                    {fa(((quickViewMonth.amount || contract.monthlyAmount || 7500000) + (quickViewMonth.partsAmount || 0) + (quickViewMonth.wage || 0) + (quickViewMonth.trip || 0) - (quickViewMonth.discount || 0) + (quickViewMonth.tax || 0)).toLocaleString())} ریال
                  </span>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = months.findIndex((m) => m.id === quickViewMonth.id);
                    setQuickViewMonth(null);
                    if (idx !== -1) setServiceIdx(idx);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 active:scale-95 transition"
                >
                  <FileText size={13} />
                  <span>ویرایش کامل سرویس</span>
                </button>

                {!quickViewMonth.paid && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonthId(quickViewMonth.id);
                      setQuickPayAmount(quickViewMonth.amount.toLocaleString("en-US"));
                      setQuickPayModalMonth(quickViewMonth);
                      setQuickViewMonth(null);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
                  >
                    <Zap size={13} className="fill-white" />
                    <span>پرداخت سریع</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setQuickViewMonth(null)}
                className="rounded-xl border border-slate-200 dark:border-neutral-700 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 transition"
              >
                بستن
              </button>
            </div>
          </div>
        </>
      )}

        {/* Selected Month Summary Box (باکس جامع خلاصه گزارش، سرویسکار و قطعات مصرفی) */}
        {selectedMonthObj && (
          <div
            className={`mt-5 overflow-hidden rounded-xl border shadow-sm transition ${t.border} ${
              t.dark ? "bg-[#1f1f1f]" : "bg-white"
            }`}
          >
            {/* Header of summary card */}
            <div
              className={`flex flex-wrap items-center justify-between gap-3 border-b p-4 ${
                t.dark ? "bg-[#252525]" : "bg-neutral-50/90"
              }`}
              style={{ borderColor: "inherit" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white shadow">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[15px] font-bold ${t.text}`}>
                      خلاصه سرویس ماه {selectedMonthObj.m} {fa(selectedMonthObj.y)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        selectedMonthObj.done
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {selectedMonthObj.done ? (
                        <>
                          <CheckCircle2 size={12} /> انجام شده
                        </>
                      ) : (
                        <>
                          <CalendarDays size={12} /> در انتظار انجام
                        </>
                      )}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        selectedMonthObj.paid
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                      }`}
                    >
                      {selectedMonthObj.paid ? "تسویه شده ✓" : "پرداخت نشده"}
                    </span>
                  </div>
                  <div className={`text-[12px] ${t.sub} mt-0.5`}>
                    مشاهده سریع مشخصات سرویسکار، قطعات مصرفی و صورتحساب بدون نیاز به باز کردن گزارش کامل
                  </div>
                </div>
              </div>

              {/* Action Buttons in header */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = months.findIndex((m) => m.id === selectedMonthObj.id);
                    if (idx !== -1) setServiceIdx(idx);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-purple-700 active:scale-95"
                  title="مشاهده و ثبت گزارش سرویس"
                >
                  <FileText size={13} />
                  مشاهده و ثبت گزارش سرویس
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const idx = months.findIndex((m) => m.id === selectedMonthObj.id);
                    if (idx !== -1) setServiceIdx(idx);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${t.border} ${t.hover}`}
                >
                  <Pencil size={13} />
                  {selectedMonthObj.done ? "ویرایش فرم" : "ثبت سرویس"}
                </button>

                {!selectedMonthObj.paid ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPayAmount(selectedMonthObj.amount.toLocaleString("en-US"));
                      setQuickPayModalMonth(selectedMonthObj);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[12px] font-medium text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
                  >
                    <Zap size={13} className="fill-white" />
                    پرداخت سریع این ماه
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => cancelPaymentForMonth(selectedMonthObj.id)}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11.5px] text-red-500 ${t.border} ${t.hover}`}
                  >
                    <RotateCcw size={12} />
                    لغو پرداخت
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => notify(`چاپ برگه سرویس ماه ${selectedMonthObj.m}`)}
                  title="چاپ برگه خلاصه"
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] ${t.border} ${t.text} ${t.hover}`}
                >
                  <Printer size={13} className={t.sub} />
                </button>
              </div>
            </div>

            {/* Body of summary card */}
            <div className="p-4 space-y-4">
              {selectedMonthObj.done ? (
                <>
                  {/* Grid 1: Technician & Time details */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className={`rounded-lg border p-3 ${t.border} ${t.dark ? "bg-[#252525]" : "bg-neutral-50/70"}`}>
                      <div className={`flex items-center gap-1.5 text-[11.5px] ${t.sub} mb-1`}>
                        <User size={13} className="text-violet-500" />
                        <span>سرویس‌کار انجام‌دهنده:</span>
                      </div>
                      <div className={`text-[13px] font-bold ${t.text}`}>
                        {selectedMonthObj.doneBy || selectedMonthObj.techs?.[0] || "علی کاظمی"}
                      </div>
                      {selectedMonthObj.techs && selectedMonthObj.techs.length > 1 && (
                        <div className={`text-[11px] ${t.sub} mt-1`}>
                          همکاران: {selectedMonthObj.techs.filter((x) => x !== selectedMonthObj.doneBy).join("، ")}
                        </div>
                      )}
                    </div>

                    <div className={`rounded-lg border p-3 ${t.border} ${t.dark ? "bg-[#252525]" : "bg-neutral-50/70"}`}>
                      <div className={`flex items-center gap-1.5 text-[11.5px] ${t.sub} mb-1`}>
                        <CalendarDays size={13} className="text-sky-500" />
                        <span>تاریخ انجام سرویس:</span>
                      </div>
                      <div className={`text-[13px] font-bold ${t.text}`}>
                        {fa(selectedMonthObj.date || "1405/03/25")}
                      </div>
                      <div className={`text-[11px] ${t.sub} mt-1`}>
                        تاریخ برنامه‌ریزی: {fa(`${selectedMonthObj.y}/06/24`)}
                      </div>
                    </div>

                    <div className={`rounded-lg border p-3 ${t.border} ${t.dark ? "bg-[#252525]" : "bg-neutral-50/70"}`}>
                      <div className={`flex items-center gap-1.5 text-[11.5px] ${t.sub} mb-1`}>
                        <Clock size={13} className="text-emerald-500" />
                        <span>ساعت ورود و خروج:</span>
                      </div>
                      <div className={`text-[13px] font-bold ${t.text} flex items-center gap-1.5`}>
                        <span>{fa(selectedMonthObj.inTime || "10:00")}</span>
                        <span className={t.sub}>تا</span>
                        <span>{fa(selectedMonthObj.outTime || "11:30")}</span>
                      </div>
                      <div className={`text-[11px] text-emerald-500 mt-1`}>
                        مدت حضور: ۱ ساعت و ۳۰ دقیقه
                      </div>
                    </div>

                    <div className={`rounded-lg border p-3 ${t.border} ${t.dark ? "bg-[#252525]" : "bg-neutral-50/70"}`}>
                      <div className={`flex items-center gap-1.5 text-[11.5px] ${t.sub} mb-1`}>
                        <CreditCard size={13} className="text-amber-500" />
                        <span>وضعیت مالی ماه:</span>
                      </div>
                      <div className={`text-[13px] font-bold ${selectedMonthObj.paid ? "text-emerald-500" : "text-amber-500"}`}>
                        {selectedMonthObj.paid ? "تسویه شده ✓" : "در انتظار تسویه"}
                      </div>
                      <div className={`text-[11px] ${t.sub} mt-1 truncate`}>
                        {selectedMonthObj.paid
                          ? `${selectedMonthObj.paidMethod || "کارت به کارت"} (${selectedMonthObj.paidRef || "TRX-89301"})`
                          : `مبلغ: ${money(selectedMonthObj.amount)}`}
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Report & Faults */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    {/* Technician's summary report text */}
                    <div className={`rounded-lg border p-3.5 lg:col-span-8 ${t.border} ${t.dark ? "bg-[#232323]" : "bg-neutral-50/40"}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className={`flex items-center gap-1.5 text-[12.5px] font-bold ${t.text}`}>
                          <FileText size={15} className="text-violet-500" />
                          <span>شرح گزارش و اقدامات فنی انجام‌شده:</span>
                        </div>
                        <span className={`text-[11px] ${t.sub}`}>سریال برگه: {fa("775521")}</span>
                      </div>
                      <p className={`text-[12.5px] leading-6 ${t.text} rounded border p-2.5 ${t.border} ${
                        t.dark ? "bg-[#1c1c1c]" : "bg-white"
                      }`}>
                        {selectedMonthObj.report ||
                          "سرویس ماهیانه موتورخانه، آچارکشی اتصالات ریل‌ها، بازبینی روغن گیربکس و تنظیم سنسورهای توقف طبقات با موفقیت انجام شد."}
                      </p>

                      {selectedMonthObj.reminder && (
                        <div className="mt-2.5 flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11.5px] text-amber-500">
                          <Bell size={14} className="shrink-0 mt-0.5" />
                          <span><strong>یادآوری برای سرویس بعدی:</strong> {selectedMonthObj.reminder}</span>
                        </div>
                      )}
                    </div>

                    {/* Faults / issues handled */}
                    <div className={`rounded-lg border p-3.5 lg:col-span-4 ${t.border} ${t.dark ? "bg-[#232323]" : "bg-neutral-50/40"}`}>
                      <div className={`flex items-center gap-1.5 text-[12.5px] font-bold ${t.text} mb-2`}>
                        <AlertTriangle size={15} className="text-amber-500" />
                        <span>خرابی‌ها و اقدامات اصلاحی:</span>
                      </div>
                      {selectedMonthObj.faultsList && selectedMonthObj.faultsList.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedMonthObj.faultsList.map((reason, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-1.5 rounded border p-2 text-[11.5px] ${t.border} ${
                                t.dark ? "bg-[#1c1c1c]" : "bg-white"
                              } ${t.text}`}
                            >
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-500">
                                {fa(idx + 1)}
                              </span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`flex h-24 flex-col items-center justify-center rounded border p-3 text-center text-[12px] ${t.border} ${t.sub}`}>
                          <CheckCircle2 size={20} className="text-emerald-500 mb-1" />
                          <span>بدون خرابی و توقف در این دوره</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Consumed Parts Table (قطعات مصرفی) */}
                  <div className={`rounded-lg border p-3.5 ${t.border} ${t.dark ? "bg-[#232323]" : "bg-neutral-50/40"}`}>
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 text-[13px] font-bold ${t.text}`}>
                        <Wrench size={15} className="text-violet-500" />
                        <span>قطعات و لوازم مصرفی در این سرویس:</span>
                      </div>
                      <span className={`text-[12px] font-semibold text-violet-500`}>
                        جمع کل قطعات: {money(selectedMonthObj.partsAmount || 0)}
                      </span>
                    </div>

                    {selectedMonthObj.partsList && selectedMonthObj.partsList.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px]">
                          <thead className={`${t.head} ${t.sub} border-b ${t.border}`}>
                            <tr>
                              <th className="py-2 px-3 text-right font-medium">ردیف</th>
                              <th className="py-2 px-3 text-right font-medium">کد قطعه</th>
                              <th className="py-2 px-3 text-right font-medium">نام و شرح قطعه</th>
                              <th className="py-2 px-3 text-center font-medium">تعداد / مقدار</th>
                              <th className="py-2 px-3 text-right font-medium">قیمت واحد</th>
                              <th className="py-2 px-3 text-left font-medium">مبلغ کل</th>
                            </tr>
                          </thead>
                          <tbody className={t.text}>
                            {selectedMonthObj.partsList.map((part, idx) => (
                              <tr key={idx} className={`border-b ${t.border} hover:bg-neutral-500/5`}>
                                <td className="py-2.5 px-3">{fa(idx + 1)}</td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400">
                                  {part.code ? fa(part.code) : "-"}
                                </td>
                                <td className="py-2.5 px-3 font-semibold">{part.name}</td>
                                <td className="py-2.5 px-3 text-center">
                                  {fa(part.qty)} {part.unit}
                                </td>
                                <td className="py-2.5 px-3">{money(part.price)}</td>
                                <td className="py-2.5 px-3 text-left font-bold text-violet-500">
                                  {money(part.qty * part.price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={`flex items-center justify-between rounded border border-dashed p-3 text-[12px] ${t.border} ${t.sub}`}>
                        <span>قطعه مصرفی برای این سرویس ثبت نشده است.</span>
                        <button
                          type="button"
                          onClick={() => {
                            const idx = months.findIndex((m) => m.id === selectedMonthObj.id);
                            if (idx !== -1) setServiceIdx(idx);
                          }}
                          className="text-[11.5px] text-violet-500 hover:underline"
                        >
                          + افزودن قطعه در فرم سرویس
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Financial calculation breakdown for this month */}
                  <div className={`rounded-lg border p-3.5 ${t.border} ${t.dark ? "bg-[#1d1d1d]" : "bg-neutral-100/70"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 text-[12.5px]">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className={t.sub}>مبلغ پایه سرویس:</span>
                          <span className={`font-semibold ${t.text}`}>۸٬۵۰۰٬۰۰۰ ریال</span>
                        </div>
                        {Boolean(selectedMonthObj.partsAmount) && (
                          <div className="flex items-center gap-1.5">
                            <span className={t.sub}>قطعات:</span>
                            <span className="font-semibold text-violet-500">
                              +{money(selectedMonthObj.partsAmount || 0)}
                            </span>
                          </div>
                        )}
                        {Boolean(selectedMonthObj.wage) && (
                          <div className="flex items-center gap-1.5">
                            <span className={t.sub}>دستمزد و ایاب‌ذهاب:</span>
                            <span className="font-semibold text-sky-500">
                              +{money((selectedMonthObj.wage || 0) + (selectedMonthObj.trip || 0))}
                            </span>
                          </div>
                        )}
                        {Boolean(selectedMonthObj.discount) && (
                          <div className="flex items-center gap-1.5">
                            <span className={t.sub}>تخفیف:</span>
                            <span className="font-semibold text-red-500">
                              -{money(selectedMonthObj.discount || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-bold ${t.text}`}>مبلغ نهایی این دوره:</span>
                        <span className="rounded-md bg-violet-600 px-3 py-1 text-[13.5px] font-bold text-white shadow">
                          {money(selectedMonthObj.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Month not yet completed state */
                <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center ${t.border} ${t.dark ? "bg-[#252525]" : "bg-neutral-50"}`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-500 mb-3">
                    <CalendarDays size={24} />
                  </div>
                  <h4 className={`text-[14px] font-bold ${t.text}`}>
                    سرویس ماه {selectedMonthObj.m} {fa(selectedMonthObj.y)} هنوز انجام نشده است
                  </h4>
                  <p className={`mt-1 max-w-md text-[12px] ${t.sub}`}>
                    این سرویس برای تاریخ ۲۴ {selectedMonthObj.m} برنامه‌ریزی شده است. پس از مراجعه سرویسکار، با کلیک روی دکمه زیر گزارش سرویس، قطعات تعویضی و ساعت حضور را ثبت نمایید.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const idx = months.findIndex((m) => m.id === selectedMonthObj.id);
                        if (idx !== -1) setServiceIdx(idx);
                      }}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-[12.5px] font-semibold text-white shadow hover:bg-emerald-700 active:scale-95"
                    >
                      <Plus size={15} />
                      ثبت و تکمیل گزارش سرویسکار
                    </button>
                    {!selectedMonthObj.paid && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickPayAmount(selectedMonthObj.amount.toLocaleString("en-US"));
                          setQuickPayModalMonth(selectedMonthObj);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-violet-500 px-4 py-2 text-[12.5px] font-medium text-violet-500 hover:bg-violet-500/10"
                      >
                        <Zap size={14} />
                        پرداخت سریع این ماه ({money(selectedMonthObj.amount)})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Quick Pay Modal Popup when clicking direct button on month */}
      {quickPayModalMonth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={() => setQuickPayModalMonth(null)}
        >
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className={`w-full max-w-[480px] rounded-lg border p-5 shadow-2xl ${t.border} ${
              t.dark ? "bg-[#242424]" : "bg-white"
            } ${t.text}`}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "inherit" }}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-violet-600 text-white">
                  <Zap size={15} />
                </div>
                <span className="text-[14px] font-bold">
                  پرداخت سریع ماه {quickPayModalMonth.m} {fa(quickPayModalMonth.y)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuickPayModalMonth(null)}
                className={`rounded p-1 ${t.hover} ${t.sub}`}
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className={`rounded border p-3 text-[12.5px] ${t.border} ${t.dark ? "bg-[#1e1e1e]" : "bg-neutral-50"}`}>
                <div className="flex justify-between py-1">
                  <span className={t.sub}>ساختمان:</span>
                  <span className="font-semibold">{contract.building}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className={t.sub}>مشتری / طرف حساب:</span>
                  <span>{contract.manager}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className={t.sub}>مبلغ مصوب سرویس:</span>
                  <span className="font-bold text-violet-500">{money(quickPayModalMonth.amount)}</span>
                </div>
              </div>

              <Field label="مبلغ دریافتی (ریال)" req>
                <input
                  value={quickPayAmount}
                  onChange={(e) =>
                    setQuickPayAmount(
                      e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    )
                  }
                  className={inputCls(t, "font-bold")}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="تاریخ پرداخت" req>
                  <DatePicker t={t} value={quickPayDate} onChange={(v) => setQuickPayDate(v)} />
                </Field>
                <Field label="روش پرداخت" req>
                  <SearchSelect
                    t={t}
                    value={quickPayMethod}
                    onChange={(v) => setQuickPayMethod(v)}
                    options={["کارت به کارت", "دستگاه پوز / کارتخوان", "واریز به حساب", "نقدی", "چک صیادی"]}
                  />
                </Field>
              </div>

              <Field label="شماره پیگیری / ارجاع">
                <input
                  value={quickPayRef}
                  onChange={(e) => setQuickPayRef(e.target.value)}
                  placeholder="مثلاً: TRX-98214"
                  className={inputCls(t)}
                />
              </Field>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: "inherit" }}>
              <button
                type="button"
                onClick={() => setQuickPayModalMonth(null)}
                className={`rounded border px-4 py-2 text-[12.5px] ${t.border} ${t.hover}`}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  executeQuickPayment(
                    quickPayModalMonth.id,
                    quickPayAmount,
                    quickPayDate,
                    quickPayMethod,
                    quickPayRef
                  );
                  setQuickPayModalMonth(null);
                }}
                className="flex items-center gap-1.5 rounded bg-emerald-600 px-5 py-2 text-[12.5px] font-medium text-white shadow hover:bg-emerald-700"
              >
                <Zap size={14} className="fill-white" />
                تایید و ثبت پرداخت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ledger & Transactions table */}
      <div className={`mt-4 rounded border p-3 ${t.border}`}>
        <div className="mb-2 flex items-center justify-between">
          <div className={`text-[13px] font-semibold ${t.text}`}>پرونده مالی قرارداد / صورتحساب‌ها و دریافتی‌ها</div>
          <span className={`text-[12px] ${t.sub}`}>تعداد تراکنش‌ها: {fa(payments.length + invoices.length)}</span>
        </div>
        <table className="w-full text-[12.5px]">
          <thead className={`${t.head} ${t.sub}`}>
            <tr>
              {["ردیف", "شرح تراکنش", "تاریخ", "روش پرداخت", "شماره ارجاع / فاکتور", "مبلغ", "وضعیت"].map((h) => (
                <th key={h} className="px-3 py-2 text-right font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={t.text}>
            {payments.map((p, i) => (
              <tr key={"pay-" + p.id} className={`border-b ${t.border} bg-emerald-500/5`}>
                <td className="px-3 py-2.5">{fa(i + 1)}</td>
                <td className="px-3 py-2.5 font-medium flex items-center gap-1.5">
                  <ArrowDownCircle size={14} className="text-emerald-500 shrink-0" />
                  {p.title}
                </td>
                <td className="px-3 py-2.5">{fa(p.date)}</td>
                <td className="px-3 py-2.5">{p.method}</td>
                <td className="px-3 py-2.5">{p.ref || "-"}</td>
                <td className="px-3 py-2.5 font-medium text-emerald-500">+{money(p.amount)}</td>
                <td className="px-3 py-2.5 text-emerald-500 font-semibold">تسویه شده</td>
              </tr>
            ))}

            {invoices.map((iv, i) => (
              <tr key={"inv-" + iv.id} className={`border-b ${t.border}`}>
                <td className="px-3 py-2.5">{fa(payments.length + i + 1)}</td>
                <td className="px-3 py-2.5 flex items-center gap-1.5">
                  <Receipt size={14} className="text-amber-500 shrink-0" />
                  {iv.title}
                </td>
                <td className="px-3 py-2.5">{fa(iv.date)}</td>
                <td className="px-3 py-2.5">فاکتور قطعات و دستمزد</td>
                <td className="px-3 py-2.5">-</td>
                <td className="px-3 py-2.5 text-amber-500 font-medium">-{money(iv.amount)}</td>
                <td className="px-3 py-2.5 text-amber-500">بدهکار</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={`${t.text} font-semibold`}>
              <td colSpan={5} className="px-3 py-2.5 text-left">
                مانده بدهی کل قرارداد:
              </td>
              <td className="px-3 py-2.5 text-amber-500">{money(debt)}</td>
              <td>
                {debt === 0 ? (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-500">
                    کاملاً تسویه شده
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-500">
                    دارای مانده
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Service Report Modal Window */}
      {serviceReportModalMonth && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setServiceReportModalMonth(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative flex h-[92vh] w-full max-w-[1300px] flex-col overflow-hidden rounded-2xl border shadow-2xl ${t.border} ${
              t.dark ? "bg-[#161616]" : "bg-neutral-50"
            }`}
          >
            <ServiceForm
              t={t}
              planDate={`${serviceReportModalMonth.y}/${String(serviceReportModalMonth.id).padStart(2, "0")}/13`}
              baseAmount={serviceReportModalMonth.amount || 7000000}
              contractRibbon={
                <ContractRibbonBar
                  t={t}
                  contract={contract}
                  contractNo={contract.no}
                  totalPayable={totalPayable}
                  totalPaid={totalPaid}
                  debt={debt}
                  buildingDebt={debt}
                  customerDebt={debt}
                />
              }
              initialData={{
                techs: serviceReportModalMonth.techs,
                doneBy: serviceReportModalMonth.doneBy || "محسن امامی برسری",
                report: serviceReportModalMonth.report,
                reminder: serviceReportModalMonth.reminder,
                doneDate: serviceReportModalMonth.date || "1405/06/25",
                inTime: serviceReportModalMonth.inTime || "10:00",
                outTime: serviceReportModalMonth.outTime || "11:30",
                wage: serviceReportModalMonth.wage,
                trip: serviceReportModalMonth.trip,
                discount: serviceReportModalMonth.discount,
                faultsList: serviceReportModalMonth.faultsList,
                partsList: serviceReportModalMonth.partsList,
              }}
              onBack={() => setServiceReportModalMonth(null)}
              onSubmit={(d) => {
                appStore.addServiceSubmission(contract.id, serviceReportModalMonth.id, d);
                setServiceReportModalMonth(null);
                notify("گزارش سرویس با موفقیت ثبت و ذخیره شد");
              }}
            />
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
          notify("خرابی جدید با موفقیت ثبت گردید");
          setIsBreakdownModalOpen(false);
        }}
      />

      {toast && (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-800 px-4 py-2 text-[12.5px] text-white shadow-lg">
          {toast}
        </div>
      )}
      <span className="hidden">{MONTHS.length}</span>
    </div>
  );
}

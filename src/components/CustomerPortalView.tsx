import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Building2,
  CalendarDays,
  FileText,
  User,
  Phone,
  LogOut,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Printer,
  X,
  ExternalLink,
  MapPin,
  Send,
  HelpCircle,
  Eye,
  FileCheck2,
  AlertTriangle,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import { Contract } from "../data";
import { MonthService, PaymentRecord, appStore } from "../store";
import { CustomerAuthData, cleanIranianPhone } from "../utils/customerAuth";
import BrandLogo from "./BrandLogo";

interface CustomerPortalViewProps {
  customer: CustomerAuthData;
  onSignOut: () => void;
}

export default function CustomerPortalView({ customer, onSignOut }: CustomerPortalViewProps) {
  // یافتن تمام قراردادهای مرتبط با شماره موبایل یا نام این مشتری
  const userPhone = cleanIranianPhone(customer.phone);

  const customerContracts = useMemo(() => {
    const all = appStore.getContracts();
    const matched = all.filter((c) => {
      const p1 = cleanIranianPhone(c.phone);
      const p2 = cleanIranianPhone(c.coordinatorPhone);
      if (userPhone && (p1 === userPhone || p2 === userPhone)) return true;
      if (
        customer.name &&
        customer.name !== "مشتری گرامی" &&
        ((c.customer && c.customer.includes(customer.name)) ||
          (c.building && c.building.includes(customer.name)))
      ) {
        return true;
      }
      return false;
    });

    if (matched.length > 0) return matched;

    // در صورتی که شماره در قراردادهای پیش‌فرض موجود نبود، قرارداد اولیه این مشتری ایجاد/بازیابی می‌شود
    const fallback = appStore.getOrCreateContractForCustomer(
      customer.name || "مشتری گرامی",
      66000000
    );
    return [fallback];
  }, [userPhone, customer.name]);

  const [selectedContractId, setSelectedContractId] = useState<number>(
    customerContracts[0]?.id || 1
  );

  const activeContract: Contract = useMemo(() => {
    return (
      customerContracts.find((c) => c.id === selectedContractId) ||
      customerContracts[0]
    );
  }, [customerContracts, selectedContractId]);

  // دریافت جزئیات خدمات و پرداختی‌های قرارداد
  const contractDetails = useMemo(() => {
    if (!activeContract) return { months: [] as MonthService[], payments: [] as PaymentRecord[] };
    return appStore.getContractDetails(activeContract.id);
  }, [activeContract]);

  // تب‌های پرتال مشتری
  const [activeTab, setActiveTab] = useState<"services" | "finance" | "contract" | "breakdown">(
    "services"
  );

  // مودال مشاهده برگه گزارش سرویس (فقط خواندنی)
  const [reportModalMonth, setReportModalMonth] = useState<MonthService | null>(null);

  // فرم ثبت خرابی توسط کارفرما
  const [breakdownText, setBreakdownText] = useState("");
  const [breakdownType, setBreakdownType] = useState("توقف آسانسور");
  const [breakdownSent, setBreakdownSent] = useState(false);

  // محاسبات مالی
  const totalAmount = useMemo(() => {
    const sumMonths = contractDetails.months.reduce((acc, m) => acc + (m.amount || 0), 0);
    return sumMonths > 0 ? sumMonths : 66000000;
  }, [contractDetails.months]);

  const totalPaid = useMemo(() => {
    return contractDetails.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [contractDetails.payments]);

  const remainingDebt = Math.max(0, totalAmount - totalPaid);

  const handleSendBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakdownText.trim()) return;

    // ثبت در صف سیستم
    const newBreakdown = {
      id: Date.now(),
      contractId: activeContract.id,
      contractNo: activeContract.no,
      buildingName: activeContract.building || activeContract.buildingName || "ساختمان کارفرما",
      customerName: customer.name,
      customerPhone: customer.phone,
      problemType: breakdownType,
      description: breakdownText.trim(),
      regDate: new Date().toLocaleDateString("fa-IR"),
      status: "pending",
      priority: "urgent",
    };

    try {
      const saved = localStorage.getItem("tlift_customer_breakdowns") || "[]";
      const list = JSON.parse(saved);
      list.unshift(newBreakdown);
      localStorage.setItem("tlift_customer_breakdowns", JSON.stringify(list));
    } catch (err) {
      console.warn("Error saving customer breakdown", err);
    }

    setBreakdownSent(true);
    setBreakdownText("");
    setTimeout(() => setBreakdownSent(false), 5000);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-slate-100 font-[Tahoma,system-ui] text-slate-800 antialiased selection:bg-blue-500 selection:text-white"
    >
      {/* نوار بالای پرتال اختصاصی کارفرما */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-11 w-11 shadow-xs" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                  شرکت آسانسور و پله‌برقی آسمان‌سرا
                </h1>
                <span className="hidden items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 sm:inline-flex border border-blue-200/60">
                  <ShieldCheck size={13} className="text-blue-600" />
                  پرتال اختصاصی کارفرما
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                مشاهده وضعیت سرویس و نگهداری دوره‌ای، گزارشات فنی و امور مالی قرارداد آسانسور
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* مشخصات کارفرما */}
            <div className="hidden text-left sm:block">
              <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-800">
                <User size={14} className="text-slate-500" />
                <span>{customer.name || "کارفرمای محترم"}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {customer.phone || "بدون شماره"}
              </div>
            </div>

            {/* برچسب فقط‌خواندنی */}
            <div className="hidden md:flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200">
              <BadgeCheck size={14} className="text-emerald-600" />
              <span>نظارت فقط‌خواندنی</span>
            </div>

            {/* خروج از حساب */}
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition active:scale-95"
              title="خروج از حساب کاربری"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* بخش بدنه پرتال */}
      <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
        {/* انتخابگر آسانسور / قرارداد در صورت وجود چند قرارداد */}
        {customerContracts.length > 1 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="mb-2 text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 size={15} className="text-blue-600" />
              <span>انتخاب ساختمان / آسانسور مورد نظر:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {customerContracts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedContractId(c.id)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-right transition ${
                    activeContract?.id === c.id
                      ? "border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 flex items-center justify-between w-full">
                    <span>{c.building || c.buildingName || "ساختمان"}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono">
                      #{c.no}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                    {c.address || c.zone || "منطقه تحت پوشش آسمان‌سرا"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* کارت خلاصه مشخصات قرارداد فعال */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                    {activeContract?.building || activeContract?.buildingName || "ساختمان طرف قرارداد"}
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                    قرارداد معتبر و فعال
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{activeContract?.address || "قزوین، منطقه تحت پوشش شرکت آسمان‌سرا"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="tel:09192868509"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
              >
                <Phone size={14} />
                <span>تماس با مدیر فنی (امامی)</span>
              </a>
            </div>
          </div>

          {/* اطلاعات سریع قرارداد */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-[11px] text-slate-500">شماره قرارداد:</span>
              <div className="font-bold text-slate-800 text-sm mt-0.5 font-mono">
                {activeContract?.no || "۵۱۶۷"}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-[11px] text-slate-500">مدیر / هماهنگ‌کننده:</span>
              <div className="font-bold text-slate-800 text-xs mt-0.5">
                {activeContract?.manager || activeContract?.coordinator || customer.name || "محترم"}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-[11px] text-slate-500">دوره اعتبار قرارداد:</span>
              <div className="font-bold text-slate-800 text-xs mt-0.5">
                {activeContract?.start || "۱۴۰۵/۰۱/۰۱"} تا {activeContract?.end || "۱۴۰۶/۰۱/۰۱"}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-[11px] text-slate-500">مسئول سرویس و هماهنگی:</span>
              <div className="font-bold text-blue-700 text-xs mt-0.5">
                محسن امامی برسری (۰۹۱۹۲۸۶۸۵۰۹)
              </div>
            </div>
          </div>
        </div>

        {/* منوی تب‌های پرتال کارفرما */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-3 pt-2 gap-1 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "services"
                ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays size={16} />
            <span>سرویس و نگهداری ماهانه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "finance"
                ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard size={16} />
            <span>امور مالی و پرداختی‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contract")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "contract"
                ? "border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={16} />
            <span>مشخصات فنی و مفاد قرارداد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("breakdown")}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "breakdown"
                ? "border-rose-600 text-rose-600 bg-rose-50/40 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle size={16} className="text-amber-500" />
            <span>اعلام خرابی و درخواست سرویس</span>
          </button>
        </div>

        {/* محتوای تب ۱: سرویس و نگهداری ماهانه */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {/* کارت راهنما */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
              <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">وضعیت دوره‌ای سرویس و نگهداری آسانسور ساختمان شما</p>
                <p className="mt-1 text-blue-800 leading-relaxed">
                  آسانسور شما طبق قرارداد به صورت ماهانه توسط تکنسین‌های مجرب شرکت آسمان‌سرا بازدید و
                  چک‌لیست ۳۸ بندی استاندارد (موتورخانه، ترمزها، سیم‌بکسل، چاه، درب‌ها و کابین) روی آن اعمال
                  می‌گردد. با کلیک بر روی <strong>«مشاهده گزارش سرویس»</strong> می‌توانید برگه گزارش رسمی و
                  امضا شده هر ماه را ملاحظه و چاپ نمایید.
                </p>
              </div>
            </div>

            {/* جدول ماه‌های سرویس */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold">دوره ماهانه</th>
                      <th className="p-3 font-bold">وضعیت سرویس</th>
                      <th className="p-3 font-bold">تاریخ انجام</th>
                      <th className="p-3 font-bold">تکنسین مسئول</th>
                      <th className="p-3 font-bold">شماره پیگیری</th>
                      <th className="p-3 font-bold text-center">برگه گزارش سرویس</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contractDetails.months.map((m, idx) => {
                      const isDone = m.done === true;
                      const isPaid = m.paid === true;

                      return (
                        <tr key={m.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-800">
                            {m.m} {m.y}
                          </td>
                          <td className="p-3">
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 size={13} />
                                انجام شد
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                                <Clock size={13} />
                                در نوبت بازدید
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-mono">
                            {m.date || m.plannedDate || "-"}
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            {m.doneBy || (m.techs && m.techs[0]) || "میثم سهرابی"}
                          </td>
                          <td className="p-3 text-slate-500 font-mono">
                            {m.serviceNo || (isDone ? `SRV-${activeContract.no}-${idx + 1}` : "-")}
                          </td>
                          <td className="p-3 text-center">
                            {isDone ? (
                              <button
                                type="button"
                                onClick={() => setReportModalMonth(m)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition active:scale-95 shadow-2xs"
                              >
                                <Eye size={13} />
                                <span>مشاهده برگه گزارش</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* محتوای تب ۲: امور مالی و پرداختی‌ها */}
        {activeTab === "finance" && (
          <div className="space-y-5">
            {/* کارت‌های خلاصه وضعیت مالی */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium">مبلغ کل قرارداد سالانه</span>
                <div className="mt-1 text-xl font-bold text-slate-900">
                  {(totalAmount / 10).toLocaleString("fa-IR")}{" "}
                  <span className="text-xs font-normal text-slate-500">تومان</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400 font-mono">
                  {totalAmount.toLocaleString("fa-IR")} ریال
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
                <span className="text-xs text-emerald-700 font-medium">مجموع مبالغ پرداخت‌شده</span>
                <div className="mt-1 text-xl font-bold text-emerald-800">
                  {(totalPaid / 10).toLocaleString("fa-IR")}{" "}
                  <span className="text-xs font-normal text-emerald-600">تومان</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 font-mono">
                  {totalPaid.toLocaleString("fa-IR")} ریال
                </div>
              </div>

              <div
                className={`rounded-xl border p-4 shadow-2xs ${
                  remainingDebt === 0
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50/50"
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    remainingDebt === 0 ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  وضعیت مانده / تسویه حساب
                </span>
                <div
                  className={`mt-1 text-xl font-bold ${
                    remainingDebt === 0 ? "text-emerald-800" : "text-amber-900"
                  }`}
                >
                  {remainingDebt === 0 ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      تسویه کامل شده
                    </span>
                  ) : (
                    <>
                      {(remainingDebt / 10).toLocaleString("fa-IR")}{" "}
                      <span className="text-xs font-normal">تومان مانده</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {remainingDebt === 0
                    ? "کلیه تعهدات مالی تا این تاریخ تسویه گردیده است."
                    : `${remainingDebt.toLocaleString("fa-IR")} ریال`}
                </div>
              </div>
            </div>

            {/* جدول ریز پرداخت‌ها و رسیدها */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Receipt size={16} className="text-slate-600" />
                  <span>ریز تراکنش‌ها و پرداخت‌های ثبت‌شده در حسابداری</span>
                </h3>
                <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  فقط مشاهده و بدون امکان ویرایش
                </span>
              </div>

              {contractDetails.payments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  هیچ سابقه پرداختی جداگانه‌ای ثبت نشده است یا پرداخت‌ها در قالب تسویه نهایی قرارداد انجام شده‌اند.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-bold">ردیف</th>
                        <th className="p-3 font-bold">عنوان / بابت</th>
                        <th className="p-3 font-bold">تاریخ پرداخت</th>
                        <th className="p-3 font-bold">مبلغ (تومان)</th>
                        <th className="p-3 font-bold">روش پرداخت</th>
                        <th className="p-3 font-bold">کد رهگیری / ارجاع</th>
                        <th className="p-3 font-bold">وضعیت حسابداری</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {contractDetails.payments.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800">
                            {p.title || p.forReason || "حق سرویس و نگهداری آسانسور"}
                          </td>
                          <td className="p-3 text-slate-600 font-mono">{p.date || p.regDate || "-"}</td>
                          <td className="p-3 font-bold text-slate-900">
                            {((p.amount || 0) / 10).toLocaleString("fa-IR")}
                          </td>
                          <td className="p-3 text-slate-700">{p.method || p.paymentType || "واریز بانکی"}</td>
                          <td className="p-3 text-slate-500 font-mono">{p.ref || "CSH-5475-01"}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 size={11} />
                              تأیید و ثبت در دفتر
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* محتوای تب ۳: مشخصات فنی و مفاد قرارداد */}
        {activeTab === "contract" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <FileText size={18} className="text-blue-600" />
                <span>مشخصات رسمی قرارداد سرویس و نگهداری</span>
              </h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">شماره قرارداد:</span>
                  <div className="font-bold text-slate-900 mt-1 font-mono">{activeContract.no}</div>
                </div>
                <div>
                  <span className="text-slate-500">نام ساختمان:</span>
                  <div className="font-bold text-slate-900 mt-1">
                    {activeContract.building || activeContract.buildingName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">طرف قرارداد / کارفرما:</span>
                  <div className="font-bold text-slate-900 mt-1">{customer.name}</div>
                </div>
                <div>
                  <span className="text-slate-500">شماره تماس هماهنگ‌کننده:</span>
                  <div className="font-bold text-slate-900 mt-1 font-mono">{customer.phone}</div>
                </div>
                <div>
                  <span className="text-slate-500">تاریخ شروع قرارداد:</span>
                  <div className="font-bold text-slate-900 mt-1">{activeContract.start}</div>
                </div>
                <div>
                  <span className="text-slate-500">تاریخ پایان اعتبار:</span>
                  <div className="font-bold text-slate-900 mt-1">{activeContract.end}</div>
                </div>
                <div>
                  <span className="text-slate-500">شرکت مجری:</span>
                  <div className="font-bold text-blue-700 mt-1">
                    شرکت آسانسور و پله برقی آسمان سرا
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">مدیر و مسئول فنی:</span>
                  <div className="font-bold text-slate-900 mt-1">مهندس محسن امامی برسری</div>
                </div>
                <div>
                  <span className="text-slate-500">پوشش بیمه مسئولیت مدنی:</span>
                  <div className="font-bold text-emerald-700 mt-1 flex items-center gap-1">
                    <ShieldCheck size={14} />
                    دارای بیمه‌نامه معتبر سالانه
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-bold text-slate-800 mb-2">تعهدات و استانداردهای بازدید ماهانه:</h4>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>بازدید و روغن‌کاری ماهیانه ریل‌ها، سیستم تعلیق، کفشک‌ها و ترمز الکترومکانیکی موتور.</li>
                <li>تست و کالیبراسیون مدار ایمنی، کنتاکت‌های درب طبقات، پاراشوت و لیمیت سوئیچ‌ها.</li>
                <li>ثبت برگه گزارش فنی ممهور به امضای سرویس‌کار در هر مراجعه و قرارگیری آنلاین در این سامانه.</li>
                <li>حضور سریع در موارد اضطراری و رفع خرابی با تماس با مرکز پیام شرکت.</li>
              </ul>
            </div>
          </div>
        )}

        {/* محتوای تب ۴: اعلام خرابی و درخواست سرویس اضطراری */}
        {activeTab === "breakdown" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <span>ثبت پیام خرابی آسانسور / درخواست اعزام سرویس‌کار</span>
              </h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                در صورت بروز هرگونه نقص فنی یا صدای غیرعادی در آسانسور ساختمان، می‌توانید از طریق فرم زیر
                موضوع را ثبت نمایید تا بلافاصله در کارتابل تکنسین‌های شرکت آسمان‌سرا قرار گیرد.
              </p>

              {breakdownSent && (
                <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>
                    درخواست خرابی شما با موفقیت ثبت شد و به تکنسین کشیک ارجاع داده شد. با شما تماس گرفته خواهد شد.
                  </span>
                </div>
              )}

              <form onSubmit={handleSendBreakdown} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع مشکل فنی:</label>
                  <select
                    value={breakdownType}
                    onChange={(e) => setBreakdownType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  >
                    <option value="توقف آسانسور">توقف آسانسور و عدم حرکت</option>
                    <option value="ایراد در باز یا بسته شدن درب">ایراد در باز یا بسته شدن درب طبقات یا کابین</option>
                    <option value="صدای غیرعادی و لرزش">صدای غیرعادی در موتورخانه یا لرزش در حرکت</option>
                    <option value="هم‌سطح نشدن با طبقه">هم‌سطح نشدن کابین با طبقات (عدم لول)</option>
                    <option value="خاموشی روشنایی یا کلیدها">خاموشی روشنایی کابین یا کار نکردن شستی‌ها</option>
                    <option value="سایر موارد">سایر موارد و توضیحات خاص</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شرح کامل نقص و طبقه مورد نظر:
                  </label>
                  <textarea
                    rows={4}
                    value={breakdownText}
                    onChange={(e) => setBreakdownText(e.target.value)}
                    placeholder="لطفاً توضیح دهید آسانسور در چه طبقه‌ای متوقف است یا چه علائمی دارد..."
                    className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition active:scale-95"
                >
                  <Send size={15} />
                  <span>ثبت فوری درخواست خرابی و اعزام تکنسین</span>
                </button>
              </form>
            </div>

            {/* کارت تماس اضطراری */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Phone size={16} className="text-amber-600" />
                <span>شماره‌های تماس اضطراری ۲۴ ساعته</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                در صورت گیر کردن افراد در کابین یا شرایط اضطراری، فوراً با شماره مستقیم مدیریت فنی تماس بگیرید:
              </p>

              <div className="space-y-2 pt-2">
                <a
                  href="tel:09192868509"
                  className="flex items-center justify-between rounded-lg bg-white border border-amber-300 p-3 text-xs font-bold text-slate-900 hover:bg-amber-100/50 transition"
                >
                  <span>مدیر فنی (محسن امامی)</span>
                  <span className="text-blue-700 font-mono">09192868509</span>
                </a>

                <a
                  href="tel:09126817884"
                  className="flex items-center justify-between rounded-lg bg-white border border-amber-300 p-3 text-xs font-bold text-slate-900 hover:bg-amber-100/50 transition"
                >
                  <span>سرپرست سرویس‌کاران (سهرابی)</span>
                  <span className="text-blue-700 font-mono">09126817884</span>
                </a>
              </div>

              <div className="rounded-lg bg-white/80 p-3 border border-amber-200 text-[11px] text-slate-500">
                ساعات پاسخگویی اداری: ۸:۳۰ الی ۱۷:۳۰
                <br />
                خط اضطراری و حوادث: شبانه‌روزی
              </div>
            </div>
          </div>
        )}
      </main>

      {/* مودال مشاهده برگه گزارش سرویس ماهیانه (کاملاً فقط خواندنی و با قابلیت چاپ) */}
      {reportModalMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* سربرگ مودال */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <FileCheck2 size={20} className="text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  برگه رسمی گزارش فنی سرویس آسانسور - ماه {reportModalMonth.m} {reportModalMonth.y}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <Printer size={14} />
                  <span>چاپ برگه</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportModalMonth(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* محتوای برگه گزارش سرویس */}
            <div className="overflow-y-auto p-6 space-y-6 text-xs text-slate-800">
              {/* هدر رسمی برگه */}
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <BrandLogo className="h-10 w-10" />
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        شرکت آسانسور و پله برقی آسمان‌سرا
                      </div>
                      <div className="text-[11px] text-slate-500">
                        گزارش ادواری سرویس و نگهداری و بازرسی ایمنی آسانسور
                      </div>
                    </div>
                  </div>
                  <div className="text-left font-mono text-[11px] text-slate-600">
                    <div>شماره سرویس: {reportModalMonth.serviceNo || `SRV-${activeContract.no}`}</div>
                    <div>تاریخ سرویس: {reportModalMonth.date || reportModalMonth.plannedDate || "-"}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500">ساختمان:</span>{" "}
                    <span className="font-bold">{activeContract.building || activeContract.buildingName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">شماره قرارداد:</span>{" "}
                    <span className="font-bold font-mono">{activeContract.no}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">کارفرما / مدیر:</span>{" "}
                    <span className="font-bold">{customer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">تکنسین مسئول:</span>{" "}
                    <span className="font-bold text-blue-700">
                      {reportModalMonth.doneBy || "میثم سهرابی"}
                    </span>
                  </div>
                </div>
              </div>

              {/* چک‌لیست موارد بررسی شده */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>اقلام بازرسی و کنترل شده در این سرویس:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {[
                    "روغن‌کاری و بازدید سطح روغن موتور گیربکس",
                    "بررسی لنت‌ها و فاصله ترمز الکترومکانیکی",
                    "کنترل فرسودگی سیم‌بکسل‌ها و کشش هماهنگ",
                    "بازدید فن تهویه و سیستم خنک‌کننده موتور",
                    "تست عملکرد قفل درب‌ها و کنتاکت‌های ایمنی طبقات",
                    "روغن‌کاری ریل‌های کابین و وزنه تعادل و کفشک‌ها",
                    "بررسی استپ قارچی و کلیدهای لیمیت شالتر",
                    "کنترل فتوسل چشمی و سیستم ایمنی باز شدن درب",
                    "بررسی زنگ اضطراری، تلفن و روشنایی اضطراری کابین",
                    "آچارکشی ترمینال‌ها و اتصالات تابلو فرمان و کنتاکتورها",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-100"
                    >
                      <span>{item}</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        سالم و تنظیم شد
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* توضیحات و توصیه‌های فنی */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="font-bold text-xs text-slate-800 mb-1">
                  توضیحات و گزارش فنی تکنسین سرویس:
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {reportModalMonth.report ||
                    `کلیه اجزای مکانیکی و الکتریکی آسانسور در تاریخ ${reportModalMonth.date || "جاری"} مورد بازرسی قرار گرفت. سیستم در شرایط استاندارد و ایمن به مدیر محترم ساختمان تحویل گردید.`}
                </p>
              </div>

              {/* امضا و تأییدیه */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-xs">
                <div>
                  <div className="text-slate-500">مهر و تأییدیه شرکت:</div>
                  <div className="font-bold text-blue-800 mt-1">شرکت فنی مهندسی آسان‌سرا (امامی)</div>
                </div>
                <div className="text-left">
                  <div className="text-slate-500">امضای تکنسین مسئول انجام:</div>
                  <div className="font-bold text-slate-900 mt-1">
                    {reportModalMonth.doneBy || "میثم سهرابی"}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                    تأییدیه الکترونیکی ثبت شد
                  </div>
                </div>
              </div>
            </div>

            {/* فوتر مودال */}
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setReportModalMonth(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 transition"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

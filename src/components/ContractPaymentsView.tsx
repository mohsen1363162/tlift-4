import { useState } from "react";
import {
  CreditCard,
  Plus,
  Printer,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Filter,
  ArrowLeft,
  Pin,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  Building2,
  Search,
} from "lucide-react";
import { Contract } from "../data";
import { PaymentRecord, appStore, useContractDetails } from "../store";

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

interface ContractPaymentsViewProps {
  t: ThemeProps;
  contract: Contract;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

// Convert English digits to Persian
const fa = (n: string | number) =>
  String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

// Number to Persian words helper for receipt
function numberToPersianWords(num: number): string {
  if (num === 0) return "صفر";
  const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
  const teens = [
    "ده",
    "یازده",
    "دوازده",
    "سیزده",
    "چهارده",
    "پانزده",
    "شانزده",
    "هفده",
    "هجده",
    "نوزده",
  ];
  const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
  const hundreds = [
    "",
    "یکصد",
    "دویست",
    "سیصد",
    "چهارصد",
    "پانصد",
    "ششصد",
    "هفتصد",
    "هشتصد",
    "نهصد",
  ];
  const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

  const chunkThree = (n: number) => {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) parts.push(hundreds[h]);
    if (t === 1) {
      parts.push(teens[o]);
    } else {
      if (t > 1) parts.push(tens[t]);
      if (o > 0) parts.push(ones[o]);
    }
    return parts.join(" و ");
  };

  const chunks: string[] = [];
  let scaleIndex = 0;
  let remaining = num;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk > 0) {
      const chunkWord = chunkThree(chunk);
      const scaleWord = scales[scaleIndex];
      chunks.unshift(scaleWord ? `${chunkWord} ${scaleWord}` : chunkWord);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex++;
  }

  return chunks.join(" و ") + " ریال تمام";
}

export function ContractPaymentsView({
  t,
  contract,
  onBack,
  onShowToast,
}: ContractPaymentsViewProps) {
  const details = useContractDetails(contract.id);
  const { months, payments, invoices } = details;

  // Financial calculations
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
    ["مسئول هماهنگی/مشتری", contract.manager || contract.building],
  ];

  // Modals state
  const [isManualPayModalOpen, setIsManualPayModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Form State for Manual Payment
  const [formAmount, setFormAmount] = useState("");
  const [formType, setFormType] = useState("نقد");
  const [formReason, setFormReason] = useState(
    `قرارداد سرویس و نگهداری بشماره : ${contract.no}`
  );
  const [formPayDate, setFormPayDate] = useState("13 شهریور 1405");
  const [formRegDate, setFormRegDate] = useState("13 شهریور 1405");
  const [formCustomer, setFormCustomer] = useState(
    contract.manager?.startsWith("*") ? contract.manager : `* ${contract.manager || "حسینی فر"}`
  );
  const [formBuilding, setFormBuilding] = useState(
    contract.buildingName || contract.building || "حسینی فر چهاراه پادگان"
  );
  const [formAddress, setFormAddress] = useState(
    contract.address || "قزوین چهار راه پادگان نبش کوچه متانت ساختمان آریامهر"
  );
  const [formRef, setFormRef] = useState("");
  const [formBank, setFormBank] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const openNewManualPayment = (isInstallment = false) => {
    setEditingPayment(null);
    const suggestedAmt = isInstallment
      ? 8500000
      : debt > 0
      ? debt
      : 66000000;
    setFormAmount(suggestedAmt.toLocaleString("en-US"));
    setFormType(isInstallment ? "اقساطی" : "نقد");
    setFormReason(
      isInstallment
        ? `قسط ماهیانه قرارداد سرویس و نگهداری بشماره : ${contract.no}`
        : `قرارداد سرویس و نگهداری بشماره : ${contract.no}`
    );
    setFormPayDate("13 شهریور 1405");
    setFormRegDate("13 شهریور 1405");
    setFormCustomer(
      contract.manager?.startsWith("*") ? contract.manager : `* ${contract.manager || "حسینی فر"}`
    );
    setFormBuilding(contract.buildingName || contract.building || "حسینی فر چهاراه پادگان");
    setFormAddress(
      contract.address || "قزوین چهار راه پادگان نبش کوچه متانت ساختمان آریامهر"
    );
    setFormRef(`TRX-${Math.floor(10000 + Math.random() * 90000)}`);
    setFormBank("");
    setFormNotes("");
    setIsManualPayModalOpen(true);
  };

  const openEditPayment = (p: PaymentRecord) => {
    setEditingPayment(p);
    setFormAmount(p.amount.toLocaleString("en-US"));
    setFormType(p.paymentType || p.method || "نقد");
    setFormReason(p.forReason || p.title || `قرارداد سرویس و نگهداری بشماره : ${contract.no}`);
    setFormPayDate(p.date);
    setFormRegDate(p.regDate || p.date);
    setFormCustomer(p.customerName || contract.manager || "* حسینی فر");
    setFormBuilding(p.buildingName || contract.building || "حسینی فر چهاراه پادگان");
    setFormAddress(p.buildingAddress || contract.address || "");
    setFormRef(p.ref || "");
    setFormBank(p.bank || "");
    setFormNotes(p.notes || "");
    setIsManualPayModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSavePayment = () => {
    const cleanAmt = parseInt(formAmount.replace(/\D/g, ""), 10);
    if (!cleanAmt || cleanAmt <= 0) {
      onShowToast("لطفاً مبلغ معتبری وارد نمایید");
      return;
    }

    if (editingPayment) {
      appStore.updatePayment(contract.id, editingPayment.id, {
        amount: cleanAmt,
        paymentType: formType,
        method: formType,
        title: formReason,
        forReason: formReason,
        date: formPayDate,
        regDate: formRegDate,
        customerName: formCustomer,
        buildingName: formBuilding,
        buildingAddress: formAddress,
        ref: formRef,
        bank: formBank,
        notes: formNotes,
      });
      onShowToast("پرداختی با موفقیت ویرایش شد");
    } else {
      appStore.addPayment(contract.id, {
        title: formReason,
        forReason: formReason,
        amount: cleanAmt,
        date: formPayDate,
        regDate: formRegDate,
        method: formType,
        paymentType: formType,
        customerName: formCustomer,
        buildingName: formBuilding,
        buildingAddress: formAddress,
        ref: formRef,
        bank: formBank,
        notes: formNotes,
      });
      onShowToast("پرداختی جدید به صورت دستی با موفقیت ثبت گردید");
    }

    setIsManualPayModalOpen(false);
  };

  const handleDeletePayment = (paymentId: number) => {
    if (confirm("آیا از حذف این پرداختی اطمینان دارید؟")) {
      appStore.deletePayment(contract.id, paymentId);
      onShowToast("پرداختی با موفقیت حذف گردید");
      setActiveMenuId(null);
    }
  };

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (p.customerName || "").toLowerCase().includes(q) ||
      (p.forReason || "").toLowerCase().includes(q) ||
      (p.title || "").toLowerCase().includes(q) ||
      (p.method || "").toLowerCase().includes(q) ||
      (p.paymentType || "").toLowerCase().includes(q) ||
      (p.ref || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 font-[Tahoma,system-ui]">
      {/* 1. Header Stats Strip (identical to ContractView & sshot-2.png) */}
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

      <div className={`mt-1 flex items-center justify-center gap-1 text-[12px] ${t.sub}`}>
        <ChevronDown size={13} /> مشاهده بیشتر
      </div>

      {/* 2. Top bar: Back button & Title (matching sshot-2.png) */}
      <div className="mt-2 flex items-center justify-between border-b pb-2" style={{ borderColor: "inherit" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded border text-violet-500 bg-violet-500/10">
            <CreditCard size={17} />
          </div>
          <span className={`text-[15px] font-bold ${t.text}`}>پرداختی ها</span>
          <span className={`rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-600`}>
            قرارداد {fa(contract.no)}
          </span>
        </div>

        <button
          type="button"
          onClick={onBack}
          className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[12.5px] font-medium ${t.border} ${t.text} ${t.hover} transition-colors`}
        >
          <ArrowLeft size={15} />
          بازگشت به قرارداد
        </button>
      </div>

      {/* 3. Toolbar: Right (Registration buttons) | Left (Tools: Print, Refresh, Settings, Export) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {/* Right side buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openNewManualPayment(false)}
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-[12.5px] font-medium text-white shadow-sm hover:bg-purple-700 transition-colors"
          >
            <Plus size={15} />
            ثبت پرداختی
          </button>

          <button
            type="button"
            onClick={() => openNewManualPayment(true)}
            className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[12.5px] font-medium ${t.border} ${t.text} ${t.hover} transition-colors`}
          >
            <Plus size={14} className={t.sub} />
            ثبت قسط جدید
          </button>
        </div>

        {/* Left side utility icons */}
        <div className="flex items-center gap-1.5">
          {/* Quick Filter toggle */}
          <button
            type="button"
            title="فیلتر سریع"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`rounded border p-2 text-[13px] ${t.border} ${
              isFilterOpen ? "bg-violet-500/20 text-violet-400" : t.sub
            } ${t.hover}`}
          >
            <Filter size={15} />
          </button>

          {/* Settings icon */}
          <button
            type="button"
            title="تنظیمات ستون‌ها"
            onClick={() => onShowToast("تنظیمات نمایش ستون‌ها")}
            className={`rounded border p-2 text-[13px] ${t.border} ${t.sub} ${t.hover}`}
          >
            <SlidersHorizontal size={15} />
          </button>

          {/* Refresh icon */}
          <button
            type="button"
            title="به‌روزرسانی"
            onClick={() => onShowToast("اطلاعات پرداختی‌ها به‌روز شد")}
            className={`rounded border p-2 text-[13px] ${t.border} ${t.sub} ${t.hover}`}
          >
            <RotateCcw size={15} />
          </button>

          {/* PRINT BUTTON (User explicit request: "در ضمن در کنار گوشه‌ای که خودت مناسب میدونی، پرینت اون رو هم برای من بذار") */}
          <button
            type="button"
            title="چاپ لیست و گزارش پرداختی‌ها"
            onClick={() => setIsPrintReportOpen(true)}
            className={`flex items-center gap-1.5 rounded border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-[12.5px] font-semibold text-purple-600 hover:bg-purple-500/20 transition-colors`}
          >
            <Printer size={15} className="text-purple-600" />
            <span>چاپ پرداختی‌ها</span>
          </button>

          {/* PDF export */}
          <button
            type="button"
            title="خروجی PDF"
            onClick={() => setIsPrintReportOpen(true)}
            className={`rounded border p-2 text-[13px] ${t.border} ${t.sub} ${t.hover}`}
          >
            <FileText size={15} />
          </button>

          {/* Excel export */}
          <button
            type="button"
            title="خروجی اکسل (CSV)"
            onClick={() => {
              const csvContent =
                "ردیف,نام مشتری,نوع پرداخت,بابت,مبلغ,تاریخ ثبت,تاریخ پرداخت,نام ساختمان,آدرس ساختمان\n" +
                payments
                  .map(
                    (p, idx) =>
                      `${idx + 1},"${p.customerName || contract.manager}","${p.paymentType || p.method}","${
                        p.forReason || p.title
                      }",${p.amount},"${p.regDate || p.date}","${p.date}","${
                        p.buildingName || contract.building
                      }","${p.buildingAddress || contract.address || ""}"`
                  )
                  .join("\n");
              const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `payments-contract-${contract.no}.csv`;
              a.click();
              onShowToast("فایل اکسل با موفقیت ایجاد شد");
            }}
            className={`rounded border p-2 text-[13px] ${t.border} ${t.sub} ${t.hover}`}
          >
            <FileSpreadsheet size={15} />
          </button>
        </div>
      </div>

      {/* Filter bar if opened */}
      {isFilterOpen && (
        <div className={`mt-2.5 flex items-center gap-2 rounded border p-2 ${t.border} ${t.dark ? "bg-[#202020]" : "bg-neutral-50"}`}>
          <Search size={14} className={t.sub} />
          <input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="جستجو در نام مشتری، بابت، روش پرداخت، شماره پیگیری..."
            className={`flex-1 bg-transparent text-[12px] outline-none ${t.text}`}
          />
          {searchFilter && (
            <button type="button" onClick={() => setSearchFilter("")} className={t.sub}>
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* 4. Payments Table (matching sshot-2.png columns exactly) */}
      <div className={`mt-3 flex-1 overflow-x-auto rounded border ${t.border}`}>
        <table className="w-full border-collapse text-[12px]">
          <thead className={`${t.head} ${t.sub} border-b ${t.border}`}>
            <tr>
              <th className="w-12 px-3 py-2.5 text-center font-semibold">ردیف</th>
              <th className="px-3 py-2.5 text-right font-semibold">نام مشتری</th>
              <th className="px-3 py-2.5 text-right font-semibold">نوع پرداخت</th>
              <th className="px-3 py-2.5 text-right font-semibold">بابت</th>
              <th className="px-3 py-2.5 text-right font-semibold">مبلغ</th>
              <th className="px-3 py-2.5 text-right font-semibold">تاریخ ثبت</th>
              <th className="px-3 py-2.5 text-right font-semibold">تاریخ پرداخت</th>
              <th className="px-3 py-2.5 text-right font-semibold">نام ساختمان</th>
              <th className="px-3 py-2.5 text-right font-semibold">آدرس ساختمان</th>
              <th className="w-10 px-2 py-2.5 text-center font-semibold"></th>
            </tr>
          </thead>
          <tbody className={`divide-y ${t.border} ${t.text}`}>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-neutral-400">
                  <CreditCard size={36} className="mx-auto mb-2 opacity-40 text-violet-500" />
                  <div>هیچ پرداختی برای این قرارداد ثبت نشده است.</div>
                  <button
                    type="button"
                    onClick={() => openNewManualPayment(false)}
                    className="mt-3 inline-flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-purple-700"
                  >
                    <Plus size={14} /> ثبت پرداختی به صورت دستی
                  </button>
                </td>
              </tr>
            ) : (
              filteredPayments.map((p, index) => {
                const customerDisplay =
                  p.customerName || contract.manager || "* حسینی فر";
                const typeDisplay = p.paymentType || p.method || "نقد";
                const reasonDisplay =
                  p.forReason || p.title || `قرارداد سرویس و نگهداری بشماره : ${contract.no}`;
                const regDateDisplay = p.regDate || p.date || "13 شهریور 1405";
                const payDateDisplay = p.date || "13 شهریور 1405";
                const buildingDisplay =
                  p.buildingName || contract.buildingName || contract.building || "حسینی فر چهاراه پادگان";
                const addressDisplay =
                  p.buildingAddress ||
                  contract.address ||
                  "قزوین چهار راه پادگان نبش کوچه متانت ساختمان آریامهر";

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors hover:bg-neutral-500/5 ${
                      t.dark ? "even:bg-[#202020]/40" : "even:bg-neutral-50/50"
                    }`}
                  >
                    <td className="px-3 py-3 text-center font-medium">{fa(index + 1)}</td>
                    <td className="px-3 py-3 font-semibold text-sky-500 whitespace-nowrap">
                      {customerDisplay}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="rounded bg-neutral-500/10 px-2 py-0.5 text-[11px] font-medium">
                        {typeDisplay}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300 max-w-[280px] truncate" title={reasonDisplay}>
                      {reasonDisplay}
                    </td>
                    <td className="px-3 py-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {money(p.amount)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-neutral-500">{fa(regDateDisplay)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium">{fa(payDateDisplay)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{buildingDisplay}</td>
                    <td className="px-3 py-3 text-neutral-500 max-w-[240px] truncate" title={addressDisplay}>
                      {addressDisplay}
                    </td>
                    <td className="relative px-2 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
                        className={`rounded p-1 ${t.hover} ${t.sub}`}
                        title="عملیات"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuId === p.id && (
                        <div
                          className={`absolute left-2 top-8 z-30 min-w-[150px] rounded-md border shadow-xl ${
                            t.border
                          } ${t.dark ? "bg-[#252525]" : "bg-white"} py-1 text-right text-[12px]`}
                        >
                          <button
                            type="button"
                            onClick={() => openEditPayment(p)}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 ${t.hover} ${t.text}`}
                          >
                            <Pencil size={13} className="text-sky-500" />
                            <span>ویرایش پرداخت</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReceiptPayment(p);
                              setActiveMenuId(null);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 ${t.hover} ${t.text}`}
                          >
                            <Printer size={13} className="text-purple-500" />
                            <span>چاپ رسید پرداخت</span>
                          </button>

                          <div className={`my-1 border-t ${t.border}`} />

                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id)}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10`}
                          >
                            <Trash2 size={13} />
                            <span>حذف پرداخت</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Footer (matching sshot-2.png): Count & Pagination */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[12px]" style={{ borderColor: "inherit" }}>
        <div className={`font-medium ${t.sub}`}>
          {fa(filteredPayments.length)} مورد پیدا شد
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={t.sub}>نمایش:</span>
            <select
              className={`rounded border px-2 py-1 text-[11.5px] ${t.border} ${t.body} ${t.text} outline-none`}
              defaultValue="20"
            >
              <option value="20">۲۰ / صفحه</option>
              <option value="50">۵۰ / صفحه</option>
              <option value="100">۱۰۰ / صفحه</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className={`rounded border px-2 py-1 ${t.border} ${t.sub} opacity-50`}
            >
              &gt;
            </button>
            <button
              type="button"
              className={`rounded bg-violet-600 px-2.5 py-1 font-semibold text-white`}
            >
              ۱
            </button>
            <button
              type="button"
              disabled
              className={`rounded border px-2 py-1 ${t.border} ${t.sub} opacity-50`}
            >
              &lt;
            </button>
          </div>
        </div>
      </div>

      {/* 6. MODAL: Manual Payment Registration / Edit ("بتونم پرداخت رو به صورت دستی وارد بکنم") */}
      {isManualPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-xl rounded-xl border p-5 shadow-2xl ${t.border} ${
              t.dark ? "bg-[#222222]" : "bg-white"
            } max-h-[90vh] overflow-y-auto`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "inherit" }}>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className={`text-[14px] font-bold ${t.text}`}>
                    {editingPayment ? "ویرایش پرداختی" : "ثبت پرداختی جدید (دستی)"}
                  </h3>
                  <p className={`text-[11.5px] ${t.sub}`}>
                    ثبت و اعمال مستقیم واریزی به حساب پرونده قرارداد
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualPayModalOpen(false)}
                className={`rounded-lg p-1.5 ${t.hover} ${t.sub}`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contract Summary Box */}
            <div
              className={`mt-3 rounded-lg border p-3 text-[12px] ${t.border} ${
                t.dark ? "bg-[#1c1c1c]" : "bg-neutral-50"
              }`}
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span className={t.sub}>شماره قرارداد:</span>
                  <span className="font-semibold text-sky-500">{fa(contract.no)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={t.sub}>طرف حساب:</span>
                  <span className="font-semibold">{contract.manager || "حسینی فر"}</span>
                </div>
                <div className="flex justify-between">
                  <span className={t.sub}>ساختمان:</span>
                  <span>{contract.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className={t.sub}>مانده بدهی کل:</span>
                  <span className="font-bold text-amber-500">{money(debt)}</span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="mt-4 space-y-3 text-[12px]">
              {/* Amount Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`font-semibold ${t.text}`}>
                    مبلغ پرداختی (ریال) <span className="text-red-500">*</span>
                  </label>
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormAmount("66,000,000")}
                      className="rounded bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-500 hover:bg-violet-500/20"
                    >
                      ۶۶٬۰۰۰٬۰۰۰
                    </button>
                    {debt > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormAmount(debt.toLocaleString("en-US"))}
                        className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/20"
                      >
                        مانده کل بدهی
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFormAmount("8,500,000")}
                      className="rounded bg-neutral-500/10 px-2 py-0.5 text-[11px] font-medium text-neutral-500 hover:bg-neutral-500/20"
                    >
                      قسط ۸٬۵۰۰٬۰۰۰
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={formAmount}
                  onChange={(e) =>
                    setFormAmount(
                      e.target.value
                        .replace(/\D/g, "")
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    )
                  }
                  placeholder="مثلاً: 66,000,000"
                  className={`w-full rounded-md border px-3 py-2 text-[14px] font-bold text-emerald-600 ${t.border} ${t.input} outline-none focus:border-purple-500`}
                />
                {formAmount && (
                  <div className={`mt-1 text-[11px] text-neutral-400`}>
                    به حروف: {numberToPersianWords(parseInt(formAmount.replace(/\D/g, ""), 10) || 0)}
                  </div>
                )}
              </div>

              {/* Payment Type & For reason */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>
                    نوع پرداخت <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.body} ${t.text} outline-none focus:border-purple-500`}
                  >
                    <option value="نقد">نقد</option>
                    <option value="کارت به کارت">کارت به کارت</option>
                    <option value="دستگاه پوز / کارتخوان">دستگاه پوز / کارتخوان</option>
                    <option value="واریز به حساب / فیش">واریز به حساب / فیش</option>
                    <option value="چک صیادی">چک صیادی</option>
                    <option value="اقساطی">اقساطی</option>
                  </select>
                </div>

                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>
                    بابت / شرح <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>
                    تاریخ پرداخت <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPayDate}
                    onChange={(e) => setFormPayDate(e.target.value)}
                    placeholder="13 شهریور 1405"
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>تاریخ ثبت</label>
                  <input
                    type="text"
                    value={formRegDate}
                    onChange={(e) => setFormRegDate(e.target.value)}
                    placeholder="13 شهریور 1405"
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                  />
                </div>
              </div>

              {/* Customer & Building */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>نام مشتری</label>
                  <input
                    type="text"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>نام ساختمان</label>
                  <input
                    type="text"
                    value={formBuilding}
                    onChange={(e) => setFormBuilding(e.target.value)}
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={`block mb-1 font-semibold ${t.text}`}>آدرس ساختمان</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                />
              </div>

              {/* Ref & Bank */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>
                    شماره پیگیری / کد ارجاع / شماره فیش
                  </label>
                  <input
                    type="text"
                    value={formRef}
                    onChange={(e) => setFormRef(e.target.value)}
                    placeholder="مثلاً: TRX-98214"
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 font-semibold ${t.text}`}>بانک / حساب</label>
                  <input
                    type="text"
                    value={formBank}
                    onChange={(e) => setFormBank(e.target.value)}
                    placeholder="مثلاً: بانک ملت"
                    className={`w-full rounded-md border px-3 py-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block mb-1 font-semibold ${t.text}`}>توضیحات و یادداشت</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="توضیحات اضافی درباره این پرداختی..."
                  className={`w-full rounded-md border p-2 text-[12px] ${t.border} ${t.input} outline-none focus:border-purple-500`}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: "inherit" }}>
              <button
                type="button"
                onClick={() => setIsManualPayModalOpen(false)}
                className={`rounded-md border px-4 py-2 text-[12.5px] ${t.border} ${t.hover} ${t.text}`}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                className="flex items-center gap-1.5 rounded-md bg-purple-600 px-5 py-2 text-[12.5px] font-medium text-white shadow hover:bg-purple-700"
              >
                <CheckCircle2 size={15} />
                {editingPayment ? "ذخیره تغییرات" : "ثبت و تایید پرداخت"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: Single Payment Receipt Voucher (چاپ رسید پرداخت) */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-neutral-300 bg-white p-6 text-neutral-900 shadow-2xl font-[Tahoma,system-ui]">
            {/* Action buttons at top of receipt */}
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-purple-600" />
                <span className="font-bold text-[14px]">پیش‌نمایش رسید رسمی دریافت وجه</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-purple-700 shadow-sm"
                >
                  <Printer size={14} /> چاپ مستقیم
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPayment(null)}
                  className="rounded border border-neutral-300 p-1 text-neutral-500 hover:bg-neutral-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Voucher Card */}
            <div className="rounded-lg border-2 border-dashed border-neutral-300 p-5 bg-neutral-50/70 text-[12px]">
              {/* Company & Voucher Header */}
              <div className="flex items-center justify-between border-b border-neutral-300 pb-3">
                <div>
                  <div className="text-[15px] font-bold text-neutral-900">
                    شرکت فنی و مهندسی آسانسور و پله برقی
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    سند رسمی دریافت وجه / رسید حق‌الزحمه سرویس و نگهداری
                  </div>
                </div>
                <div className="text-left text-[11px] space-y-1">
                  <div>
                    <span className="text-neutral-500">شماره رسید: </span>
                    <span className="font-bold">{fa(receiptPayment.id)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">تاریخ ثبت: </span>
                    <span>{fa(receiptPayment.regDate || receiptPayment.date)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">قرارداد: </span>
                    <span className="font-bold text-sky-600">{fa(contract.no)}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between border-b border-neutral-200 py-1.5">
                  <span className="text-neutral-500">پرداخت کننده (مشتری):</span>
                  <span className="font-bold text-neutral-900">
                    {receiptPayment.customerName || contract.manager}
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-200 py-1.5">
                  <span className="text-neutral-500">ساختمان و محل نصب:</span>
                  <span className="font-medium">
                    {receiptPayment.buildingName || contract.building}
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-200 py-1.5">
                  <span className="text-neutral-500">آدرس:</span>
                  <span className="text-neutral-700 text-[11.5px]">
                    {receiptPayment.buildingAddress || contract.address || "-"}
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-200 py-1.5">
                  <span className="text-neutral-500">بابت:</span>
                  <span className="font-semibold text-neutral-800">
                    {receiptPayment.forReason || receiptPayment.title}
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-200 py-1.5">
                  <span className="text-neutral-500">روش پرداخت:</span>
                  <span className="font-medium">
                    {receiptPayment.paymentType || receiptPayment.method || "نقد"}
                    {receiptPayment.ref ? ` (کد پیگیری: ${receiptPayment.ref})` : ""}
                  </span>
                </div>

                <div className="flex justify-between border-b border-neutral-200 py-2 bg-emerald-50 px-2 rounded">
                  <span className="font-bold text-emerald-800">مبلغ دریافتی:</span>
                  <span className="text-[14px] font-extrabold text-emerald-700">
                    {money(receiptPayment.amount)}
                  </span>
                </div>

                <div className="py-1 text-[11.5px] text-neutral-600">
                  <span className="text-neutral-500">مبلغ به حروف: </span>
                  <span className="font-semibold text-neutral-800">
                    {numberToPersianWords(receiptPayment.amount)}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-8 grid grid-cols-2 gap-6 text-center text-[11px] pt-4 border-t border-neutral-300">
                <div>
                  <div className="text-neutral-500 mb-8">امضاء پرداخت کننده / مدیر ساختمان</div>
                  <div className="border-t border-dotted border-neutral-400 pt-1">
                    {receiptPayment.customerName || contract.manager}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500 mb-8">امضاء صندوقدار / مهر شرکت</div>
                  <div className="border-t border-dotted border-neutral-400 pt-1">
                    مدیریت مالی و امور قراردادها
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: Print Full Payments Report (چاپ کامل لیست پرداختی‌ها) */}
      {isPrintReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-xl border border-neutral-300 bg-white p-6 text-neutral-900 shadow-2xl max-h-[90vh] overflow-y-auto font-[Tahoma,system-ui]">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-purple-600" />
                <span className="font-bold text-[14px]">
                  گزارش رسمی پرداختی‌های قرارداد {fa(contract.no)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded bg-purple-600 px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-purple-700 shadow-sm"
                >
                  <Printer size={14} /> چاپ فرمت A4
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintReportOpen(false)}
                  className="rounded border border-neutral-300 p-1.5 text-neutral-500 hover:bg-neutral-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Report Document Content */}
            <div className="border p-6 rounded-lg bg-white text-[12px]">
              <div className="flex items-center justify-between border-b-2 border-neutral-800 pb-3 mb-4">
                <div>
                  <h2 className="text-[16px] font-bold text-neutral-900">
                    صورت‌حساب و ریز واریزی‌های قرارداد
                  </h2>
                  <div className="text-[12px] text-neutral-500 mt-1">
                    قرارداد سرویس و نگهداری آسانسور - شماره {fa(contract.no)}
                  </div>
                </div>
                <div className="text-left text-[11.5px] space-y-0.5">
                  <div>تاریخ گزارش: {fa("1405/06/13")}</div>
                  <div>صفحه: ۱ از ۱</div>
                </div>
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-3 rounded bg-neutral-100 p-3 mb-4">
                <div>
                  <span className="text-neutral-500">طرف حساب / مشتری: </span>
                  <span className="font-bold">{contract.manager}</span>
                </div>
                <div>
                  <span className="text-neutral-500">نام ساختمان: </span>
                  <span className="font-bold">{contract.building}</span>
                </div>
                <div>
                  <span className="text-neutral-500">آدرس: </span>
                  <span>{contract.address || "قزوین چهار راه پادگان نبش کوچه متانت"}</span>
                </div>
                <div>
                  <span className="text-neutral-500">منطقه: </span>
                  <span>{contract.zone}</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border border-collapse text-[11.5px] mb-4">
                <thead className="bg-neutral-200">
                  <tr>
                    <th className="border p-2 text-center">ردیف</th>
                    <th className="border p-2 text-right">نوع پرداخت</th>
                    <th className="border p-2 text-right">بابت</th>
                    <th className="border p-2 text-right">تاریخ پرداخت</th>
                    <th className="border p-2 text-right">شماره پیگیری / فیش</th>
                    <th className="border p-2 text-right">مبلغ (ریال)</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id}>
                      <td className="border p-2 text-center">{fa(i + 1)}</td>
                      <td className="border p-2">{p.paymentType || p.method}</td>
                      <td className="border p-2">{p.forReason || p.title}</td>
                      <td className="border p-2">{fa(p.date)}</td>
                      <td className="border p-2">{p.ref || "-"}</td>
                      <td className="border p-2 font-bold text-emerald-700">{money(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-neutral-100 font-bold">
                  <tr>
                    <td colSpan={5} className="border p-2 text-left">
                      جمع کل پرداختی‌ها:
                    </td>
                    <td className="border p-2 text-emerald-700">{money(totalPaid)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="border p-2 text-left">
                      جمع کل مبلغ قرارداد:
                    </td>
                    <td className="border p-2">{money(totalPayable)}</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="border p-2 text-left">
                      مانده بدهی نهایی:
                    </td>
                    <td className="border p-2 text-amber-700">{money(debt)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="mt-12 grid grid-cols-2 gap-8 text-center text-[11.5px]">
                <div>
                  <div className="mb-10 text-neutral-500">مهر و امضاء امور مالی شرکت</div>
                  <div className="border-t border-neutral-400 pt-1">واحد حسابداری و دریافت</div>
                </div>
                <div>
                  <div className="mb-10 text-neutral-500">امضاء مشتری و تایید مانده حساب</div>
                  <div className="border-t border-neutral-400 pt-1">{contract.manager}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

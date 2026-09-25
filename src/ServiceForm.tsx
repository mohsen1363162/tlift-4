import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Trash2,
  UserRound,
  Plus,
  Clock,
  Inbox,
  Printer,
  Wrench,
} from "lucide-react";
import type { Theme } from "./theme";
import { Field, inputCls, SearchSelect, DatePicker, TimePicker } from "./ui";
import { TECHS } from "./ServicesCalendar";
import { partsApi } from "./partsStore";
import BreakdownModal from "./components/BreakdownModal";
import PartsManagementModal from "./components/PartsManagementModal";

const fa = (n: string | number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const money = (n: number) => fa(n.toLocaleString("en-US")) + " ریال";

export type Fault = { by: string; date: string; reason: string };
export type Part = { code?: string; name: string; unit: string; qty: number; price: number };

export default function ServiceForm({
  t,
  planDate,
  baseAmount,
  contractRibbon,
  initialData,
  onBack,
  onSubmit,
}: {
  t: Theme;
  planDate: string;
  baseAmount?: number;
  contractRibbon?: React.ReactNode;
  initialData?: {
    serial?: string;
    techs?: string[];
    doneBy?: string;
    report?: string;
    reminder?: string;
    doneDate?: string;
    inTime?: string;
    outTime?: string;
    wage?: number;
    trip?: number;
    discount?: number;
    baseAmount?: number;
    faultsList?: string[];
    partsList?: Part[];
  };
  onBack: () => void;
  onSubmit: (data: {
    techs: string[];
    doneBy: string;
    doneDate: string;
    inTime: string;
    outTime: string;
    report: string;
    reminder: string;
    total: number;
    parts: number;
    wage: number;
    trip: number;
    discount: number;
    faults: number;
    faultsList: string[];
    partsList: Part[];
  }) => void;
}) {
  const [serial] = useState(initialData?.serial || "775377");
  const [techs, setTechs] = useState<string[]>(initialData?.techs || [...TECHS]);
  const [doneBy, setDoneBy] = useState(
    initialData?.doneBy || (initialData?.techs && initialData.techs[0]) || "محسن امامی برسری"
  );
  const [report, setReport] = useState(initialData?.report || "");
  const [reminder, setReminder] = useState(initialData?.reminder || "");
  const [followUp, setFollowUp] = useState("");
  const [doneDate, setDoneDate] = useState(initialData?.doneDate || "");
  const [inTime, setInTime] = useState(initialData?.inTime || "10:00");
  const [outTime, setOutTime] = useState(initialData?.outTime || "11:30");
  const [wage, setWage] = useState(initialData?.wage || 0);
  const [trip, setTrip] = useState(initialData?.trip || 0);
  const [discount, setDiscount] = useState(initialData?.discount || 0);
  const [faults, setFaults] = useState<Fault[]>(
    initialData?.faultsList?.map((r) => ({ by: "سرویسکار", date: initialData?.doneDate || "1405/03/25", reason: r })) || []
  );
  const [parts, setParts] = useState<Part[]>(initialData?.partsList || []);
  const [showFault, setShowFault] = useState(false);
  const [showPart, setShowPart] = useState(false);
  const [err, setErr] = useState("");

  const base = baseAmount !== undefined ? baseAmount : (initialData?.baseAmount ?? 7000000);
  const partsTotal = useMemo(() => parts.reduce((s, p) => s + p.qty * p.price, 0), [parts]);
  const total = Math.max(0, base + wage + trip + partsTotal - discount);

  const addTech = () => {
    const rest = TECHS.filter((x) => !techs.includes(x));
    if (rest.length) setTechs([...techs, rest[0]]);
  };

  const submit = () => {
    if (!doneBy || !doneDate || !inTime || !outTime) {
      setErr("سرویس‌کار انجام دهنده، تاریخ انجام و ساعت ورود/خروج الزامی است");
      return;
    }
    onSubmit({
      techs,
      doneBy,
      doneDate,
      inTime,
      outTime,
      report,
      reminder,
      total,
      parts: partsTotal,
      wage,
      trip,
      discount,
      faults: faults.length,
      faultsList: faults.map((f) => f.reason),
      partsList: parts,
    });
  };

  const box = `rounded border ${t.border} p-4`;

  return (
    <div className={`h-full overflow-y-auto ${t.text}`}>
      {contractRibbon}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className={`flex items-center gap-1 rounded border px-3 py-1.5 text-[12.5px] ${t.border} ${t.hover}`}
          >
            <ArrowLeft size={14} /> بازگشت
          </button>
          <div className="flex items-center gap-2 text-[17px]">
            <span>انجام سرویس</span>
            <Check size={22} className={t.sub} />
          </div>
        </div>

        <div className={`my-4 border-t border-dashed ${t.border}`} />

      <div className="grid grid-cols-12 gap-5">
        {/* right main column */}
        <div className="col-span-9 space-y-5">
          <div className="grid grid-cols-3 gap-5">
            <Field label="سریال برگه سرویس" req>
              <input readOnly value={serial} className={inputCls(t)} />
            </Field>
            <div className="col-span-2">
              <div className="mb-1 text-[12.5px]">
                <span className="text-red-500">* </span>سرویس کاران
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {techs.map((x) => (
                  <span key={x} className={`flex items-center gap-2 rounded border px-2 py-1.5 text-[12px] ${t.border}`}>
                    <Trash2
                      size={13}
                      className="cursor-pointer text-red-500"
                      onClick={() => setTechs(techs.filter((y) => y !== x))}
                    />
                    <span>{x}</span>
                    <UserRound size={13} className={t.sub} />
                  </span>
                ))}
                <button
                  type="button"
                  onClick={addTech}
                  className="flex items-center gap-1 rounded bg-violet-400 px-3 py-1.5 text-[12px] text-white hover:bg-violet-500"
                >
                  <Plus size={13} /> افزودن سرویس کار
                </button>
              </div>
            </div>
          </div>

          <Field label="سرویس کار انجام دهنده" req>
            <SearchSelect t={t} value={doneBy} onChange={setDoneBy} options={techs} />
          </Field>

          <div className="grid grid-cols-3 gap-5">
            <Field label="گزارش سرویس کار">
              <textarea
                value={report}
                onChange={(e) => setReport(e.target.value)}
                className={`h-24 w-full rounded border p-2 text-[12.5px] outline-none ${t.input}`}
              />
            </Field>
            <Field label="یادآور سرویس">
              <textarea
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className={`h-24 w-full rounded border p-2 text-[12.5px] outline-none ${t.input}`}
              />
            </Field>
            <Field label="پیگیری مشتری برای سرویس">
              <textarea
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className={`h-24 w-full rounded border p-2 text-[12.5px] outline-none ${t.input}`}
              />
            </Field>
          </div>

          {/* faults */}
          <div className={box}>
            <div className="mb-3 flex justify-start">
              <button
                type="button"
                onClick={() => setShowFault(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#7c5cdb] hover:bg-[#6c48cf] px-4 py-1.5 text-[12.5px] font-semibold text-white shadow transition active:scale-95"
              >
                افزودن خرابی
              </button>
            </div>
            <table className="w-full text-[12.5px]">
              <thead className={t.sub}>
                <tr className={`border-b ${t.border}`}>
                  <th className="px-3 py-2 text-right font-normal">ثبت توسط</th>
                  <th className="px-3 py-2 text-right font-normal">تاریخ اعلام</th>
                  <th className="px-3 py-2 text-center font-normal">دلایل</th>
                  <th className="px-3 py-2 text-center font-normal">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {faults.map((f, i) => (
                  <tr key={i} className={`border-b ${t.border}`}>
                    <td className="px-3 py-2.5">{f.by}</td>
                    <td className="px-3 py-2.5">{f.date}</td>
                    <td className="px-3 py-2.5 text-center">{f.reason}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Trash2
                        size={14}
                        className="mx-auto cursor-pointer text-red-500 hover:text-red-400 transition"
                        onClick={() => setFaults(faults.filter((_, j) => j !== i))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {faults.length === 0 && (
              <div className={`flex flex-col items-center gap-2 py-10 text-[12.5px] ${t.sub}`}>
                <Inbox size={44} /> داده‌ای موجود نیست
              </div>
            )}
          </div>

          {/* parts */}
          <div className={box}>
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPart(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[#7c5cdb] hover:bg-[#6c48cf] px-4 py-1.5 text-[12.5px] font-semibold text-white shadow transition active:scale-95"
              >
                <Wrench size={13} />
                <span>مدیریت قطعات</span>
              </button>
              {parts.length > 0 && (
                <div className="flex items-center gap-3 text-[11.5px]">
                  <span className="text-neutral-400">تعداد اقلام: {fa(parts.length)}</span>
                  <span className="font-bold text-violet-400 font-mono">
                    جمع کل: {money(partsTotal)}
                  </span>
                </div>
              )}
            </div>
            <table className="w-full text-[12.5px]">
              <thead className={t.sub}>
                <tr className={`border-b ${t.border}`}>
                  {["کد قطعه", "نام قطعه", "واحد", "تعداد", "قیمت واحد (ریال)", "قیمت کل (ریال)", "عملیات"].map((h) => (
                    <th key={h} className="px-3 py-2 text-right font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parts.map((p, i) => (
                  <tr key={i} className={`border-b ${t.border}`}>
                    <td className="px-3 py-2.5 font-mono">{p.code}</td>
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5">{p.unit}</td>
                    <td className="px-3 py-2.5 font-mono">{fa(p.qty)}</td>
                    <td className="px-3 py-2.5 font-mono">{money(p.price)}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-violet-300">
                      {money(p.qty * p.price)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Trash2
                        size={14}
                        className="mx-auto cursor-pointer text-red-500 hover:text-red-400 transition"
                        onClick={() => setParts(parts.filter((_, j) => j !== i))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parts.length === 0 && (
              <div className={`flex flex-col items-center gap-2 py-10 text-[12.5px] ${t.sub}`}>
                <Inbox size={44} /> قطعه‌ای برای این سرویس ثبت نشده است
              </div>
            )}
          </div>
        </div>

        {/* left side column */}
        <div className="col-span-3 space-y-4">
          <div className="text-[15px]">یادآورهای دستگاه و سرویس</div>
          <div className={`text-[12px] ${t.sub}`}>{fa(0)} یادآور تنظیم شده</div>
          <div className={`flex flex-col items-center gap-2 py-6 text-[12px] ${t.sub}`}>
            <Inbox size={40} /> یادآوری تنظیم نشده است.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="تاریخ انجام" req>
              <DatePicker t={t} value={doneDate} onChange={setDoneDate} />
            </Field>
            <Field label="تاریخ برنامه ریزی">
              <input readOnly value={planDate} className={inputCls(t, "opacity-70")} />
            </Field>
            <Field label="ساعت ورود" req>
              <TimePicker
                t={t}
                value={inTime}
                onChange={setInTime}
                placeholder="انتخاب ساعت ورود"
              />
            </Field>
            <Field label="ساعت خروج" req>
              <TimePicker
                t={t}
                value={outTime}
                onChange={setOutTime}
                placeholder="انتخاب ساعت خروج"
              />
            </Field>
            <Field label="دستمزد">
              <div className="flex items-center gap-1">
                <input
                  value={wage}
                  onChange={(e) => setWage(+e.target.value.replace(/\D/g, "") || 0)}
                  className={inputCls(t)}
                />
                <span className={`rounded border px-2 py-1.5 text-[11px] ${t.border} ${t.sub}`}>ریال</span>
              </div>
            </Field>
            <Field label="ایاب ذهاب">
              <div className="flex items-center gap-1">
                <input
                  value={trip}
                  onChange={(e) => setTrip(+e.target.value.replace(/\D/g, "") || 0)}
                  className={inputCls(t)}
                />
                <span className={`rounded border px-2 py-1.5 text-[11px] ${t.border} ${t.sub}`}>ریال</span>
              </div>
            </Field>
            <Field label="تخفیف" className="col-span-2">
              <div className="flex items-center gap-1">
                <input
                  value={discount}
                  onChange={(e) => setDiscount(+e.target.value.replace(/\D/g, "") || 0)}
                  className={inputCls(t)}
                />
                <span className={`rounded border px-2 py-1.5 text-[11px] ${t.border} ${t.sub}`}>ریال</span>
              </div>
            </Field>
          </div>

          <div className={`overflow-hidden rounded border text-[12px] ${t.border}`}>
            {[
              ["مبلغ", base],
              ["دستمزد", wage],
              ["قطعات", partsTotal],
              ["ایاب و ذهاب", trip],
              ["تخفیف", discount],
              ["مالیات", 0],
            ].map(([k, v]) => (
              <div key={k as string} className={`flex justify-between border-b px-3 py-2 ${t.border}`}>
                <span>{money(v as number)}</span>
                <span className={t.sub}>{k}</span>
              </div>
            ))}
            <div className="flex justify-between bg-violet-400 px-3 py-2 text-neutral-900">
              <span>{money(total)}</span>
              <span>مبلغ نهایی</span>
            </div>
          </div>

          {err && <div className="text-[12px] text-red-500">{err}</div>}
          <button
            type="button"
            onClick={submit}
            className="w-full rounded bg-violet-500 py-2 text-[12.5px] text-white hover:bg-violet-600"
          >
            ثبت گزارش سرویس
          </button>
        </div>
      </div>
      </div>

      <BreakdownModal
        isOpen={showFault}
        onClose={() => setShowFault(false)}
        title="ثبت خرابی جدید"
        onSave={(data) => {
          setFaults([
            ...faults,
            {
              by: data.technicians[0] || "محسن امامی برسری",
              date: data.declareDate,
              reason: data.description ? `${data.reason} (${data.description})` : data.reason,
            },
          ]);
          setShowFault(false);
        }}
      />
      {/* Unified Parts Management Modal */}
      <PartsManagementModal
        isOpen={showPart}
        onClose={() => setShowPart(false)}
        currentParts={parts}
        onDeleteCurrentPart={(idx) => setParts(parts.filter((_, j) => j !== idx))}
        onSave={(newPart) => {
          setParts((prev) => [...prev, newPart]);
          setShowPart(false);
        }}
      />
    </div>
  );
}

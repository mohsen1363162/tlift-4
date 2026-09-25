import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Search, Plus, Printer } from "lucide-react";
import type { Theme } from "./theme";
import { SearchSelect, Field, inputCls, DatePicker, jMonthLen, jFirstWeekday } from "./ui";

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
export const TECHS = ["بهمن کشاورز", "مجتبی فرهمند", "محسن امامی برسری", "محمد حسن رحیمی زاده", "مرتضی قاسمعلی", "میثم سهرابی"];

type Service = { day: number; month: number; techs: string[] };

export default function ServicesCalendar({
  t,
  onClose,
}: {
  t: Theme;
  onClose: () => void;
}) {
  const [year, setYear] = useState(1405);
  const [services, setServices] = useState<Service[]>([]);
  const [panel, setPanel] = useState<"empty" | "add">("empty");
  const [shown, setShown] = useState<string[]>([]);
  const [q, setQ] = useState("");

  // add-service form
  const [mode, setMode] = useState<"repeat" | "single">("repeat");
  const [basis, setBasis] = useState("ماه");
  const [period, setPeriod] = useState("");
  const [every, setEvery] = useState("");
  const [date, setDate] = useState("");
  const [techs, setTechs] = useState<string[]>([]);

  const toggle = (arr: string[], v: string, set: (x: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = () => {
    const p = Math.max(1, parseInt(period || "1", 10));
    const list: Service[] = [];
    if (mode === "repeat") {
      const digits = every.replace(/[^۰-۹0-9]/g, "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
      const day = Math.min(31, Math.max(1, parseInt(digits || "1", 10)));
      for (let m = 0; m < 12; m += p) {
        if (day <= jMonthLen(year, m)) list.push({ day, month: m, techs });
      }
    } else if (date) {
      const [, mm, dd] = date.split("/").map(Number);
      list.push({ day: dd, month: mm - 1, techs });
    }
    setServices((s) => [...s, ...list]);
    setPanel("empty");
  };

  const legend = [
    { c: "border-red-500", label: `${fa(year)}`, box: true },
    { c: "bg-red-400", label: "روزهای غیرمجاز" },
    { c: "bg-red-300", label: "روزهای تعطیل" },
    { c: "bg-green-600", label: "کمتر از 4 سرویس" },
    { c: "bg-amber-500", label: "بین 4 تا 6 سرویس" },
    { c: "bg-orange-600", label: "بیش از 6 سرویس" },
    { c: "bg-violet-500", label: "سرویس های اضافه شده" },
  ];

  const filteredTechs = TECHS.filter((x) => x.includes(q.trim()));

  return (
    <div className={`absolute inset-0 z-40 flex ${t.dark ? "bg-[#1e1e1e]" : "bg-white"}`}>
      {/* calendar area */}
      <div className="order-2 flex min-w-0 flex-1 flex-col">
        <div className={`flex flex-row-reverse items-center gap-4 border-b px-3 py-2 text-[12px] ${t.border} ${t.text}`}>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setYear(year + 1)} className={`rounded p-1 ${t.hover}`}>
              <ChevronLeft size={16} />
            </button>
            <span className="rounded border border-red-500 px-2 py-0.5">{fa(year)}</span>
            <button type="button" onClick={() => setYear(year - 1)} className={`rounded p-1 ${t.hover}`}>
              <ChevronRight size={16} />
            </button>
          </div>
          {legend.slice(1).map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`inline-block h-3.5 w-3.5 rounded-sm ${l.c}`} />
              {l.label}
            </span>
          ))}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className={`rounded p-1 ${t.hover} ${t.sub}`}>
            <X size={16} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto p-4">
          {MONTHS.map((mName, m) => {
            const days = jMonthLen(year, m);
            const offset = jFirstWeekday(year, m);
            return (
              <div key={mName} className={`rounded border p-3 ${t.border}`}>
                <div className={`mb-2 text-center text-[12.5px] ${t.text}`}>
                  <span className="text-sky-400">—</span> {mName} <span className="text-sky-400">—</span>
                </div>
                <div className={`grid grid-cols-7 gap-1 text-center text-[11px] ${t.sub}`}>
                  {WEEK.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[11.5px]">
                  {Array.from({ length: offset }).map((_, i) => (
                    <div key={"e" + i} />
                  ))}
                  {Array.from({ length: days }).map((_, i) => {
                    const d = i + 1;
                    const has = services.some((s) => s.month === m && s.day === d);
                    return (
                      <div
                        key={d}
                        className={`rounded py-0.5 ${has ? "bg-violet-500 text-white" : `${t.text} ${t.hover}`}`}
                      >
                        {fa(d)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* right panel */}
      <div
        className={`order-1 flex w-[340px] shrink-0 flex-col border-e text-right ${t.border} ${
          t.dark ? "bg-[#232323]" : "bg-neutral-50"
        }`}
      >
        {panel === "empty" ? (
          <>
            <div className={`flex items-center justify-between border-b px-3 py-2 text-[12.5px] ${t.border} ${t.text}`}>
              <ChevronLeft size={15} />
              <span>سرویس‌های این قرارداد</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <Printer size={70} className={t.sub} />
              <p className={`text-[12.5px] leading-6 ${t.sub}`}>
                {services.length === 0
                  ? "سرویسی برای این قرارداد هنوز اضافه نشده است، جهت افزودن رو دکمه زیر کلیک کنید"
                  : `${fa(services.length)} سرویس برای این قرارداد ثبت شده است`}
              </p>
              <button
                type="button"
                onClick={() => setPanel("add")}
                className="flex items-center gap-1 rounded bg-violet-400 px-4 py-2 text-[12.5px] text-white hover:bg-violet-500"
              >
                <Plus size={14} /> افزودن سرویس
              </button>
            </div>
            <div className={`border-t ${t.border}`}>
              <div className={`flex items-center justify-between px-3 py-2 text-[12.5px] ${t.text}`}>
                <ChevronLeft size={15} />
                <span>نمایش سرویس‌ها در تقویم</span>
              </div>
              <div className={`mx-3 mb-2 flex items-center gap-2 rounded border px-2 ${t.input}`}>
                <Search size={13} className={t.sub} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="جستجو ..."
                  className="h-8 w-full bg-transparent text-[12px] outline-none"
                />
              </div>
              <label className={`flex items-center justify-between px-3 py-2 text-[12.5px] ${t.text}`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-violet-500"
                  checked={shown.length === TECHS.length}
                  onChange={(e) => setShown(e.target.checked ? [...TECHS] : [])}
                />
                <span>انتخاب همه</span>
              </label>
              <div className="max-h-48 overflow-y-auto pb-2">
                {filteredTechs.map((x) => (
                  <label
                    key={x}
                    className={`flex items-center justify-between border-t px-3 py-2 text-[12.5px] ${t.border} ${t.text}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-violet-500"
                      checked={shown.includes(x)}
                      onChange={() => toggle(shown, x, setShown)}
                    />
                    <span>{x}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`flex items-center justify-between border-b px-3 py-2.5 text-[13px] ${t.border} ${t.text}`}>
              <button type="button" onClick={() => setPanel("empty")} className={`rounded p-1 ${t.hover} ${t.sub}`}>
                <X size={15} />
              </button>
              <span>اضافه کردن سرویس</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className={`mb-4 flex flex-row-reverse justify-start gap-5 text-[12.5px] ${t.text}`}>
                {([["single", "سرویس تکی"], ["repeat", "تکرار سرویس"]] as const).map(([k, l]) => (
                  <label key={k} className="flex flex-row-reverse items-center gap-1.5">
                    <input
                      type="radio"
                      checked={mode === k}
                      onChange={() => setMode(k)}
                      className="accent-violet-500"
                    />
                    <span>{l}</span>
                  </label>
                ))}
              </div>

              <div className={`space-y-4 ${t.text}`}>
                {mode === "repeat" ? (
                  <>
                    <Field label="تکرار بر اساس" req>
                      <SearchSelect t={t} value={basis} onChange={setBasis} options={["روز", "هفته", "ماه"]} />
                    </Field>
                    <Field label="دوره" req>
                      <input
                        value={period}
                        onChange={(e) => setPeriod(e.target.value.replace(/\D/g, ""))}
                        className={inputCls(t)}
                      />
                    </Field>
                    <Field label="هر" req>
                      <SearchSelect
                        t={t}
                        value={every}
                        onChange={setEvery}
                        placeholder="انتخاب روز"
                        options={Array.from({ length: 31 }, (_, i) => `روز ${fa(i + 1)}`)}
                      />
                    </Field>
                  </>
                ) : (
                  <Field label="تاریخ سرویس" req>
                    <DatePicker t={t} value={date} onChange={setDate} />
                  </Field>
                )}

                <div>
                  <div className="mb-1 text-[12.5px]">سرویسکار ها</div>
                  <div className={`mb-2 flex items-center gap-2 rounded border px-2 ${t.input}`}>
                    <Search size={13} className={t.sub} />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="جستجو ..."
                      className="h-8 w-full bg-transparent text-[12px] outline-none"
                    />
                  </div>
                  {filteredTechs.map((x) => (
                    <label
                      key={x}
                      className={`flex items-center justify-between border-b py-2.5 text-[12.5px] ${t.border}`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-violet-500"
                        checked={techs.includes(x)}
                        onChange={() => toggle(techs, x, setTechs)}
                      />
                      <span>{x}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className={`border-t p-3 ${t.border}`}>
              <button
                type="button"
                onClick={save}
                className="flex items-center gap-1 rounded bg-violet-400 px-4 py-2 text-[12.5px] text-white hover:bg-violet-500"
              >
                <Plus size={14} /> ذخیره و افزودن
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

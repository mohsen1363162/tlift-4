import { useState, useRef, useEffect, ReactNode } from "react";
import { Search, ChevronDown, Clock, Check, Sparkles } from "lucide-react";
import type { Theme } from "./theme";

export function Field({
  label,
  req,
  children,
  className = "",
}: {
  label: string;
  req?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[12.5px]">
        {req && <span className="text-red-500">* </span>}
        {label}
      </label>
      {children}
    </div>
  );
}

export function inputCls(t: Theme, extra = "") {
  return `h-9 w-full rounded border px-3 text-[12.5px] outline-none focus:border-violet-500 ${t.input} ${extra}`;
}

export function SearchSelect({
  t,
  value,
  onChange,
  options,
  placeholder = "",
}: {
  t: Theme;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const list = options.filter((o) => o.includes(q.trim()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
        className={`${inputCls(t)} flex items-center justify-between ${open ? "border-violet-500" : ""}`}
      >
        <span className={value ? "" : t.sub}>{value || placeholder}</span>
        {open ? <Search size={13} className={t.sub} /> : <ChevronDown size={14} className={t.sub} />}
      </button>
      {open && (
        <div
          className={`absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded border shadow-2xl ${t.border} ${
            t.dark ? "bg-[#232323]" : "bg-white"
          }`}
        >
          <div
            className={`sticky top-0 flex items-center gap-2 border-b px-2 py-1.5 ${t.border} ${
              t.dark ? "bg-[#232323]" : "bg-white"
            }`}
          >
            <Search size={13} className={t.sub} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-transparent text-[12.5px] outline-none"
            />
          </div>
          {list.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-right text-[12.5px] ${t.hover} ${
                o === value ? "text-violet-400" : ""
              }`}
            >
              {o}
            </button>
          ))}
          {list.length === 0 && <div className={`px-3 py-3 text-[12px] ${t.sub}`}>موردی نیست</div>}
        </div>
      )}
    </div>
  );
}

const WEEK = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const jMonthLen = (y: number, m: number) =>
  m < 6 ? 31 : m < 11 ? 30 : [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33) ? 30 : 29;

// weekday index (0=شنبه) of the 1st day of a Jalali month
export function jFirstWeekday(y: number, m: number) {
  const gy = y + 621;
  const d = new Date(Date.UTC(gy, 2, 21)); // ~1 Farvardin
  let days = 0;
  for (let i = 0; i < m; i++) days += jMonthLen(y, i);
  d.setUTCDate(d.getUTCDate() + days);
  return (d.getUTCDay() + 1) % 7; // Saturday -> 0
}

export function DatePicker({
  t,
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
}: {
  t: Theme;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsedDate = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  const [m, setM] = useState(parsedDate ? Math.max(0, Math.min(11, Number(parsedDate[2]) - 1)) : 0);
  const [y, setY] = useState(parsedDate ? Number(parsedDate[1]) : 1405);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (parsed) {
      setY(Number(parsed[1]));
      setM(Math.max(0, Math.min(11, Number(parsed[2]) - 1)));
    }
  }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const days = jMonthLen(y, m);
  const offset = jFirstWeekday(y, m);

  const nextMonth = () => {
    if (m === 11) {
      setM(0);
      setY(y + 1);
    } else setM(m + 1);
  };
  const prevMonth = () => {
    if (m === 0) {
      setM(11);
      setY(y - 1);
    } else setM(m - 1);
  };

  return (
    <div ref={ref} className="relative">
      <input
        readOnly
        value={value}
        placeholder={placeholder}
        onClick={() => setOpen((o) => !o)}
        className={inputCls(t, "cursor-pointer")}
      />
      {open && (
        <div
          className={`absolute z-40 mt-1 w-[280px] rounded border p-2 shadow-2xl ${t.border} ${
            t.dark ? "bg-[#232323]" : "bg-white"
          }`}
        >
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <div className="flex gap-1">
              <button
                type="button"
                title="سال بعد"
                className="rounded bg-pink-400 px-2 text-white"
                onClick={() => setY(y + 1)}
              >
                {"«"}
              </button>
              <button
                type="button"
                title="ماه بعد"
                className="rounded bg-pink-400 px-2 text-white"
                onClick={nextMonth}
              >
                {"‹"}
              </button>
            </div>
            <span>
              {MONTHS[m]} {fa(y)}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                title="ماه قبل"
                className="rounded bg-pink-400 px-2 text-white"
                onClick={prevMonth}
              >
                {"›"}
              </button>
              <button
                type="button"
                title="سال قبل"
                className="rounded bg-pink-400 px-2 text-white"
                onClick={() => setY(y - 1)}
              >
                {"»"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 rounded bg-pink-400 p-1 text-center text-[11px] text-white">
            {WEEK.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[12px]">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={"pad" + i} />
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const d = i + 1;
              const str = `${y}/${String(m + 1).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    onChange(str);
                    setOpen(false);
                  }}
                  className={`rounded py-1 ${value === str ? "bg-violet-500 text-white" : t.hover}`}
                >
                  {fa(d)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimePicker({
  t,
  value,
  onChange,
  placeholder = "انتخاب ساعت",
}: {
  t: Theme;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse initial hour and minute from value (format HH:mm)
  const parseTime = (val: string) => {
    if (!val) return { h: 10, m: 0 };
    const parts = val.split(":");
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return {
        h: isNaN(h) ? 10 : Math.min(24, Math.max(0, h)),
        m: isNaN(m) ? 0 : Math.min(59, Math.max(0, m)),
      };
    }
    return { h: 10, m: 0 };
  };

  const initial = parseTime(value);
  const [selectedH, setSelectedH] = useState<number>(initial.h);
  const [selectedM, setSelectedM] = useState<number>(initial.m);
  const [tab, setTab] = useState<"hour" | "min">("hour");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Update internal states when value changes from outside
  useEffect(() => {
    if (value) {
      const p = parseTime(value);
      setSelectedH(p.h);
      setSelectedM(p.m);
    }
  }, [value]);

  const applyTime = (h: number, m: number) => {
    const formattedH = String(h).padStart(2, "0");
    const formattedM = String(m).padStart(2, "0");
    onChange(`${formattedH}:${formattedM}`);
  };

  const setNow = () => {
    const now = new Date();
    const h = now.getHours();
    const m = Math.floor(now.getMinutes() / 5) * 5;
    setSelectedH(h);
    setSelectedM(m);
    applyTime(h, m);
    setOpen(false);
  };

  // Hours from 1 to 24 (plus 00 if needed)
  const hours1To24 = [
    1, 2, 3, 4, 5, 6,
    7, 8, 9, 10, 11, 12,
    13, 14, 15, 16, 17, 18,
    19, 20, 21, 22, 23, 24
  ];

  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => {
          setOpen((o) => !o);
          setTab("hour");
        }}
        className={`${inputCls(t, "cursor-pointer flex items-center justify-between font-medium")} ${
          open ? "border-violet-500 ring-2 ring-violet-500/20" : ""
        }`}
      >
        <span className={value ? "text-violet-600 dark:text-violet-400 font-semibold" : t.sub}>
          {value ? fa(value) : placeholder}
        </span>
        <Clock size={15} className={value ? "text-violet-500" : t.sub} />
      </div>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-[290px] rounded-lg border p-3 shadow-2xl ${t.border} ${
            t.dark ? "bg-[#232323]" : "bg-white"
          } ${t.text}`}
        >
          {/* Header with digital display and tabs */}
          <div className={`mb-3 flex items-center justify-between rounded-md border p-2 ${t.border} ${
            t.dark ? "bg-[#1c1c1c]" : "bg-neutral-50"
          }`}>
            <div className="flex items-center gap-1 text-[16px] font-bold">
              <button
                type="button"
                onClick={() => setTab("min")}
                className={`rounded px-2 py-1 transition ${
                  tab === "min" ? "bg-violet-600 text-white" : t.hover
                }`}
              >
                {fa(String(selectedM).padStart(2, "0"))}
              </button>
              <span className="text-violet-500 font-extrabold">:</span>
              <button
                type="button"
                onClick={() => setTab("hour")}
                className={`rounded px-2 py-1 transition ${
                  tab === "hour" ? "bg-violet-600 text-white" : t.hover
                }`}
              >
                {fa(String(selectedH).padStart(2, "0"))}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={setNow}
                title="ساعت فعلی سیستم"
                className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-medium ${t.border} ${t.hover} text-violet-500`}
              >
                <Sparkles size={11} />
                اکنون
              </button>
            </div>
          </div>

          {/* Tab selector */}
          <div className="mb-2 flex rounded border p-0.5 text-[11.5px] font-medium" style={{ borderColor: "inherit" }}>
            <button
              type="button"
              onClick={() => setTab("hour")}
              className={`flex-1 rounded py-1 transition ${
                tab === "hour" ? "bg-violet-600 text-white font-bold" : t.hover
              }`}
            >
              انتخاب ساعت (۱ تا ۲۴)
            </button>
            <button
              type="button"
              onClick={() => setTab("min")}
              className={`flex-1 rounded py-1 transition ${
                tab === "min" ? "bg-violet-600 text-white font-bold" : t.hover
              }`}
            >
              انتخاب دقیقه (۰۰ تا ۵۵)
            </button>
          </div>

          {/* Hour Grid (1 to 24) */}
          {tab === "hour" && (
            <div>
              <div className="mb-1 text-center text-[10.5px] text-neutral-400">
                یک ساعت بین ۱ تا ۲۴ انتخاب کنید:
              </div>
              <div className="grid grid-cols-6 gap-1 text-center text-[12px]">
                {hours1To24.map((h) => {
                  const isSelected = selectedH === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setSelectedH(h);
                        applyTime(h, selectedM);
                        setTab("min"); // Automatically prompt to choose minute next
                      }}
                      className={`h-8 rounded font-semibold transition ${
                        isSelected
                          ? "bg-violet-600 text-white shadow-sm scale-105"
                          : t.dark
                          ? "bg-[#2c2c2c] hover:bg-[#383838]"
                          : "bg-neutral-100 hover:bg-neutral-200"
                      }`}
                    >
                      {fa(h)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Minute Grid */}
          {tab === "min" && (
            <div>
              <div className="mb-1 text-center text-[10.5px] text-neutral-400">
                دقیقه مورد نظر را انتخاب کنید:
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[12px]">
                {minuteOptions.map((m) => {
                  const isSelected = selectedM === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setSelectedM(m);
                        applyTime(selectedH, m);
                      }}
                      className={`h-8 rounded font-semibold transition ${
                        isSelected
                          ? "bg-violet-600 text-white shadow-sm"
                          : t.dark
                          ? "bg-[#2c2c2c] hover:bg-[#383838]"
                          : "bg-neutral-100 hover:bg-neutral-200"
                      }`}
                    >
                      {fa(String(m).padStart(2, "0"))}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick presets & Confirmation */}
          <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: "inherit" }}>
            <div className="flex gap-1">
              {[
                { label: "۰۸:۰۰", h: 8, m: 0 },
                { label: "۱۲:۰۰", h: 12, m: 0 },
                { label: "۱۶:۳۰", h: 16, m: 30 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setSelectedH(preset.h);
                    setSelectedM(preset.m);
                    applyTime(preset.h, preset.m);
                    setOpen(false);
                  }}
                  className={`rounded border px-1.5 py-0.5 text-[10px] ${t.border} ${t.hover} text-neutral-400 hover:text-violet-400`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                applyTime(selectedH, selectedM);
                setOpen(false);
              }}
              className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-[11.5px] font-medium text-white shadow hover:bg-emerald-700"
            >
              <Check size={13} />
              تایید
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  Search,
  Settings,
  RotateCw,
  FileText,
  Check,
  MoreVertical,
  Plus,
  UserRound,
  Building2,
  ClipboardList,
  Boxes,
  CreditCard,
  LayoutList,
  ArrowUpDown,
  HelpCircle,
} from "lucide-react";
import type { Theme } from "./theme";
import { provinces, cities, usages, zones, Contract } from "./data";
import { Field, inputCls, SearchSelect, DatePicker } from "./ui";
import DeviceModal, { Device } from "./DeviceModal";
import ServicesCalendar from "./ServicesCalendar";
import { useCustomers } from "./store";

const STEPS = [
  { key: 0, label: "اطلاعات مشتری", icon: UserRound },
  { key: 1, label: "اطلاعات ساختمان", icon: Building2 },
  { key: 2, label: "اطلاعات قرارداد", icon: ClipboardList },
  { key: 3, label: "اطلاعات دستگاه", icon: Boxes },
  { key: 4, label: "اطلاعات مالی", icon: CreditCard },
  { key: 5, label: "نمای کلی", icon: LayoutList },
];

const phones = [
  "09191813164",
  "09125652781",
  "09123810179",
  "09121825375",
  "09127898535",
  "09193819667",
  "09127856013",
  "09056929761",
  "09124592995",
  "09121112233",
  "09354445566",
  "09127778899",
];

export default function NewContractWizard({
  t,
  onSave,
}: {
  t: Theme;
  onSave: (c: Omit<Contract, "id">) => void;
}) {
  const customers = useCustomers();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [b, setB] = useState({
    sub: "",
    name: "",
    name2: "",
    permit: "",
    year: "",
    floors: "",
    province: "",
    city: "",
    zone: "",
    usage: "",
    postal: "",
    address: "",
    note: "",
  });
  const [c, setC] = useState({ no: "5602", signDate: "1405/05/30", start: "", end: "", desc: "", type: "" });
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceModal, setDeviceModal] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [fin, setFin] = useState({ amount: "", installments: "1", method: "", note: "" });

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };
  const setBv = (k: string, v: string) => setB((s) => ({ ...s, [k]: v }));

  const custList = useMemo(
    () => customers.filter((x) => q.trim().length < 2 || x.name.includes(q.trim())),
    [customers, q]
  );

  const chooseCustomer = (name: string) => {
    setCustomer(name);
    setBv("name", name.replace("* ", ""));
    setStep(1);
  };

  const next = () => {
    if (step === 0 && !customer) {
      notify("لطفا یک مشتری انتخاب کنید");
      return;
    }
    if (
      step === 1 &&
      (!b.sub ||
        !b.name ||
        !b.province ||
        !b.city ||
        !b.zone ||
        !b.usage ||
        !b.postal ||
        !b.address)
    ) {
      notify("فیلدهای ستاره‌دار اطلاعات ساختمان را تکمیل کنید");
      return;
    }
    if (step === 2 && (!c.no || !c.signDate || !c.start)) {
      notify("فیلدهای ستاره‌دار قرارداد را تکمیل کنید");
      return;
    }
    if (step === 5) {
      onSave({
        no: c.no,
        building: "* " + b.name,
        manager: customer!.replace("* ", ""),
        zone: b.zone,
        start: c.start,
        end: c.end || "-",
        kind: "general",
      });
      notify("قرارداد با موفقیت ثبت شد");
      return;
    }
    setStep(step + 1);
  };

  const banner = (text: string) => (
    <div className="mb-4 rounded bg-violet-300/80 py-2 text-center text-[13px] font-medium text-neutral-900">
      {text}
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto p-4">
      {/* stepper */}
      <div className="mb-4 flex flex-row-reverse items-stretch overflow-x-auto">
        {STEPS.slice()
          .reverse()
          .map((s) => {
            const I = s.icon;
            const on = s.key === step;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => s.key <= step && setStep(s.key)}
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)",
                }}
                className={`-ml-3 flex min-w-[190px] flex-1 items-center justify-center gap-2 py-4 text-[13px] ${
                  on ? "bg-amber-600 text-white" : `${t.dark ? "bg-[#2f2f2f]" : "bg-neutral-200"} ${t.sub}`
                }`}
              >
                <span>{s.label}</span>
                <I size={15} />
              </button>
            );
          })}
      </div>

      <div className={`flex-1 rounded ${t.dark ? "bg-[#232323]" : "bg-white"} p-4`}>
        {step === 0 && (
          <>
            {banner(customer ?? "لطفا یک مشتری انتخاب کنید")}
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex h-8 w-[250px] items-center gap-2 rounded border px-2 ${t.input}`}>
                <Search size={14} className={t.sub} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="جستجو خودکار با بیش از 2 کاراکتر"
                  className="w-full bg-transparent text-[12px] outline-none"
                />
              </div>
              {[Settings, RotateCw, FileText].map((I, i) => (
                <button key={i} type="button" className={`rounded p-1.5 ${t.hover} ${t.sub}`}>
                  <I size={16} />
                </button>
              ))}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => notify("فرم مشتری جدید در تب مشتریان موجود است")}
                className="rounded bg-violet-500 px-3 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
              >
                مشتری جدید
              </button>
            </div>
            <table className="w-full text-[12.5px]">
              <thead className={`${t.head} ${t.sub}`}>
                <tr>
                  <th className="w-12 px-3 py-2.5 text-right font-normal">ردیف</th>
                  <th className="px-3 py-2.5 text-right font-normal">نام مشتری</th>
                  <th className="px-3 py-2.5 text-center font-normal">تعداد ساختمان ها</th>
                  <th className="px-3 py-2.5 text-center font-normal">تعداد کل قراردادها</th>
                  <th className="px-3 py-2.5 text-center font-normal">شماره تماس</th>
                  <th className="px-3 py-2.5 text-center font-normal">فعال</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className={t.text}>
                {custList.map((x, i) => (
                  <tr
                    key={x.id}
                    onClick={() => chooseCustomer(x.name)}
                    className={`cursor-pointer border-b ${t.border} ${t.row} ${
                      customer === x.name ? "bg-violet-500/20" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">{i + 1}</td>
                    <td className="px-3 py-2.5">{x.name}</td>
                    <td className="px-3 py-2.5 text-center">{x.buildings}</td>
                    <td className="px-3 py-2.5 text-center">{i % 3 === 0 ? 1 : 0}</td>
                    <td className="px-3 py-2.5 text-center">{phones[i % phones.length]}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Check size={15} className="mx-auto text-green-500" />
                    </td>
                    <td className="px-2 text-center">
                      <MoreVertical size={14} className={t.sub} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {step === 1 && (
          <>
            {banner(customer!.replace("* ", ""))}
            <div className={`rounded border ${t.border} p-4 ${t.text}`}>
              <div className="mb-4 text-[13px]">اطلاعات ساختمان</div>
              <div className="grid grid-cols-3 gap-x-5 gap-y-4">
                <Field label="شماره اشتراک" req>
                  <div className="flex items-center gap-2">
                    <input value={b.sub} onChange={(e) => setBv("sub", e.target.value)} className={inputCls(t)} />
                    <button
                      type="button"
                      className={`h-9 w-9 shrink-0 rounded border ${t.border} ${t.hover}`}
                    >
                      <Plus size={15} className="mx-auto" />
                    </button>
                  </div>
                </Field>
                <Field label="نام ساختمان" req>
                  <input value={b.name} onChange={(e) => setBv("name", e.target.value)} className={inputCls(t)} />
                </Field>
                <Field label="نام دوم">
                  <input value={b.name2} onChange={(e) => setBv("name2", e.target.value)} className={inputCls(t)} />
                </Field>

                <Field label="پروانه ساختمان">
                  <input value={b.permit} onChange={(e) => setBv("permit", e.target.value)} className={inputCls(t)} />
                </Field>
                <Field label="سال ساخت">
                  <SearchSelect
                    t={t}
                    value={b.year}
                    onChange={(v) => setBv("year", v)}
                    options={Array.from({ length: 40 }, (_, i) => String(1405 - i))}
                  />
                </Field>
                <Field label="تعداد طبقات">
                  <div className="flex items-center gap-2">
                    <input value={b.floors} onChange={(e) => setBv("floors", e.target.value)} className={inputCls(t)} />
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${t.border} ${t.sub}`}
                    >
                      <ArrowUpDown size={14} />
                    </span>
                  </div>
                </Field>

                <Field label="استان" req>
                  <SearchSelect
                    t={t}
                    value={b.province}
                    onChange={(v) => {
                      setBv("province", v);
                      setBv("city", "");
                    }}
                    options={provinces}
                  />
                </Field>
                <Field label="شهر" req>
                  <SearchSelect
                    t={t}
                    value={b.city}
                    onChange={(v) => setBv("city", v)}
                    options={cities[b.province] || ["آبیک", "البرز", "بوئین زهرا", "تاکستان", "قزوین"]}
                  />
                </Field>
                <Field label="منطقه" req>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SearchSelect t={t} value={b.zone} onChange={(v) => setBv("zone", v)} options={zones} />
                    </div>
                    <button
                      type="button"
                      className={`h-9 w-9 shrink-0 rounded border ${t.border} ${t.hover}`}
                    >
                      <Plus size={15} className="mx-auto" />
                    </button>
                  </div>
                </Field>

                <Field label="کاربری" req>
                  <SearchSelect t={t} value={b.usage} onChange={(v) => setBv("usage", v)} options={usages} />
                </Field>
                <Field label="کدپستی" req className="col-span-2">
                  <div className="relative">
                    <input
                      value={b.postal}
                      maxLength={10}
                      onChange={(e) => setBv("postal", e.target.value.replace(/\D/g, ""))}
                      className={inputCls(t)}
                    />
                    <span className={`absolute left-3 top-2 text-[12px] ${t.sub}`}>{b.postal.length} / 10</span>
                  </div>
                </Field>

                <Field label="آدرس ساختمان" req className="col-span-3">
                  <input value={b.address} onChange={(e) => setBv("address", e.target.value)} className={inputCls(t)} />
                </Field>
                <Field label="توضیحات اضافی" className="col-span-3">
                  <textarea
                    value={b.note}
                    onChange={(e) => setBv("note", e.target.value)}
                    className={`h-20 w-full rounded border p-2 text-[12.5px] outline-none ${t.input}`}
                  />
                </Field>

                <div className="col-span-3">
                  <div className="mb-1 text-[12.5px]">موقعیت</div>
                  <div
                    className={`relative h-56 overflow-hidden rounded border ${t.border}`}
                    style={{ background: "radial-gradient(circle at 50% 60%, #4a3b25 0%, #2b2b26 60%)" }}
                  >
                    <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded border border-neutral-600 text-[13px]">
                      <button type="button" className="h-6 w-6 bg-neutral-800 text-white">+</button>
                      <button type="button" className="h-6 w-6 bg-neutral-800 text-white">−</button>
                    </div>
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] text-amber-200/70">
                      TEHRAN · QAZVIN · KARAJ
                    </span>
                    <span className="absolute bottom-1 left-2 text-[10px] text-sky-400">Leaflet | TLIFT</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={next}
                className="rounded bg-violet-500 px-5 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
              >
                بعدی
              </button>
              <button
                type="button"
                className={`rounded border px-4 py-1.5 text-[12.5px] ${t.border} ${t.text} ${t.hover}`}
              >
                ثبت نماینده
              </button>
              <span className={`text-[12.5px] ${t.sub}`}>تعداد نمایندگان: 0</span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {banner(customer!.replace("* ", ""))}
            <div className={`rounded border ${t.border} p-4 ${t.text}`}>
              <div className="grid grid-cols-3 gap-x-5 gap-y-4">
                <Field label="شماره قرارداد" req>
                  <input value={c.no} onChange={(e) => setC({ ...c, no: e.target.value })} className={inputCls(t)} />
                </Field>
                <Field label="تاریخ عقد قرارداد" req>
                  <DatePicker t={t} value={c.signDate} onChange={(v) => setC({ ...c, signDate: v })} />
                </Field>
                <Field label="توضیحات" className="row-span-3">
                  <textarea
                    value={c.desc}
                    onChange={(e) => setC({ ...c, desc: e.target.value })}
                    className={`h-[190px] w-full rounded border p-2 text-[12.5px] outline-none ${t.input}`}
                  />
                </Field>
                <Field label="تاریخ شروع" req>
                  <DatePicker t={t} value={c.start} onChange={(v) => setC({ ...c, start: v })} />
                </Field>
                <Field label="تاریخ پایان" req>
                  <DatePicker t={t} value={c.end} onChange={(v) => setC({ ...c, end: v })} />
                </Field>
                <Field label="نوع قرارداد" className="col-span-2">
                  <SearchSelect
                    t={t}
                    value={c.type}
                    onChange={(v) => setC({ ...c, type: v })}
                    options={["سرویس و نگهداری", "جنرال", "متفرقه"]}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={next}
                className="mt-4 rounded bg-violet-500 px-5 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
              >
                بعدی
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {banner(customer!.replace("* ", ""))}
            <div className="mb-3 flex justify-start">
              <button
                type="button"
                onClick={() => setDeviceModal(true)}
                className="rounded bg-violet-500 px-3 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
              >
                ثبت دستگاه جدید
              </button>
            </div>
            {devices.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-14">
                <div className="relative flex h-52 w-52 items-center justify-center rounded-full bg-slate-800/60 text-6xl">
                  📦
                  <span className="absolute -top-2 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-2xl text-white">
                    ?
                  </span>
                </div>
                <div className={`text-[13px] ${t.sub}`}>برای این قرارداد دستگاهی ثبت نشده!</div>
              </div>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className={`${t.head} ${t.sub}`}>
                  <tr>
                    <th className="px-3 py-2 text-right font-normal">ردیف</th>
                    <th className="px-3 py-2 text-right font-normal">نام دستگاه</th>
                    <th className="px-3 py-2 text-center font-normal">نوع وسیله</th>
                    <th className="px-3 py-2 text-center font-normal">نوع آسانسور</th>
                    <th className="px-3 py-2 text-center font-normal">تعداد ایستگاه</th>
                    <th className="px-3 py-2 text-center font-normal">سرویس ها</th>
                  </tr>
                </thead>
                <tbody className={t.text}>
                  {devices.map((d, i) => (
                    <tr key={i} className={`border-b ${t.border}`}>
                      <td className="px-3 py-2.5">{i + 1}</td>
                      <td className="px-3 py-2.5">{d.name}</td>
                      <td className="px-3 py-2.5 text-center">
                        {d.kind === "asansor" ? "آسانسور" : d.kind === "pele" ? "پله برقی" : "رمپ"}
                      </td>
                      <td className="px-3 py-2.5 text-center">{d.type || "-"}</td>
                      <td className="px-3 py-2.5 text-center">{d.stops || "-"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setCalendar(true)}
                          className="text-violet-400 hover:underline"
                        >
                          زمانبندی سرویس‌ها
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-3 flex justify-start gap-2">
              <button
                type="button"
                onClick={next}
                className="rounded bg-violet-500 px-5 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
              >
                بعدی
              </button>
              <button
                type="button"
                onClick={() => setCalendar(true)}
                className={`rounded border px-4 py-1.5 text-[12.5px] ${t.border} ${t.text} ${t.hover}`}
              >
                سرویس‌های این قرارداد
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            {banner(customer!.replace("* ", ""))}
            <div className={`rounded border ${t.border} p-4 ${t.text}`}>
              <div className="grid grid-cols-3 gap-x-5 gap-y-4">
                <Field label="مبلغ قرارداد (ریال)" req>
                  <input
                    value={fin.amount}
                    onChange={(e) =>
                      setFin({
                        ...fin,
                        amount: e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ","),
                      })
                    }
                    className={inputCls(t)}
                  />
                </Field>
                <Field label="تعداد اقساط">
                  <SearchSelect
                    t={t}
                    value={fin.installments}
                    onChange={(v) => setFin({ ...fin, installments: v })}
                    options={["1", "2", "3", "4", "6", "12"]}
                  />
                </Field>
                <Field label="نحوه پرداخت">
                  <SearchSelect
                    t={t}
                    value={fin.method}
                    onChange={(v) => setFin({ ...fin, method: v })}
                    options={["نقدی", "کارت به کارت", "چک", "اقساطی"]}
                  />
                </Field>
                <Field label="توضیحات مالی" className="col-span-3">
                  <textarea
                    value={fin.note}
                    onChange={(e) => setFin({ ...fin, note: e.target.value })}
                    className={`h-24 w-full rounded border p-2 text-[12.5px] outline-none ${t.input}`}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={next}
                className="mt-4 rounded bg-violet-500 px-5 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
              >
                بعدی
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            {banner(customer!.replace("* ", ""))}
            <div className={`grid grid-cols-2 gap-4 text-[12.5px] ${t.text}`}>
              {[
                ["مشتری", customer!.replace("* ", "")],
                ["شماره اشتراک", b.sub],
                ["نام ساختمان", b.name],
                ["استان / شهر", `${b.province} / ${b.city}`],
                ["منطقه", b.zone],
                ["کاربری", b.usage],
                ["کدپستی", b.postal],
                ["آدرس", b.address],
                ["شماره قرارداد", c.no],
                ["تاریخ عقد", c.signDate],
                ["تاریخ شروع", c.start],
                ["تاریخ پایان", c.end || "-"],
                ["تعداد دستگاه", String(devices.length)],
                ["مبلغ قرارداد", fin.amount ? fin.amount + " ریال" : "-"],
              ].map(([k, v]) => (
                <div key={k} className={`flex items-center justify-between rounded border px-3 py-2.5 ${t.border}`}>
                  <span>{v || "-"}</span>
                  <span className={t.sub}>{k}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={next}
                className="rounded bg-green-600 px-6 py-1.5 text-[12.5px] text-white hover:bg-green-700"
              >
                ثبت نهایی قرارداد
              </button>
              <HelpCircle size={14} className={t.sub} />
            </div>
          </>
        )}
      </div>

      {deviceModal && (
        <DeviceModal
          t={t}
          onClose={() => setDeviceModal(false)}
          onSave={(d) => {
            setDevices((s) => [...s, d]);
            setDeviceModal(false);
            notify("دستگاه با موفقیت ثبت شد");
          }}
        />
      )}

      {calendar && <ServicesCalendar t={t} onClose={() => setCalendar(false)} />}

      {toast && (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-800 px-4 py-2 text-[12.5px] text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

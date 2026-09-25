import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { Theme } from "./theme";
import { Field, inputCls, SearchSelect, DatePicker } from "./ui";

export type Device = {
  name: string;
  address: string;
  nationalNo: string;
  certDate: string;
  warrantyDate: string;
  serviceTime: string;
  kind: "asansor" | "pele" | "ramp";
  type: string;
  direction: string;
  usage: string;
  personCap: string;
  weightCap: string;
  stops: string;
  floors: string;
  age: string;
  innerDoor: boolean;
  maker: string;
  serial: string;
};

const empty: Device = {
  name: "",
  address: "",
  nationalNo: "",
  certDate: "",
  warrantyDate: "",
  serviceTime: "",
  kind: "asansor",
  type: "",
  direction: "",
  usage: "",
  personCap: "",
  weightCap: "",
  stops: "",
  floors: "",
  age: "",
  innerDoor: false,
  maker: "",
  serial: "",
};

export default function DeviceModal({
  t,
  onClose,
  onSave,
}: {
  t: Theme;
  onClose: () => void;
  onSave: (d: Device) => void;
}) {
  const [tab, setTab] = useState(0);
  const [d, setD] = useState<Device>(empty);
  const [err, setErr] = useState("");
  const set = (k: keyof Device, v: string | boolean) => setD((s) => ({ ...s, [k]: v }));

  const kinds = [
    { key: "asansor", label: "آسانسور", emoji: "🛗" },
    { key: "pele", label: "پله برقی", emoji: "🛝" },
    { key: "ramp", label: "رمپ", emoji: "🛒" },
  ] as const;

  const Step = ({ i, label }: { i: number; label: string }) => (
    <button
      type="button"
      onClick={() => i === 0 && setTab(0)}
      style={{
        clipPath:
          "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 18px 50%)",
      }}
      className={`-ml-3 min-w-[200px] py-4 text-[13px] ${
        tab === i ? "bg-amber-600 text-white" : `${t.dark ? "bg-[#232323]" : "bg-neutral-200"} ${t.sub}`
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-6"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-[1050px] rounded-lg p-5 shadow-2xl ${t.dark ? "bg-[#2a2a2a]" : "bg-white"} ${t.text}`}
      >
        <div className="mb-5 flex flex-row-reverse justify-center">
          <Step i={0} label="اطلاعات دستگاه" />
          <Step i={1} label="مشخصات دستگاه" />
        </div>

        {tab === 0 ? (
          <>
            <div className="grid grid-cols-4 gap-x-5 gap-y-4">
              <Field label="نام دستگاه" req>
                <input value={d.name} onChange={(e) => set("name", e.target.value)} className={inputCls(t)} />
              </Field>
              <Field label="آدرس دستگاه" className="col-span-3">
                <input value={d.address} onChange={(e) => set("address", e.target.value)} className={inputCls(t)} />
                <div className={`mt-1 text-[11px] ${t.sub}`}>
                  توجه: درصورت پر شدن در اپلیکیشن سرویسکار آدرس دستگاه به جای آدرس ساختمان نمایش داده میشود!
                </div>
              </Field>

              <Field label="شماره ملی آسانسور">
                <input value={d.nationalNo} onChange={(e) => set("nationalNo", e.target.value)} className={inputCls(t)} />
              </Field>
              <Field label="تاریخ پایان گواهینامه">
                <DatePicker t={t} value={d.certDate} onChange={(v) => set("certDate", v)} />
              </Field>
              <Field label="تاریخ پایان گارانتی">
                <DatePicker t={t} value={d.warrantyDate} onChange={(v) => set("warrantyDate", v)} />
              </Field>
              <Field label="زمان مطلوب انجام سرویس (دقیقه)">
                <input value={d.serviceTime} onChange={(e) => set("serviceTime", e.target.value)} className={inputCls(t)} />
              </Field>

              <div className="col-span-4">
                <div className="mb-2 text-[12.5px]">
                  <span className="text-red-500">* </span>نوع وسیله
                </div>
                <div className="flex flex-row-reverse justify-end gap-4">
                  {kinds.map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      onClick={() => set("kind", k.key)}
                      className={`flex h-[85px] w-[130px] flex-col items-center justify-center gap-1 rounded border text-[12.5px] ${
                        d.kind === k.key ? "border-violet-500" : `${t.border} border-transparent`
                      } ${t.hover}`}
                    >
                      <span className="text-2xl">{k.emoji}</span>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="نوع آسانسور" req>
                <SearchSelect
                  t={t}
                  value={d.type}
                  onChange={(v) => set("type", v)}
                  options={["کششی", "هیدرولیک", "پانورامیک", "باربر", "خودروبر"]}
                />
              </Field>
              <Field label="جهت">
                <SearchSelect
                  t={t}
                  value={d.direction}
                  onChange={(v) => set("direction", v)}
                  options={["شمالی", "جنوبی", "شرقی", "غربی"]}
                />
              </Field>
              <Field label="نوع کاربری">
                <SearchSelect
                  t={t}
                  value={d.usage}
                  onChange={(v) => set("usage", v)}
                  options={["مسکونی", "تجاری", "اداری", "بیمارستانی"]}
                />
              </Field>
              <Field label="ظرفیت نفرات (نفر)">
                <input value={d.personCap} onChange={(e) => set("personCap", e.target.value)} className={inputCls(t)} />
              </Field>

              <Field label="ظرفیت وزنی (کیلوگرم)">
                <input value={d.weightCap} onChange={(e) => set("weightCap", e.target.value)} className={inputCls(t)} />
              </Field>
              <Field label="تعداد ایستگاه">
                <input value={d.stops} onChange={(e) => set("stops", e.target.value)} className={inputCls(t)} />
              </Field>
              <Field label="تعداد طبقات">
                <input value={d.floors} onChange={(e) => set("floors", e.target.value)} className={inputCls(t)} />
              </Field>
              <Field label="سن (سال)">
                <input value={d.age} onChange={(e) => set("age", e.target.value)} className={inputCls(t)} />
              </Field>

              <div className="col-span-4">
                <div className="mb-2 text-[12.5px]">دارای درب داخلی</div>
                <input
                  type="checkbox"
                  checked={d.innerDoor}
                  onChange={(e) => set("innerDoor", e.target.checked)}
                  className="h-4 w-4 accent-violet-500"
                />
              </div>
            </div>
            {err && <div className="mt-2 text-[12px] text-red-500">{err}</div>}
            <button
              type="button"
              onClick={() => {
                if (!d.name || !d.type) {
                  setErr("نام دستگاه و نوع آسانسور الزامی است");
                  return;
                }
                setErr("");
                setTab(1);
              }}
              className="mt-5 rounded bg-violet-400 px-6 py-1.5 text-[12.5px] text-white hover:bg-violet-500"
            >
              بعدی
            </button>
          </>
        ) : (
          <>
            <div className="mb-4 text-[13.5px]">لطفا مشخصات دستگاه مورد نظر را وارد کنید</div>
            <fieldset className={`rounded border p-4 ${t.border}`}>
              <legend className={`px-2 text-[12.5px] ${t.sub}`}>موتور</legend>
              <div className="grid grid-cols-2 gap-5">
                <Field label="شرکت سازنده">
                  <input value={d.maker} onChange={(e) => set("maker", e.target.value)} className={inputCls(t)} />
                </Field>
                <Field label="شماره سریال">
                  <div className="flex items-center gap-2">
                    <input value={d.serial} onChange={(e) => set("serial", e.target.value)} className={inputCls(t)} />
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${t.border} ${t.sub}`}
                    >
                      <ArrowUpDown size={14} />
                    </span>
                  </div>
                </Field>
              </div>
            </fieldset>
            <button
              type="button"
              onClick={() => onSave(d)}
              className="mt-5 rounded bg-violet-400 px-6 py-1.5 text-[12.5px] text-white hover:bg-violet-500"
            >
              پایان
            </button>
          </>
        )}
      </div>
    </div>
  );
}

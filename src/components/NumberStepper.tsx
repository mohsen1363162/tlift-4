import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
};

export default function NumberStepper({ value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, className = "", inputClassName = "", ariaLabel = "تعداد" }: Props) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return <div className={`inline-flex h-11 items-stretch overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm ${className}`} dir="ltr">
    <button type="button" aria-label={`کم کردن ${ariaLabel}`} onClick={() => onChange(clamp(value - step))} disabled={value <= min} className="flex w-11 shrink-0 items-center justify-center bg-rose-50 text-rose-600 active:bg-rose-200 disabled:opacity-35"><Minus size={20} strokeWidth={3}/></button>
    <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(clamp(Number(e.target.value) || min))} className={`number-stepper-input min-w-12 flex-1 border-x border-slate-200 px-1 text-center text-base font-bold text-slate-800 outline-none ${inputClassName}`} aria-label={ariaLabel}/>
    <button type="button" aria-label={`زیاد کردن ${ariaLabel}`} onClick={() => onChange(clamp(value + step))} disabled={value >= max} className="flex w-11 shrink-0 items-center justify-center bg-emerald-50 text-emerald-700 active:bg-emerald-200 disabled:opacity-35"><Plus size={20} strokeWidth={3}/></button>
  </div>;
}

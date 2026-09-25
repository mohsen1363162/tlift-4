import { useState, useMemo, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import { DatePicker, TimePicker } from "../ui";
import { makeTheme } from "../theme";
import { getTodayJalali } from "../utils/dateConverter";

const getCurrentDeclareValues = () => {
  const { jy, jm, jd } = getTodayJalali();
  const now = new Date();
  return {
    date: `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
};

const DEFAULT_TECHNICIANS = [
  "بهمن کشاورز",
  "مجتبی فرهمند",
  "محسن امامی برسری",
  "محمد حسن رحیمی زاده",
  "مرتضی قاسمعلی",
  "میثم سهرابی",
];

const DEFAULT_REASONS = [
  "توقف بین طبقات",
  "عدم کارکرد آسانسور (خاموشی کامل)",
  "گیر کردن افراد در کابین",
  "خرابی و باز نشدن درب کابین / طبقه",
  "سر و صدا و لرزش غیرعادی کابین یا موتورخانه",
  "روشن نشدن روشنایی یا فن کابین",
  "خرابی شستی احضار طبقات یا پنل کابین",
  "خطای تابلو فرمان (Error)",
  "عدم همسطحی کابین با طبقات",
  "قطع سنسور و چشمی درب (فتوسل)",
  "سایر دلایل فنی",
];

export interface BreakdownFormData {
  declareDate: string;
  declareTime: string;
  isUrgent: boolean;
  reason: string;
  description: string;
  technicians: string[];
}

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BreakdownFormData) => void;
  initialData?: Partial<BreakdownFormData>;
  title?: string;
}

export default function BreakdownModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = "ثبت خرابی جدید",
}: BreakdownModalProps) {
  const initialNow = getCurrentDeclareValues();
  const pickerTheme = makeTheme(true);
  const [declareDate, setDeclareDate] = useState(initialNow.date);
  const [declareTime, setDeclareTime] = useState(initialNow.time);
  const [isUrgent, setIsUrgent] = useState(false);
  const [reason, setReason] = useState(DEFAULT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [selectedTechs, setSelectedTechs] = useState<string[]>(["محسن امامی برسری"]);
  const [searchTech, setSearchTech] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = getCurrentDeclareValues();
      setDeclareDate(initialData?.declareDate || now.date);
      setDeclareTime(initialData?.declareTime || now.time);
      setIsUrgent(initialData?.isUrgent ?? false);
      setReason(initialData?.reason || DEFAULT_REASONS[0]);
      setDescription(initialData?.description || "");
      setSelectedTechs(
        initialData?.technicians && initialData.technicians.length > 0
          ? initialData.technicians
          : ["محسن امامی برسری"]
      );
      setSearchTech("");
      setError(null);
    }
  }, [isOpen, initialData]);

  const filteredTechs = useMemo(() => {
    if (!searchTech.trim()) return DEFAULT_TECHNICIANS;
    return DEFAULT_TECHNICIANS.filter((t) => t.includes(searchTech.trim()));
  }, [searchTech]);

  const toggleTech = (name: string) => {
    setSelectedTechs((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleSave = () => {
    if (!declareDate.trim()) {
      setError("لطفاً تاریخ اعلام خرابی را وارد کنید");
      return;
    }
    if (!declareTime.trim()) {
      setError("لطفاً ساعت اعلام خرابی را وارد کنید");
      return;
    }
    if (!description.trim()) {
      setError("لطفاً شرح خرابی را وارد نمایید");
      return;
    }

    onSave({
      declareDate: declareDate.trim(),
      declareTime: declareTime.trim(),
      isUrgent,
      reason,
      description: description.trim(),
      technicians: selectedTechs.length > 0 ? selectedTechs : ["محسن امامی برسری"],
    });
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[700px] flex-col overflow-hidden rounded-2xl border border-neutral-700/80 bg-[#1d1d1d] text-neutral-100 shadow-2xl max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="relative flex items-center justify-center px-5 py-4 border-b border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X size={18} />
          </button>
          <h3 className="text-[14.5px] font-semibold text-neutral-100">
            {title}
          </h3>
        </div>

        {/* Modal Form Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Row 1: تاریخ اعلام | ساعت اعلام | نیاز به رسیدگی فوری */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* تاریخ اعلام */}
            <div className="sm:col-span-4">
              <label className="block text-[11.5px] font-medium text-neutral-300 mb-1.5">
                <span className="text-red-500 ml-1">*</span>تاریخ اعلام
              </label>
              <DatePicker
                t={pickerTheme}
                value={declareDate}
                onChange={setDeclareDate}
                placeholder="انتخاب تاریخ اعلام"
              />
            </div>

            {/* ساعت اعلام */}
            <div className="sm:col-span-4">
              <label className="block text-[11.5px] font-medium text-neutral-300 mb-1.5">
                <span className="text-red-500 ml-1">*</span>ساعت اعلام
              </label>
              <TimePicker
                t={pickerTheme}
                value={declareTime}
                onChange={setDeclareTime}
                placeholder="انتخاب ساعت اعلام"
              />
            </div>

            {/* نیاز به رسیدگی فوری */}
            <div className="sm:col-span-4 flex items-center justify-start sm:justify-center pb-2">
              <button
                type="button"
                onClick={() => setIsUrgent(!isUrgent)}
                className="flex items-center gap-2 text-[12px] text-neutral-300 hover:text-white transition select-none cursor-pointer"
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                    isUrgent
                      ? "border-purple-500 bg-purple-600 text-white"
                      : "border-neutral-600 bg-transparent"
                  }`}
                >
                  {isUrgent && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <span>نیاز به رسیدگی فوری</span>
              </button>
            </div>
          </div>

          {/* Row 2: دلایل خرابی */}
          <div>
            <label className="block text-[11.5px] font-medium text-neutral-300 mb-1.5">
              دلایل خرابی
            </label>
            <div className="relative">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full appearance-none rounded-lg border border-neutral-700/90 bg-[#262626] px-3.5 py-2.5 text-[12px] text-white focus:border-purple-500 focus:outline-none cursor-pointer"
              >
                {DEFAULT_REASONS.map((r) => (
                  <option key={r} value={r} className="bg-[#262626] text-white py-1">
                    {r}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path
                    d="M1 1.5L6 6.5L11 1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Row 3: شرح */}
          <div>
            <label className="block text-[11.5px] font-medium text-neutral-300 mb-1.5">
              <span className="text-red-500 ml-1">*</span>شرح
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح خرابی ..."
              className="w-full rounded-lg border border-neutral-700/90 bg-[#262626] p-3 text-[12px] text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Row 4: سرویس کارها */}
          <div>
            <label className="block text-[11.5px] font-medium text-neutral-300 mb-2">
              سرویس کارها
            </label>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <input
                type="text"
                value={searchTech}
                onChange={(e) => setSearchTech(e.target.value)}
                placeholder="جستجو ..."
                className="w-full rounded-lg border border-neutral-700/90 bg-[#262626] pr-9 pl-3 py-1.5 text-[12px] text-white placeholder-neutral-500 focus:border-purple-500 focus:outline-none"
              />
              <Search
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
              />
            </div>

            {/* Technicians List */}
            <div className="space-y-1 max-h-[160px] overflow-y-auto rounded-lg border border-neutral-800 bg-[#232323] p-1.5">
              {filteredTechs.map((name) => {
                const isSelected = selectedTechs.includes(name);
                return (
                  <div
                    key={name}
                    onClick={() => toggleTech(name)}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-neutral-800/80 transition cursor-pointer select-none"
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                        isSelected
                          ? "border-purple-500 bg-purple-600 text-white"
                          : "border-neutral-600 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check size={11} className="stroke-[3]" />}
                    </div>
                    <span className="text-[12px] text-neutral-300 font-normal">
                      {name}
                    </span>
                  </div>
                );
              })}
              {filteredTechs.length === 0 && (
                <div className="py-3 text-center text-[11.5px] text-neutral-500">
                  سرویس‌کاری با این نام یافت نشد
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions (Matching sshot-25.png: left aligned in RTL) */}
        <div className="flex items-center justify-start gap-2.5 px-5 py-3.5 border-t border-neutral-800 bg-[#1b1b1b]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-5 py-1.5 text-[12px] font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white transition active:scale-95"
          >
            انصراف
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-[#7c5cdb] hover:bg-[#6c48cf] px-6 py-1.5 text-[12px] font-semibold text-white shadow transition active:scale-95"
          >
            ثبت
          </button>
        </div>
      </div>
    </div>
  );
}

import { X, RotateCw, Check, SlidersHorizontal, Trash2 } from "lucide-react";
import type { Theme } from "../theme";

export type ContractFilterState = {
  status: "all" | "active" | "archived" | "terminated" | "expiring" | "renewing" | "not_started";
  terminateFrom: string;
  terminateTo: string;
  insuranceStatus: string;
  certificateStatus: string;
};

export const defaultContractFilters: ContractFilterState = {
  status: "all",
  terminateFrom: "",
  terminateTo: "",
  insuranceStatus: "all",
  certificateStatus: "all",
};

export default function ContractsFilterDrawer({
  isOpen,
  onClose,
  filters,
  onChange,
  onApply,
  onReset,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: ContractFilterState;
  onChange: (f: ContractFilterState) => void;
  onApply: () => void;
  onReset: () => void;
  t: Theme;
}) {
  if (!isOpen) return null;

  const statusOptions: { id: ContractFilterState["status"]; label: string }[] = [
    { id: "active", label: "قراردادهای فعال" },
    { id: "archived", label: "نمایش قراردادهای آرشیو شده" },
    { id: "terminated", label: "نمایش قراردادهای فسخ شده" },
    { id: "expiring", label: "نمایش قراردادهای درحال اتمام" },
    { id: "renewing", label: "نمایش قراردادهای در حال تمدید" },
    { id: "all", label: "همه" },
    { id: "not_started", label: "شروع نشده" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Drawer on the LEFT (matches screenshot 43 & 44) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col border-r shadow-2xl transition-transform ${
          t.border
        } ${t.dark ? "bg-[#1d1d1d]" : "bg-white"} ${t.text}`}
      >
        {/* Drawer Header */}
        <div className={`flex items-center justify-between border-b px-4 py-3.5 ${t.border}`}>
          <button
            type="button"
            onClick={onClose}
            className={`rounded p-1 transition ${t.hover} ${t.sub}`}
          >
            <X size={17} />
          </button>
          <div className="flex items-center gap-1.5 font-bold text-[13.5px]">
            <SlidersHorizontal size={15} className="text-violet-400" />
            <span>فیلترهای پیشرفته</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-right text-[12.5px]">
          {/* Status Section */}
          <div>
            <div className={`mb-2 font-medium ${t.sub}`}>وضعیت قرارداد</div>
            <div className="space-y-2">
              {statusOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center justify-end gap-2.5 cursor-pointer py-1 ${
                    filters.status === opt.id ? "text-violet-400 font-semibold" : t.text
                  }`}
                >
                  <span>{opt.label}</span>
                  <input
                    type="radio"
                    name="contractStatus"
                    checked={filters.status === opt.id}
                    onChange={() => onChange({ ...filters, status: opt.id })}
                    className="h-4 w-4 accent-violet-500 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Termination Date Range */}
          <div className="space-y-3 border-t pt-3" style={{ borderColor: "inherit" }}>
            <div>
              <label className={`block mb-1.5 font-medium ${t.sub}`}>تاریخ فسخ از</label>
              <input
                value={filters.terminateFrom}
                onChange={(e) => onChange({ ...filters, terminateFrom: e.target.value })}
                placeholder="تاریخ فسخ از..."
                className={`w-full rounded border px-3 py-2 text-[12px] outline-none text-right ${t.input}`}
              />
            </div>
            <div>
              <label className={`block mb-1.5 font-medium ${t.sub}`}>تاریخ فسخ تا</label>
              <input
                value={filters.terminateTo}
                onChange={(e) => onChange({ ...filters, terminateTo: e.target.value })}
                placeholder="تاریخ فسخ تا..."
                className={`w-full rounded border px-3 py-2 text-[12px] outline-none text-right ${t.input}`}
              />
            </div>
          </div>

          {/* Insurance Status */}
          <div className="border-t pt-3" style={{ borderColor: "inherit" }}>
            <label className={`block mb-1.5 font-medium ${t.sub}`}>وضعیت بیمه</label>
            <select
              value={filters.insuranceStatus}
              onChange={(e) => onChange({ ...filters, insuranceStatus: e.target.value })}
              className={`w-full rounded border px-2.5 py-2 text-[12px] outline-none ${t.input}`}
            >
              <option value="all" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                وضعیت بیمه (همه)
              </option>
              <option value="valid" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                دارای بیمه‌نامه معتبر
              </option>
              <option value="expired" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                فاقد بیمه‌نامه یا منقضی
              </option>
              <option value="expiring" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                در حال انقضا و تمدید
              </option>
            </select>
          </div>

          {/* Device Certificate Status */}
          <div className="border-t pt-3" style={{ borderColor: "inherit" }}>
            <label className={`block mb-1.5 font-medium ${t.sub}`}>وضعیت گواهینامه دستگاه</label>
            <select
              value={filters.certificateStatus}
              onChange={(e) => onChange({ ...filters, certificateStatus: e.target.value })}
              className={`w-full rounded border px-2.5 py-2 text-[12px] outline-none ${t.input}`}
            >
              <option value="all" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                وضعیت گواهینامه دستگاه (همه)
              </option>
              <option value="valid" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                دارای گواهی استاندارد معتبر
              </option>
              <option value="none" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                فاقد گواهینامه استاندارد
              </option>
              <option value="inspecting" className={t.dark ? "bg-neutral-800" : "bg-white"}>
                در دست بازرسی استاندارد
              </option>
            </select>
          </div>
        </div>

        {/* Drawer Footer (matches screenshot 44) */}
        <div className={`flex items-center gap-2 border-t p-3 ${t.border} ${t.dark ? "bg-[#181818]" : "bg-neutral-50"}`}>
          <button
            type="button"
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-violet-600 hover:bg-violet-700 px-4 py-2 text-[12.5px] font-medium text-white shadow-sm transition"
          >
            <Check size={15} />
            <span>اعمال فیلتر و مشاهده نتایج</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            title="پاک کردن فیلترها"
            className={`flex h-9 w-9 items-center justify-center rounded border ${t.border} ${t.hover} ${t.sub}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </>
  );
}

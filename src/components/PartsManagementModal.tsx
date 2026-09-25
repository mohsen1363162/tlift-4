import { useState, useMemo, useEffect } from "react";
import { X, Search, Wrench, Plus, Trash2, Check, ShoppingBag, Hash, Tag, Layers } from "lucide-react";
import { partsApi, PartItem } from "../partsStore";

const fa = (n: string | number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const money = (n: number) => fa(n.toLocaleString("en-US")) + " ریال";

export interface ServicePartData {
  code?: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  description?: string;
}

interface PartsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (part: ServicePartData) => void;
  initialData?: Partial<ServicePartData>;
  title?: string;
  currentParts?: ServicePartData[];
  onDeleteCurrentPart?: (index: number) => void;
}

const DEFAULT_UNITS = ["عدد", "لیتر", "متر", "کیلوگرم", "بسته", "جفت", "قوطی", "رول", "دست"];

export default function PartsManagementModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = "مدیریت و ثبت قطعات",
  currentParts = [],
  onDeleteCurrentPart,
}: PartsManagementModalProps) {
  const catalog = partsApi.all();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(null);

  const [code, setCode] = useState(initialData?.code || "");
  const [name, setName] = useState(initialData?.name || "");
  const [unit, setUnit] = useState(initialData?.unit || "عدد");
  const [qty, setQty] = useState<number>(initialData?.qty || 1);
  const [price, setPrice] = useState<number>(initialData?.price || 0);
  const [description, setDescription] = useState(initialData?.description || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode(initialData?.code || "");
      setName(initialData?.name || "");
      setUnit(initialData?.unit || "عدد");
      setQty(initialData?.qty || 1);
      setPrice(initialData?.price || 0);
      setDescription(initialData?.description || "");
      setSearchQuery("");
      setSelectedCatalogId(null);
      setError(null);
    }
  }, [isOpen, initialData]);

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog.slice(0, 10);
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [catalog, searchQuery]);

  const handleSelectFromCatalog = (item: PartItem) => {
    setSelectedCatalogId(item.id);
    setCode(item.code);
    setName(item.name);
    setUnit(item.unit || "عدد");
    setPrice(item.price || 0);
    if (!qty || qty < 1) setQty(1);
    setError(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("لطفاً نام قطعه را مشخص نمایید");
      return;
    }
    if (qty <= 0) {
      setError("تعداد قطعه باید حداقل ۱ باشد");
      return;
    }

    onSave({
      code: code.trim() || String(Math.floor(1000 + Math.random() * 9000)),
      name: name.trim(),
      unit: unit || "عدد",
      qty: Number(qty),
      price: Number(price) || 0,
      description: description.trim(),
    });

    onClose();
  };

  if (!isOpen) return null;

  const totalAmount = (Number(qty) || 0) * (Number(price) || 0);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-neutral-700/80 bg-[#1d1d1d] text-neutral-100 shadow-2xl max-h-[92vh]"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#222]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Wrench size={16} />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-neutral-100">{title}</h3>
              <p className="text-[11px] text-neutral-400">ثبت قطعه مصرفی و تجهیزات در گزارش سرویس</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Catalog Quick Search */}
          <div className="space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
            <label className="flex items-center gap-1.5 text-[11.5px] font-medium text-neutral-300">
              <ShoppingBag size={13} className="text-violet-400" />
              <span>انتخاب سریع از فهرست قطعات و تجهیزات انبار:</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute right-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام یا کد قطعه (مثلا روغن، کفشک، بست، لنت...)"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/90 py-2 pr-9 pl-3 text-[12px] text-white placeholder-neutral-500 outline-none focus:border-violet-500 transition"
              />
            </div>

            {/* Quick Catalog Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1.5 max-h-[96px] overflow-y-auto">
              {filteredCatalog.map((item) => {
                const isSelected = selectedCatalogId === item.id || name === item.name;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectFromCatalog(item)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] border transition ${
                      isSelected
                        ? "border-violet-500 bg-violet-600/30 text-violet-200 font-bold"
                        : "border-neutral-700/80 bg-neutral-800 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-700"
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">({fa(item.price.toLocaleString())} ریال)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* کد قطعه */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11.5px] text-neutral-300">
                <Hash size={12} className="text-neutral-400" />
                <span>کد قطعه:</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: 29039"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-[12px] text-white font-mono outline-none focus:border-violet-500"
              />
            </div>

            {/* نام قطعه */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11.5px] text-neutral-300">
                <Tag size={12} className="text-neutral-400" />
                <span className="text-rose-400">*</span>
                <span>نام قطعه / کالا:</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: روغن دوزمانه"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-[12px] text-white outline-none focus:border-violet-500"
              />
            </div>

            {/* واحد سنجش */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11.5px] text-neutral-300">
                <Layers size={12} className="text-neutral-400" />
                <span>واحد سنجش:</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-[12px] text-white outline-none focus:border-violet-500"
              >
                {DEFAULT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* تعداد */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[11.5px] text-neutral-300">
                <span className="text-rose-400">*</span>
                <span>تعداد / مقدار:</span>
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setQty((prev) => Math.max(1, (Number(prev) || 1) - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-l-0 border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="h-9 w-full border-y border-neutral-700 bg-neutral-800/80 px-3 text-center text-[12.5px] text-white font-mono outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setQty((prev) => (Number(prev) || 0) + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-r-0 border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* قیمت واحد */}
            <div className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[11.5px] text-neutral-300">قیمت واحد (ریال):</label>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {price ? money(price) : "۰ ریال"}
                </span>
              </div>
              <input
                type="text"
                value={price ? price.toLocaleString("en-US") : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setPrice(Number(raw) || 0);
                }}
                placeholder="مثال: ۲٬۰۰۰٬۰۰۰"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-[12px] text-white font-mono outline-none focus:border-violet-500"
              />
            </div>

            {/* توضیحات تکمیلی */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11.5px] text-neutral-300">شرح / محل نصب قطعه (اختیاری):</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیحات بیشتر درباره قطعه یا علت تعویض..."
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-[12px] text-white outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Live Total Calculation Card */}
          <div className="flex items-center justify-between rounded-xl border border-violet-900/50 bg-violet-950/20 px-4 py-2.5">
            <span className="text-[12px] text-violet-300 font-medium">مبلغ کل این ردیف قطعه:</span>
            <span className="text-[14px] font-bold text-violet-200 font-mono">
              {money(totalAmount)}
            </span>
          </div>

          {/* Currently Added Parts List (if any) */}
          {currentParts.length > 0 && (
            <div className="mt-2 space-y-2 border-t border-neutral-800 pt-3">
              <div className="flex items-center justify-between text-[11.5px] text-neutral-400">
                <span>قطعات ثبت‌شده در این گزارش ({fa(currentParts.length)} مورد):</span>
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {currentParts.map((cp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-850 px-3 py-1.5 text-[11.5px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-400 font-mono text-[10.5px]">#{cp.code}</span>
                      <span className="font-medium text-neutral-200">{cp.name}</span>
                      <span className="text-neutral-400">
                        ({fa(cp.qty)} {cp.unit})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-mono">{money(cp.qty * cp.price)}</span>
                      {onDeleteCurrentPart && (
                        <button
                          type="button"
                          onClick={() => onDeleteCurrentPart(idx)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="حذف این قطعه"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
            className="flex items-center gap-1.5 rounded-lg bg-[#7c5cdb] hover:bg-[#6c48cf] px-6 py-1.5 text-[12px] font-semibold text-white shadow transition active:scale-95"
          >
            <Check size={14} />
            <span>ثبت قطعه</span>
          </button>
        </div>
      </div>
    </div>
  );
}

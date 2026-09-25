import { useState, useEffect, useMemo } from "react";
import {
  Pin,
  Trash2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Tablet,
  Building2,
  User,
  Phone,
  MapPin,
  RotateCcw,
  Plus,
} from "lucide-react";
import type { Theme } from "../theme";
import type { Contract } from "../data";

const fa = (n: string | number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const money = (n: number) => fa(n.toLocaleString("en-US")) + " ریال";

export interface ContractRibbonBarProps {
  t: Theme;
  contract?: Partial<Contract>;
  contractNo?: string | number;
  totalPayable?: number;
  totalPaid?: number;
  debt?: number;
  buildingDebt?: number;
  customerDebt?: number;
  contractType?: string;
  buildingName?: string;
  managerName?: string;
  phone?: string;
  zone?: string;
  onShowToast?: (msg: string) => void;
}

interface RibbonItemDef {
  key: string;
  label: string;
  val: string;
  isLink?: boolean;
  hasCoin?: boolean;
  icon?: typeof Building2;
  defaultVisible?: boolean;
}

const DEFAULT_ORDER = [
  "contractNo",
  "buildingName",
  "payable",
  "paid",
  "debt",
  "buildingDebt",
  "customerDebt",
  "managerName",
  "phone",
  "zone",
];

const PREFS_STORAGE_KEY = "tlift_contract_ribbon_v2";

export default function ContractRibbonBar({
  t,
  contract,
  contractNo = contract?.no || "5369",
  totalPayable = 14000000,
  totalPaid = 14000000,
  debt = 0,
  buildingDebt = 0,
  customerDebt = 0,
  contractType = "سرویس نگهداری - به ازای سرویس",
  buildingName = contract?.building || contract?.buildingName || "مجتمع مسکونی آسمان",
  managerName = contract?.manager || contract?.coordinator || "محسن امامی",
  phone = contract?.phone || "۰۹۱۲۸۸۲۷۷۳۴",
  zone = contract?.zone || "منطقه ۱",
  onShowToast,
}: ContractRibbonBarProps) {
  const [expanded, setExpanded] = useState(false);

  // Load preferences from localStorage or defaults
  const [itemOrder, setItemOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.order) && parsed.order.length > 0) {
          // Merge any missing keys
          const missing = DEFAULT_ORDER.filter((k) => !parsed.order.includes(k));
          return [...parsed.order, ...missing];
        }
      }
    } catch (e) {
      console.warn("Failed to load ribbon prefs", e);
    }
    return DEFAULT_ORDER;
  });

  const [pinnedKeys, setPinnedKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.pinned)) return parsed.pinned;
      }
    } catch (e) {
      console.warn("Failed to load ribbon pinned", e);
    }
    return ["contractNo"];
  });

  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.hidden)) return parsed.hidden;
      }
    } catch (e) {
      console.warn("Failed to load ribbon hidden", e);
    }
    return ["phone", "zone"]; // By default phone and zone are in expanded section, but can be unhidden
  });

  // Save to localStorage when prefs change
  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          order: itemOrder,
          pinned: pinnedKeys,
          hidden: hiddenKeys,
        })
      );
    } catch (e) {
      console.warn("Failed to save ribbon prefs", e);
    }
  }, [itemOrder, pinnedKeys, hiddenKeys]);

  // Dictionary of all items
  const allItemsMap = useMemo<Record<string, RibbonItemDef>>(() => {
    return {
      contractNo: {
        key: "contractNo",
        label: "شماره قرارداد",
        val: fa(contractNo),
        isLink: true,
        hasCoin: false,
        icon: Tablet,
      },
      buildingName: {
        key: "buildingName",
        label: "نام ساختمان",
        val: String(buildingName).replace(/^\*\s*/, ""),
        isLink: false,
        hasCoin: false,
        icon: Building2,
      },
      managerName: {
        key: "managerName",
        label: "مسئول هماهنگی",
        val: managerName,
        isLink: false,
        hasCoin: false,
        icon: User,
      },
      payable: {
        key: "payable",
        label: "جمع مبلغ قابل پرداخت",
        val: money(totalPayable),
        isLink: false,
        hasCoin: true,
      },
      paid: {
        key: "paid",
        label: "پرداختی",
        val: money(totalPaid),
        isLink: false,
        hasCoin: true,
      },
      debt: {
        key: "debt",
        label: "مانده بدهی قرارداد",
        val: money(debt),
        isLink: false,
        hasCoin: true,
      },
      buildingDebt: {
        key: "buildingDebt",
        label: "مانده بدهی کل ساختمان",
        val: money(buildingDebt),
        isLink: false,
        hasCoin: true,
      },
      customerDebt: {
        key: "customerDebt",
        label: "مانده بدهی کل مشتری",
        val: money(customerDebt),
        isLink: false,
        hasCoin: true,
      },
      phone: {
        key: "phone",
        label: "تلفن همراه",
        val: phone,
        isLink: false,
        hasCoin: false,
        icon: Phone,
      },
      zone: {
        key: "zone",
        label: "منطقه",
        val: zone,
        isLink: false,
        hasCoin: false,
        icon: MapPin,
      },
    };
  }, [
    contractNo,
    buildingName,
    managerName,
    totalPayable,
    totalPaid,
    debt,
    buildingDebt,
    customerDebt,
    contractType,
    phone,
    zone,
  ]);

  // Handle pin toggle and moving item to the front (rightmost in RTL)
  const handlePinToggle = (key: string) => {
    const isCurrentlyPinned = pinnedKeys.includes(key);

    if (isCurrentlyPinned) {
      // If already pinned at position 0, unpin it
      if (itemOrder[0] === key) {
        setPinnedKeys((prev) => prev.filter((k) => k !== key));
        onShowToast?.(`پین آیتم «${allItemsMap[key]?.label || key}» برداشته شد.`);
      } else {
        // Move to first spot (rightmost in RTL)
        setItemOrder((prev) => [key, ...prev.filter((k) => k !== key)]);
        onShowToast?.(`آیتم «${allItemsMap[key]?.label || key}» به ابتدای ردیف (سمت راست) منتقل شد.`);
      }
    } else {
      // Pin it and bring directly to the top (first position / right side)
      setPinnedKeys((prev) => [...prev, key]);
      setItemOrder((prev) => [key, ...prev.filter((k) => k !== key)]);
      onShowToast?.(`آیتم «${allItemsMap[key]?.label || key}» پین شد و به اول لیست آورده شد.`);
    }
  };

  // Handle hiding / deleting item from the visible bar
  const handleDeleteItem = (key: string) => {
    setHiddenKeys((prev) => [...new Set([...prev, key])]);
    // Also remove from pinned
    setPinnedKeys((prev) => prev.filter((k) => k !== key));
    onShowToast?.(`آیتم «${allItemsMap[key]?.label || key}» از نوار بالا حذف گردید.`);
  };

  // Restore a hidden item
  const handleRestoreItem = (key: string) => {
    setHiddenKeys((prev) => prev.filter((k) => k !== key));
    onShowToast?.(`آیتم «${allItemsMap[key]?.label || key}» مجدداً به نوار افزوده شد.`);
  };

  // Reset to default
  const handleResetDefaults = () => {
    setItemOrder(DEFAULT_ORDER);
    setPinnedKeys(["contractNo"]);
    setHiddenKeys(["phone", "zone"]);
    onShowToast?.("چیدمان نوار بالا به حالت پیش‌فرض بازنشانی شد.");
  };

  // Filter visible items according to order and hidden state
  const visibleItems = useMemo(() => {
    return itemOrder
      .filter((k) => !hiddenKeys.includes(k) && allItemsMap[k])
      .map((k) => allItemsMap[k]);
  }, [itemOrder, hiddenKeys, allItemsMap]);

  // List of currently hidden items that can be restored
  const deletedItems = useMemo(() => {
    return hiddenKeys.map((k) => allItemsMap[k]).filter(Boolean);
  }, [hiddenKeys, allItemsMap]);

  return (
    <div className={`border-b ${t.border} ${t.dark ? "bg-[#1f1f1f]" : "bg-neutral-50"} text-right`}>
      {/* Dynamic Responsive Stats Grid */}
      <div className="flex flex-wrap divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse border-b divide-neutral-700/60 border-neutral-700/80">
        {visibleItems.map((item, idx) => {
          const isPinned = pinnedKeys.includes(item.key);
          const IconComponent = item.icon;

          return (
            <div
              key={item.key}
              className={`flex-1 min-w-[130px] sm:min-w-[150px] px-3 py-2 transition-colors ${
                t.dark ? "bg-[#232323] hover:bg-[#282828]" : "bg-white hover:bg-neutral-50"
              } ${isPinned ? "border-t-2 border-t-amber-500/80 bg-amber-500/[0.04]" : ""}`}
            >
              {/* Top row: Label + Action Icons (Pin & Trash) */}
              <div className={`mb-1 flex items-center justify-between gap-1 text-[11px] ${t.sub}`}>
                <div className="flex items-center gap-1 truncate max-w-[150px]" title={item.label}>
                  {item.hasCoin && (
                    <CircleDollarSign size={11} className="shrink-0 text-amber-400/80" />
                  )}
                  {IconComponent && (
                    <IconComponent size={11} className="shrink-0 text-purple-400/80" />
                  )}
                  <span className="truncate font-medium">{item.label}</span>
                </div>

                {/* Pin & Delete Action Buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePinToggle(item.key);
                    }}
                    title={
                      isPinned
                        ? "پین شده (کلیک برای انتقال به اول / لغو)"
                        : "پین کردن به اول لیست (سمت راست)"
                    }
                    className={`rounded p-0.5 transition active:scale-90 ${
                      isPinned
                        ? "text-amber-400 bg-amber-500/20 -rotate-45"
                        : "text-neutral-500 hover:text-amber-300 hover:bg-neutral-700/60"
                    }`}
                  >
                    <Pin size={11} className={isPinned ? "fill-amber-400" : ""} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.key);
                    }}
                    title="حذف و مخفی کردن این آیتم"
                    className="rounded p-0.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-90"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {/* Bottom row: Value */}
              <div className="flex items-center gap-1.5 truncate text-[12px]">
                {item.isLink ? (
                  <div className="flex items-center gap-1 font-bold text-sky-400">
                    <Tablet size={12} className="shrink-0 text-sky-400" />
                    <span className="font-mono cursor-pointer hover:underline">{item.val}</span>
                  </div>
                ) : (
                  <span className={`font-semibold ${t.text} truncate`} title={item.val}>
                    {item.val}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center "مشاهده بیشتر" toggle */}
      <div className="flex items-center justify-center py-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 text-[11.5px] ${t.sub} hover:text-purple-400 transition cursor-pointer`}
        >
          {expanded ? (
            <>
              <ChevronUp size={13} />
              <span>بستن تنظیمات و جزئیات</span>
            </>
          ) : (
            <>
              <ChevronDown size={13} />
              <span>مشاهده بیشتر و مدیریت نمایش آیتم‌ها</span>
            </>
          )}
        </button>
      </div>

      {/* Expanded Details & Management Drawer */}
      {expanded && (
        <div
          className={`space-y-3 px-4 py-3 text-[12px] border-t ${t.border} ${
            t.dark ? "bg-[#181818]" : "bg-neutral-100"
          }`}
        >
          {/* Quick info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-1.5">
              <Building2 size={13} className="text-purple-400 shrink-0" />
              <span className={t.sub}>ساختمان:</span>
              <span className={`font-semibold ${t.text}`}>{buildingName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User size={13} className="text-emerald-400 shrink-0" />
              <span className={t.sub}>مسئول هماهنگی:</span>
              <span className={`font-semibold ${t.text}`}>{managerName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone size={13} className="text-blue-400 shrink-0" />
              <span className={t.sub}>تلفن همراه:</span>
              <span className="font-mono text-neutral-300">{phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-amber-400 shrink-0" />
              <span className={t.sub}>منطقه:</span>
              <span className={t.text}>{zone}</span>
            </div>
          </div>

          {/* Ribbon Customization controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-700/60 text-[11.5px]">
            {/* Deleted / Hidden Items to restore */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-neutral-400">آیتم‌های مخفی‌شده:</span>
              {deletedItems.length === 0 ? (
                <span className="text-neutral-500 text-[11px]">هیچ آیتمی حذف نشده است.</span>
              ) : (
                deletedItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleRestoreItem(item.key)}
                    className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-neutral-300 hover:border-purple-500 hover:text-white transition"
                    title="کلیک برای بازگردانی به نوار بالا"
                  >
                    <Plus size={10} className="text-emerald-400" />
                    <span>{item.label}</span>
                  </button>
                ))
              )}
            </div>

            {/* Reset Defaults button */}
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-800/80 px-2.5 py-1 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
            >
              <RotateCcw size={11} className="text-amber-400" />
              <span>بازنشانی چیدمان به پیش‌فرض</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

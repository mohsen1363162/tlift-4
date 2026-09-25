import { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronsUpDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  RefreshCcw,
  FileSignature,
  SquareArrowOutUpRight,
  Sheet,
  Wrench,
  AlertTriangle,
  Pin,
  PinOff,
  CalendarCheck,
} from "lucide-react";
import type { Theme } from "./theme";
import { Contract } from "./data";
import TableToolbar from "./components/TableToolbar";
import ColumnSettingsDrawer, { ColumnDef } from "./components/ColumnSettingsDrawer";
import ContractsFilterDrawer, {
  ContractFilterState,
  defaultContractFilters,
} from "./components/ContractsFilterDrawer";
import PrintTableModal from "./components/PrintTableModal";
import { exportToExcel } from "./utils/exportUtils";
import { appStore } from "./store";
import { getContractServiceDay } from "./utils/serviceScheduleDays";
import { getContractOfficialFee } from "./data/contractServiceFees";

const fa = (n: string | number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

export const getContractPlannedDay = (c: Contract): number => {
  if (typeof (c as unknown as { serviceDay?: number }).serviceDay === "number" && (c as unknown as { serviceDay?: number }).serviceDay! > 0) {
    return (c as unknown as { serviceDay?: number }).serviceDay!;
  }
  return getContractServiceDay(c.no);
};

export const formatContractServiceDay = (c: Contract): string => {
  const day = getContractPlannedDay(c);
  return `${fa(day)} هر ماه`;
};

export const getContractAmount = (c: Contract): number => {
  const officialFee = getContractOfficialFee(c.no);
  if (typeof officialFee === "number") {
    return officialFee;
  }
  if (typeof c.monthlyServiceFee === "number" && c.monthlyServiceFee > 0) {
    return c.monthlyServiceFee;
  }
  const details = appStore.getContractDetails(c.id);
  const firstMonthWithAmount = details?.months?.find((m) => m.amount > 0);
  if (firstMonthWithAmount) return firstMonthWithAmount.amount;
  return c.monthlyServiceFee || 0;
};

export const formatContractAmount = (c: Contract): string => {
  const amt = getContractAmount(c);
  if (!amt || amt === 0) return "۰ ریال";
  return `${fa(amt.toLocaleString("en-US"))} ریال`;
};

const INITIAL_COLUMNS: ColumnDef[] = [
  { key: "no", title: "شماره قرارداد", visible: true },
  { key: "customer", title: "مشتری", visible: false },
  { key: "isLegal", title: "حقوقی", visible: false },
  { key: "phone", title: "شماره تماس", visible: false },
  { key: "buildingCode", title: "شماره اشتراک ساختمان", visible: false },
  { key: "building", title: "نام ساختمان", visible: true },
  { key: "serviceDay", title: "تاریخ سرویس در ماه", visible: true },
  { key: "amount", title: "مبلغ قرارداد", visible: true },
  { key: "manager", title: "نام مسئول هماهنگی", visible: false },
  { key: "managerPhone", title: "شماره همراه مسئول هماهنگی", visible: false },
  { key: "locationStatus", title: "وضعیت موقعیت مکانی", visible: false },
  { key: "zone", title: "منطقه", visible: true },
  { key: "address", title: "آدرس", visible: true },
  { key: "signDate", title: "تاریخ عقد قرارداد", visible: false },
  { key: "start", title: "تاریخ شروع", visible: false },
  { key: "end", title: "تاریخ پایان", visible: false },
  { key: "terminated", title: "فسخ شده", visible: false },
  { key: "terminateDate", title: "تاریخ فسخ", visible: false },
];

export default function ContractsPage({
  t,
  contracts,
  onNewContract,
  onOpenContract,
  onOpenCsvUpload,
}: {
  t: Theme;
  contracts: Contract[];
  onNewContract: (kind: string) => void;
  onOpenContract?: (c: Contract, subView?: "overview" | "payments" | "breakdowns" | "services") => void;
  onOpenCsvUpload?: () => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [menu, setMenu] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Drawers & Modals
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Persistent column settings
  const COLUMNS_KEY = "tlift_contracts_columns_v3";
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    try {
      const raw = localStorage.getItem(COLUMNS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ColumnDef[];
        return INITIAL_COLUMNS.map((initCol) => {
          const found = saved.find((s) => s.key === initCol.key);
          return found ? { ...initCol, visible: found.visible } : initCol;
        });
      }
    } catch {
      /* fallback */
    }
    return INITIAL_COLUMNS;
  });

  const [filters, setFilters] = useState<ContractFilterState>(defaultContractFilters);

  // Sorting
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colKey);
      setSortAsc(true);
    }
  };

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  // ---- Pinned contracts (persisted in localStorage) ----
  const PIN_KEY = "tlift_pinned_contracts_v1";
  const [pinned, setPinned] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(PIN_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });
  const [onlyPinned, setOnlyPinned] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, JSON.stringify(pinned));
    } catch {
      /* ignore */
    }
  }, [pinned]);
  const isPinned = (id: number) => pinned.includes(id);
  const togglePin = (c: Contract) => {
    setPinned((prev) => {
      const on = prev.includes(c.id);
      notify(on ? `پین قرارداد ${c.no} برداشته شد` : `قرارداد ${c.no} در بالای جدول پین شد`);
      return on ? prev.filter((x) => x !== c.id) : [c.id, ...prev];
    });
  };

  const handleToggleColumn = (key: string) => {
    setColumns((prev) => {
      const updated = prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c));
      try {
        localStorage.setItem(COLUMNS_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  };

  const filteredList = useMemo(() => {
    const list = contracts.filter((c) => {
      if (onlyPinned && !pinned.includes(c.id)) return false;
      // 1. Text search
      if (q.trim()) {
        const query = q.toLowerCase();
        const matchSearch =
          c.building.toLowerCase().includes(query) ||
          c.no.includes(query) ||
          (c.manager && c.manager.toLowerCase().includes(query)) ||
          (c.zone && c.zone.toLowerCase().includes(query)) ||
          (c.phone && c.phone.includes(query)) ||
          (c.address && c.address.toLowerCase().includes(query)) ||
          (c.coordinator && c.coordinator.toLowerCase().includes(query));
        if (!matchSearch) return false;
      }

      // 2. Status filter
      if (filters.status === "active") {
        // active contracts
      } else if (filters.status === "archived") {
        // archived contracts
      } else if (filters.status === "terminated") {
        // terminated
      } else if (filters.status === "expiring") {
        // expiring
      } else if (filters.status === "renewing") {
        // renewing
      }

      return true;
    });

    const result = [...list];
    if (sortCol) {
      result.sort((a, b) => {
        let valA: any = "";
        let valB: any = "";
        if (sortCol === "serviceDay") {
          valA = getContractPlannedDay(a);
          valB = getContractPlannedDay(b);
        } else if (sortCol === "amount") {
          valA = getContractAmount(a);
          valB = getContractAmount(b);
        } else if (sortCol === "no") {
          valA = parseInt(a.no.replace(/\D/g, ""), 10) || 0;
          valB = parseInt(b.no.replace(/\D/g, ""), 10) || 0;
        } else if (sortCol === "building") {
          return sortAsc
            ? a.building.localeCompare(b.building, "fa")
            : b.building.localeCompare(a.building, "fa");
        } else {
          valA = (a as any)[sortCol] || "";
          valB = (b as any)[sortCol] || "";
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    // pinned contracts float to the top (keeping pin order)
    const rank = (c: Contract) => {
      const i = pinned.indexOf(c.id);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return result.sort((a, b) => rank(a) - rank(b));
  }, [contracts, q, filters, pinned, onlyPinned, sortCol, sortAsc]);

  const effectivePageSize = pageSize === -1 ? (filteredList.length || 1) : pageSize;
  const totalPages = Math.ceil(filteredList.length / effectivePageSize) || 1;
  const paginatedList =
    pageSize === -1
      ? filteredList
      : filteredList.slice((page - 1) * pageSize, page * pageSize);

  const handleExportExcel = () => {
    const visibleCols = columns.filter((c) => c.visible);
    exportToExcel(
      filteredList as unknown as Record<string, unknown>[],
      visibleCols.map((c) => ({
        key: c.key,
        title: c.title,
        render: (item: Record<string, unknown>) => {
          if (c.key === "serviceDay") return formatContractServiceDay(item as unknown as Contract);
          if (c.key === "amount") return formatContractAmount(item as unknown as Contract);
          if (c.key === "customer") return (item.manager as string) || (item.building as string);
          if (c.key === "isLegal") return "حقیقی";
          if (c.key === "buildingCode") return item.id;
          if (c.key === "managerPhone") return item.phone || "-";
          if (c.key === "locationStatus") return "ثبت شده";
          if (c.key === "signDate") return item.start;
          if (c.key === "terminated") return "خیر";
          if (c.key === "terminateDate") return "-";
          return item[c.key] || "";
        },
      })),
      "لیست_قراردادها"
    );
    notify("فایل اکسل قراردادها با موفقیت دانلود شد");
  };

  const handleRefresh = () => {
    notify("جدول قراردادها با موفقیت به‌روزرسانی شد");
  };

  const hasActiveFilters =
    filters.status !== "all" ||
    !!filters.terminateFrom ||
    !!filters.terminateTo ||
    filters.insuranceStatus !== "all" ||
    filters.certificateStatus !== "all";

  const chip = (label: string, n: number, color: string) => (
    <div className={`flex items-center gap-2 rounded px-2 py-1 text-[12px] ${t.text}`}>
      <span>{label}</span>
      <span className={`rounded px-1.5 text-[11px] text-white ${color}`}>{n}</span>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Top Table Toolbar with 5 Action Icons */}
      <TableToolbar
        searchQuery={q}
        onSearchChange={(val) => {
          setQ(val);
          setPage(1);
        }}
        searchPlaceholder="جستجو..."
        onOpenFilter={() => setIsFilterOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={handleRefresh}
        onPrint={() => setIsPrintModalOpen(true)}
        onExportExcel={handleExportExcel}
        hasActiveFilters={hasActiveFilters}
        t={t}
      >
        <button
          type="button"
          onClick={() => {
            setOnlyPinned((v) => !v);
            setPage(1);
          }}
          title="نمایش فقط قراردادهای پین‌شده"
          className={`flex items-center gap-1 rounded border px-3 py-1.5 text-[12.5px] transition ${
            onlyPinned
              ? "border-amber-400 bg-amber-500/20 text-amber-300"
              : `${t.border} ${t.hover} ${t.text}`
          }`}
        >
          <Pin size={14} className={onlyPinned ? "text-amber-300" : "text-amber-400"} />
          پین‌شده‌ها
          <span className="rounded bg-amber-600 px-1.5 text-[11px] text-white">{pinned.length}</span>
        </button>

        <div className="flex-1" />

        {onOpenCsvUpload && (
          <button
            type="button"
            onClick={onOpenCsvUpload}
            className="flex items-center gap-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-[12.5px] text-zinc-200 transition"
            title="آپلود و درون‌ریزی فایل‌های CSV"
          >
            <Sheet size={14} className="text-emerald-400" /> آپلود فایل CSV
          </button>
        )}

        {/* New Contract Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((m) => !m)}
            className="flex items-center gap-1 rounded bg-violet-600 px-3 py-1.5 text-[12.5px] text-white hover:bg-violet-700 shadow-sm transition"
          >
            <ChevronDown size={14} /> ثبت قرارداد
          </button>
          {menu && (
            <div
              className={`absolute left-0 z-40 mt-1 w-[200px] rounded border py-1 shadow-2xl ${t.border} ${
                t.dark ? "bg-[#232323]" : "bg-white"
              }`}
            >
              {["ثبت قرارداد سرویس و نگهداری", "ثبت قرارداد جنرال", "ثبت قرارداد متفرقه"].map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onNewContract(x);
                  }}
                  className={`block w-full px-3 py-2.5 text-right text-[12.5px] ${t.hover} ${t.text}`}
                >
                  {x}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status Badges */}
        {chip("در حال تمدید", 0, "bg-red-700")}
        {chip("پیش‌نویس", 0, "bg-neutral-600")}
        {chip("متفرقه", 0, "bg-amber-600")}
        {chip("جنرال", 0, "bg-sky-700")}
        {chip("فعال", contracts.length, "bg-green-700")}
      </TableToolbar>

      {/* Contracts Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1100px] text-[12.5px]">
          <thead className={`${t.head} ${t.sub}`}>
            <tr>
              <th className="w-8 px-2 py-2.5 text-center font-normal" title="پین">
                <Pin size={12} className="mx-auto opacity-60" />
              </th>
              <th className="w-12 whitespace-nowrap px-3 py-2.5 text-right font-normal">ردیف</th>
              {columns
                .filter((c) => c.visible)
                .map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-right font-normal hover:text-white transition"
                    title={`مرتب‌سازی بر اساس ${col.title}`}
                  >
                    <span className="flex items-center gap-1">
                      {col.title}
                      <ChevronsUpDown
                        size={11}
                        className={sortCol === col.key ? "text-violet-400 opacity-100" : "opacity-40"}
                      />
                    </span>
                  </th>
                ))}
              <th className="w-10 px-2" />
            </tr>
          </thead>
          <tbody className={t.text}>
            {paginatedList.map((c, i) => (
              <tr
                key={c.id}
                onClick={() => onOpenContract?.(c)}
                className={`cursor-pointer border-b ${t.border} ${t.row} ${
                  isPinned(c.id) ? "border-r-2 border-r-amber-400 bg-amber-500/5" : ""
                }`}
              >
                <td className="px-2 py-3 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(c);
                    }}
                    title={isPinned(c.id) ? "برداشتن پین" : "پین کردن در بالای جدول"}
                    className={`rounded p-1 transition ${t.hover} ${
                      isPinned(c.id) ? "text-amber-400" : `${t.sub} opacity-40 hover:opacity-100`
                    }`}
                  >
                    <Pin size={14} className={isPinned(c.id) ? "fill-amber-400" : ""} />
                  </button>
                </td>
                <td className="px-3 py-3">{(page - 1) * (pageSize === -1 ? 0 : pageSize) + i + 1}</td>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => {
                    if (col.key === "no") {
                      return (
                        <td key={col.key} className="px-3 py-3 font-mono font-bold text-violet-400">
                          {c.no}
                        </td>
                      );
                    }
                    if (col.key === "building") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-medium">
                          {c.building}
                        </td>
                      );
                    }
                    if (col.key === "serviceDay") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-medium">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-[11.5px] font-bold text-sky-400">
                            <CalendarCheck size={13} className="text-sky-400 shrink-0" />
                            <span>{formatContractServiceDay(c)}</span>
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "amount") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-mono text-[12px] font-bold text-emerald-400" dir="ltr">
                          {formatContractAmount(c)}
                        </td>
                      );
                    }
                    if (col.key === "zone") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[11px]">
                            {c.zone}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "address") {
                      return (
                        <td
                          key={col.key}
                          className="whitespace-nowrap px-3 py-3 max-w-[280px] truncate"
                          title={c.address || "قزوین"}
                        >
                          {c.address || "قزوین"}
                        </td>
                      );
                    }
                    if (col.key === "manager") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3">
                          {c.manager}
                        </td>
                      );
                    }
                    if (col.key === "phone") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-mono" dir="ltr">
                          {c.phone || "-"}
                        </td>
                      );
                    }
                    if (col.key === "customer") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3">
                          {c.manager || c.building}
                        </td>
                      );
                    }
                    if (col.key === "isLegal") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 text-center">
                          حقیقی
                        </td>
                      );
                    }
                    if (col.key === "buildingCode") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-mono text-center">
                          {c.id}
                        </td>
                      );
                    }
                    if (col.key === "managerPhone") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-mono" dir="ltr">
                          {c.phone || "-"}
                        </td>
                      );
                    }
                    if (col.key === "locationStatus") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 text-center text-[11px] text-emerald-400">
                          ثبت شده
                        </td>
                      );
                    }
                    if (col.key === "signDate") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-mono text-[11px]">
                          {c.start}
                        </td>
                      );
                    }
                    if (col.key === "start") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-mono text-[11px]">
                          {c.start}
                        </td>
                      );
                    }
                    if (col.key === "end") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 font-mono text-[11px]">
                          {c.end}
                        </td>
                      );
                    }
                    if (col.key === "terminated") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 text-center">
                          خیر
                        </td>
                      );
                    }
                    if (col.key === "terminateDate") {
                      return (
                        <td key={col.key} className="whitespace-nowrap px-3 py-3 text-center text-neutral-500">
                          -
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="whitespace-nowrap px-3 py-3">
                        {String((c as unknown as Record<string, unknown>)[col.key] || "-")}
                      </td>
                    );
                  })}

                <td className="px-2 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setRowMenu(rowMenu?.id === c.id ? null : { id: c.id, x: r.left, y: r.bottom });
                    }}
                    className={`rounded p-1 ${t.hover} ${t.sub}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </td>
              </tr>
            ))}

            {paginatedList.length === 0 && (
              <tr>
                <td
                  colSpan={columns.filter((c) => c.visible).length + 3}
                  className={`py-12 text-center ${t.sub}`}
                >
                  هیچ موردی پیدا نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className={`flex items-center justify-between border-t ${t.border} px-3 py-2 text-[12px] ${t.text}`}>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className={`rounded border px-2 py-1 outline-none text-xs ${t.border} ${t.input} ${t.sub}`}
          >
            <option value={20}>20 / صفحه</option>
            <option value={50}>50 / صفحه</option>
            <option value={100}>100 / صفحه</option>
            <option value={250}>250 / صفحه</option>
            <option value={500}>500 / صفحه</option>
            <option value={-1}>نمایش همه قراردادها</option>
          </select>
        </div>
        {pageSize !== -1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`p-1 rounded ${t.hover} disabled:opacity-30`}
            >
              <ChevronRight size={16} className={t.sub} />
            </button>
            <span className="px-2.5 py-0.5 rounded bg-violet-600 font-semibold text-center text-white text-xs">
              {page} از {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1 rounded ${t.hover} disabled:opacity-30`}
            >
              <ChevronLeft size={16} className={t.sub} />
            </button>
          </div>
        )}
        <span className={t.sub}>{filteredList.length.toLocaleString("fa-IR")} مورد پیدا شد</span>
      </div>

      {/* Row Actions Menu */}
      {rowMenu &&
        (() => {
          const c = contracts.find((x) => x.id === rowMenu.id)!;
          const items = [
            { label: "مشاهده ی قرارداد", icon: Eye, ext: true, run: () => onOpenContract?.(c) },
            {
              label: isPinned(c.id) ? "برداشتن پین قرارداد" : "پین کردن در بالای جدول",
              icon: isPinned(c.id) ? PinOff : Pin,
              ext: false,
              run: () => togglePin(c),
            },
            { label: "پرینت قرارداد", icon: Printer, ext: false, run: () => notify("پرینت قرارداد") },
            { label: "تمدید قرارداد", icon: RefreshCcw, ext: false, run: () => notify("تمدید قرارداد") },
            {
              label: "تمدید با امضای مشتری",
              icon: FileSignature,
              ext: false,
              run: () => notify("تمدید با امضای مشتری"),
            },
          ];
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
              <div
                style={{ top: rowMenu.y + 2, left: rowMenu.x }}
                className={`fixed z-50 w-[215px] rounded border py-1 shadow-2xl ${t.border} ${
                  t.dark ? "bg-[#232323]" : "bg-white"
                }`}
              >
                {items.map((a) => {
                  const I = a.icon;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => {
                        a.run();
                        setRowMenu(null);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-[12.5px] ${t.hover} ${t.text}`}
                    >
                      <span className="flex items-center gap-2">
                        <I size={14} className={t.sub} />
                        {a.label}
                      </span>
                      {a.ext && <SquareArrowOutUpRight size={13} className={t.sub} />}
                    </button>
                  );
                })}
              </div>
            </>
          );
        })()}

      {/* Drawers & Modals */}
      <ColumnSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        onSave={() => notify("تنظیمات ستون‌ها با موفقیت اعمال شد")}
        t={t}
      />

      <ContractsFilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        onApply={() => {
          setPage(1);
          notify(`فیلتر با موفقیت اعمال شد. ${filteredList.length.toLocaleString("fa-IR")} مورد یافت شد.`);
        }}
        onReset={() => {
          setFilters(defaultContractFilters);
          setPage(1);
          notify("فیلترها بازنشانی شدند");
        }}
        t={t}
      />

      <PrintTableModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="لیست قراردادهای سرویس و نگهداری آسانسور"
        data={filteredList as unknown as Record<string, unknown>[]}
        columns={columns
          .filter((c) => c.visible)
          .map((c) => ({
            key: c.key,
            title: c.title,
            render: (item: Record<string, unknown>) => {
              if (c.key === "serviceDay") return formatContractServiceDay(item as unknown as Contract);
              if (c.key === "amount") return formatContractAmount(item as unknown as Contract);
              if (c.key === "customer") return (item.manager as string) || (item.building as string);
              if (c.key === "isLegal") return "حقیقی";
              if (c.key === "buildingCode") return String(item.id);
              if (c.key === "managerPhone") return (item.phone as string) || "-";
              if (c.key === "locationStatus") return "ثبت شده";
              if (c.key === "signDate") return item.start as string;
              if (c.key === "terminated") return "خیر";
              if (c.key === "terminateDate") return "-";
              return (item[c.key] as string) || "-";
            },
          }))}
        t={t}
      />

      {toast && (
        <div className="absolute bottom-14 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-800 border border-neutral-700 px-4 py-2 text-[12.5px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

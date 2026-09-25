import { useMemo, useState } from "react";
import {
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Package,
} from "lucide-react";
import type { Theme } from "./theme";
import { Part, initialParts } from "./data";
import TableToolbar from "./components/TableToolbar";
import ColumnSettingsDrawer, { ColumnDef } from "./components/ColumnSettingsDrawer";
import PrintTableModal from "./components/PrintTableModal";
import { exportToExcel } from "./utils/exportUtils";

const PARTS_COLUMNS: ColumnDef[] = [
  { key: "code", title: "کد قطعه", visible: true },
  { key: "name", title: "نام قطعه", visible: true },
  { key: "category", title: "دسته‌بندی", visible: true },
  { key: "unit", title: "واحد", visible: true },
  { key: "stock", title: "موجودی", visible: true },
  { key: "price", title: "قیمت واحد (تومان)", visible: true },
];

export default function PartsPage({ t }: { t: Theme }) {
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [q, setQ] = useState("");
  const [cat] = useState("all");
  const [rowMenu, setRowMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Drawers and print
  const [columns, setColumns] = useState<ColumnDef[]>(PARTS_COLUMNS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const handleToggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const list = useMemo(() => {
    let l = parts;
    if (cat !== "all") l = l.filter((p) => p.category === cat);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter((p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s));
    }
    return l;
  }, [parts, cat, q]);

  const handleExportExcel = () => {
    exportToExcel(
      list as unknown as Record<string, unknown>[],
      columns
        .filter((c) => c.visible)
        .map((c) => ({
          key: c.key,
          title: c.title,
          render: (item: Record<string, unknown>) => {
            if (c.key === "price") return ((item.price as number) || 0).toLocaleString("fa-IR");
            if (c.key === "stock") return ((item.stock as number) || 0).toLocaleString("fa-IR");
            return item[c.key] ?? "";
          },
        })),
      "لیست_قطعات_انبار"
    );
    notify("فایل اکسل قطعات با موفقیت دانلود شد");
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* 5-button Toolbar */}
      <TableToolbar
        searchQuery={q}
        onSearchChange={setQ}
        searchPlaceholder="جستجو در انبار قطعات و تجهیزات..."
        onOpenFilter={() => notify("فیلتر دسته‌بندی از نوار بالا در دسترس است")}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={() => notify("موجودی انبار قطعات به‌روز شد")}
        onPrint={() => setIsPrintModalOpen(true)}
        onExportExcel={handleExportExcel}
        hasActiveFilters={cat !== "all"}
        t={t}
      >
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => notify("فرم ثبت قطعه جدید باز شد")}
          className="flex items-center gap-1 rounded bg-violet-600 px-3 py-1.5 text-[12.5px] text-white hover:bg-violet-700 shadow-sm transition"
        >
          <Package size={14} /> تعریف قطعه جدید
        </button>
      </TableToolbar>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className={`${t.head} ${t.sub}`}>
            <tr>
              <th className="w-12 px-3 py-2.5 text-right font-normal">ردیف</th>
              {columns
                .filter((c) => c.visible)
                .map((col) => (
                  <th key={col.key} className="px-3 py-2.5 text-right font-normal">
                    {col.title}
                  </th>
                ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className={t.text}>
            {list.map((p, i) => (
              <tr key={p.id} className={`border-b ${t.border} ${t.row}`}>
                <td className="px-3 py-3 font-mono text-zinc-400">{i + 1}</td>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => {
                    if (col.key === "code") {
                      return <td key={col.key} className="px-3 py-3 font-mono text-violet-400">{p.code}</td>;
                    }
                    if (col.key === "name") {
                      return <td key={col.key} className="px-3 py-3 font-medium">{p.name}</td>;
                    }
                    if (col.key === "category") {
                      return (
                        <td key={col.key} className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px]">
                            {p.category}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "unit") {
                      return <td key={col.key} className="px-3 py-3">{p.unit}</td>;
                    }
                    if (col.key === "stock") {
                      return (
                        <td key={col.key} className="px-3 py-3 font-mono font-semibold">
                          <span className={p.stock <= 5 ? "text-red-400" : "text-emerald-400"}>
                            {p.stock.toLocaleString("fa-IR")}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "price") {
                      return (
                        <td key={col.key} className="px-3 py-3 font-mono">
                          {p.price.toLocaleString("fa-IR")}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="px-3 py-3">
                        {String((p as unknown as Record<string, unknown>)[col.key] || "-")}
                      </td>
                    );
                  })}
                <td className="px-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setRowMenu(rowMenu?.id === p.id ? null : { id: p.id, x: r.left, y: r.bottom });
                    }}
                    className={`rounded p-1 ${t.hover} ${t.sub}`}
                  >
                    <MoreVertical size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={columns.filter((c) => c.visible).length + 2} className={`py-10 text-center ${t.sub}`}>
                  موردی یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between border-t ${t.border} px-3 py-2 text-[12px] ${t.text}`}>
        <div className={`flex items-center gap-1 rounded border px-2 py-1 ${t.border} ${t.sub}`}>
          <ChevronDown size={13} /> <span>20 / صفحه</span>
        </div>
        <div className="flex items-center gap-1">
          <ChevronRight size={15} className={t.sub} />
          <span className="h-6 w-6 rounded bg-violet-600 text-center leading-6 text-white font-semibold text-xs">1</span>
          <ChevronLeft size={15} className={t.sub} />
        </div>
        <span className={t.sub}>{list.length.toLocaleString("fa-IR")} مورد پیدا شد</span>
      </div>

      {/* Drawers & Modals */}
      <ColumnSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        onSave={() => notify("تنظیمات ستون‌ها اعمال شد")}
        t={t}
      />

      <PrintTableModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="لیست موجودی انبار قطعات و تجهیزات آسانسور"
        data={list as unknown as Record<string, unknown>[]}
        columns={columns
          .filter((c) => c.visible)
          .map((c) => ({
            key: c.key,
            title: c.title,
            render: (item: Record<string, unknown>) => {
              if (c.key === "price") return ((item.price as number) || 0).toLocaleString("fa-IR") + " تومان";
              if (c.key === "stock") return ((item.stock as number) || 0).toLocaleString("fa-IR");
              return (item[c.key] as string) ?? "-";
            },
          }))}
        t={t}
      />

      {rowMenu &&
        (() => {
          const p = parts.find((x) => x.id === rowMenu.id)!;
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
              <div
                style={{ top: rowMenu.y + 2, left: rowMenu.x }}
                className={`fixed z-50 w-[160px] rounded border py-1 shadow-2xl ${t.border} ${
                  t.dark ? "bg-[#232323]" : "bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setRowMenu(null);
                    notify("ویرایش قطعه");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-[12.5px] ${t.hover} ${t.text}`}
                >
                  <Pencil size={14} className={t.sub} /> ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParts(parts.filter((x) => x.id !== p.id));
                    setRowMenu(null);
                    notify("قطعه حذف شد");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-red-400 ${t.hover}`}
                >
                  <Trash2 size={14} /> حذف
                </button>
              </div>
            </>
          );
        })()}

      {toast && (
        <div className="absolute bottom-14 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-800 border border-neutral-700 px-4 py-2 text-[12.5px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

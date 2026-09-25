import { useMemo, useState } from "react";
import {
  Check,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Ban,
  Phone,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import type { Theme } from "./theme";
import { Staff } from "./data";
import { Field, inputCls, DatePicker } from "./ui";
import { useStaff, appStore } from "./store";
import TableToolbar from "./components/TableToolbar";
import ColumnSettingsDrawer, { ColumnDef } from "./components/ColumnSettingsDrawer";
import PrintTableModal from "./components/PrintTableModal";
import { exportToExcel } from "./utils/exportUtils";

const COLORS = [
  "#f8a3a3",
  "#1f9d3a",
  "#8a6a10",
  "#4bb3d4",
  "#e0cdbd",
  "#a78bfa",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#64748b",
];

const STAFF_COLUMNS: ColumnDef[] = [
  { key: "username", title: "نام کاربری", visible: true },
  { key: "first", title: "نام", visible: true },
  { key: "last", title: "نام خانوادگی", visible: true },
  { key: "activity", title: "فعالیت", visible: true },
  { key: "birth", title: "تاریخ تولد", visible: true },
  { key: "phone", title: "شماره تماس", visible: true },
  { key: "androidAccess", title: "ورود به اپلیکیشن اندروید", visible: true },
  { key: "color", title: "رنگ", visible: true },
  { key: "active", title: "فعال", visible: true },
];

export default function StaffPage({ t }: { t: Theme }) {
  const staff = useStaff();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"active" | "inactive" | "all">("active");
  const [rowMenu, setRowMenu] = useState<{ id: number; x: number; y: number } | null>(null);
  const [edit, setEdit] = useState<Staff | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Drawers and print
  const [columns, setColumns] = useState<ColumnDef[]>(STAFF_COLUMNS);
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
    let l = staff;
    if (tab === "active") l = l.filter((s) => s.active);
    if (tab === "inactive") l = l.filter((s) => !s.active);
    if (q.trim().length >= 2) l = l.filter((s) => (s.first + " " + s.last + s.phone).includes(q.trim()));
    return l;
  }, [staff, tab, q]);

  const handleExportExcel = () => {
    exportToExcel(
      list as unknown as Record<string, unknown>[],
      columns
        .filter((c) => c.visible)
        .map((c) => ({
          key: c.key,
          title: c.title,
          render: (item: Record<string, unknown>) => {
            if (c.key === "active") return item.active ? "فعال" : "غیرفعال";
            return item[c.key] ?? "";
          },
        })),
      "لیست_سرویسکاران"
    );
    notify("فایل اکسل سرویسکاران با موفقیت دانلود شد");
  };

  const chip = (key: typeof tab, label: string, n: number, color: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setTab(key)}
      className={`flex items-center gap-2 rounded px-2 py-1 text-[12px] ${t.text} ${
        tab === key ? "ring-1 ring-violet-400 font-semibold" : ""
      } ${t.hover}`}
    >
      <span>{label}</span>
      <span className={`rounded px-1.5 text-[11px] text-white ${color}`}>{n}</span>
    </button>
  );

  const blank: Staff = {
    id: 0,
    username: "",
    first: "",
    last: "",
    activity: "",
    birth: "",
    phone: "",
    color: COLORS[0],
    active: true,
    service: true,
    install: false,
    avatar: "https://i.pravatar.cc/120?img=5",
  };

  const save = (s: Staff) => {
    if (!s.first || !s.last || !s.phone) {
      notify("نام، نام خانوادگی و تلفن همراه الزامی است");
      return;
    }
    if (s.id === 0) {
      appStore.addStaff({ ...s, username: s.phone });
    } else {
      appStore.updateStaff(s);
    }
    setEdit(null);
    notify("اطلاعات ذخیره شد");
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* 5-button Toolbar */}
      <TableToolbar
        searchQuery={q}
        onSearchChange={setQ}
        searchPlaceholder="جستجو خودکار با بیش از 2 کاراکتر"
        onOpenFilter={() => notify("فیلترهای فعال/غیرفعال از نوار بالا در دسترس است")}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={() => notify("لیست سرویسکاران به‌روزرسانی شد")}
        onPrint={() => setIsPrintModalOpen(true)}
        onExportExcel={handleExportExcel}
        hasActiveFilters={tab !== "all"}
        t={t}
      >
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setEdit(blank)}
          className="rounded bg-violet-600 px-4 py-1.5 text-[12.5px] text-white hover:bg-violet-700 shadow-sm transition"
        >
          افزودن
        </button>
        {chip("all", "همه", staff.length, "bg-neutral-600")}
        {chip("inactive", "غیرفعال", staff.filter((s) => !s.active).length, "bg-red-600")}
        {chip("active", "فعال", staff.filter((s) => s.active).length, "bg-green-700")}
      </TableToolbar>

      {/* پیام راهنمای امنیتی دسترسی به نسخه اندروید */}
      <div
        className={`mx-3 my-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
          t.dark
            ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
          <span>
            <strong>کنترل امنیتی نسخه اندروید (تلیفت همراه):</strong> فقط شماره‌هایی که در این صفحه ثبت و وضعیت آن‌ها <strong>«فعال»</strong> باشد مجاز به نصب و ورود به اپلیکیشن اندروید تکنسین‌ها هستند. مشتریان منحصراً به پرتال اختصاصی مشتریان هدایت می‌شوند.
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className={`${t.head} ${t.sub}`}>
            <tr>
              <th className="w-12 px-3 py-2.5 text-right font-normal">ردیف</th>
              <th className="w-12 px-3 py-2.5 text-right font-normal">پروفایل</th>
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
            {list.map((s, i) => (
              <tr
                key={s.id}
                onClick={() => setEdit(s)}
                className={`cursor-pointer border-b ${t.border} ${t.row}`}
              >
                <td className="px-3 py-2.5 font-mono text-neutral-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <img src={s.avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-neutral-700" />
                </td>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => {
                    if (col.key === "username") {
                      return <td key={col.key} className="px-3 py-2.5 font-mono text-violet-400">{s.username}</td>;
                    }
                    if (col.key === "first") {
                      return <td key={col.key} className="px-3 py-2.5 font-medium">{s.first}</td>;
                    }
                    if (col.key === "last") {
                      return <td key={col.key} className="px-3 py-2.5 font-medium">{s.last}</td>;
                    }
                    if (col.key === "activity") {
                      return <td key={col.key} className="px-3 py-2.5">{s.activity || "سرویس و نگهداری"}</td>;
                    }
                    if (col.key === "birth") {
                      return <td key={col.key} className="px-3 py-2.5 font-mono text-zinc-400">{s.birth || "-"}</td>;
                    }
                    if (col.key === "phone") {
                      return <td key={col.key} className="px-3 py-2.5 font-mono" dir="ltr">{s.phone}</td>;
                    }
                    if (col.key === "androidAccess") {
                      return (
                        <td key={col.key} className="px-3 py-2.5 text-center">
                          {s.active ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Smartphone size={12} />
                              مجاز (سرویس‌کار)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              مسدود
                            </span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === "color") {
                      return (
                        <td key={col.key} className="px-3 py-2.5">
                          {s.color ? (
                            <span className="block h-5 w-14 rounded border border-black/20 shadow-xs" style={{ background: s.color }} />
                          ) : (
                            <span className={t.sub}>…</span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === "active") {
                      return (
                        <td key={col.key} className="px-3 py-2.5 text-center">
                          {s.active && <Check size={15} className="text-green-500 mx-auto" />}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="px-3 py-2.5">
                        {String((s as unknown as Record<string, unknown>)[col.key] || "-")}
                      </td>
                    );
                  })}
                <td className="px-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setRowMenu(rowMenu?.id === s.id ? null : { id: s.id, x: r.left, y: r.bottom });
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
                <td colSpan={columns.filter((c) => c.visible).length + 3} className={`py-10 text-center ${t.sub}`}>
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
        title="لیست پرسنل، سرویسکاران و نصابان"
        data={list as unknown as Record<string, unknown>[]}
        columns={columns
          .filter((c) => c.visible && c.key !== "color")
          .map((c) => ({
            key: c.key,
            title: c.title,
            render: (item: Record<string, unknown>) => {
              if (c.key === "active") return item.active ? "فعال" : "غیرفعال";
              return (item[c.key] as string) ?? "-";
            },
          }))}
        t={t}
      />

      {rowMenu &&
        (() => {
          const s = staff.find((x) => x.id === rowMenu.id)!;
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
              <div
                style={{ top: rowMenu.y + 2, left: rowMenu.x }}
                className={`fixed z-50 w-[190px] rounded border py-1 shadow-2xl ${t.border} ${
                  t.dark ? "bg-[#232323]" : "bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEdit(s);
                    setRowMenu(null);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-[12.5px] ${t.hover} ${t.text}`}
                >
                  <Pencil size={14} className={t.sub} /> ویرایش
                </button>
                <button
                  type="button"
                  onClick={() => {
                    appStore.toggleStaffActive(s.id);
                    setRowMenu(null);
                    notify(s.active ? "سرویسکار غیرفعال شد" : "سرویسکار فعال شد");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-[12.5px] ${t.hover} ${t.text}`}
                >
                  <Ban size={14} className={t.sub} /> {s.active ? "غیرفعال کردن" : "فعال کردن"}
                </button>
              </div>
            </>
          );
        })()}

      {edit && <StaffModal t={t} staff={edit} onClose={() => setEdit(null)} onSave={save} />}

      {toast && (
        <div className="absolute bottom-14 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-800 border border-neutral-700 px-4 py-2 text-[12.5px] text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function StaffModal({
  t,
  staff,
  onClose,
  onSave,
}: {
  t: Theme;
  staff: Staff;
  onClose: () => void;
  onSave: (s: Staff) => void;
}) {
  const [s, setS] = useState<Staff>(staff);
  const [showAll, setShowAll] = useState(false);
  const set = (k: keyof Staff, v: string | boolean | number) => setS((x) => ({ ...x, [k]: v }));
  const isNew = s.id === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-[600px] rounded p-5 ${t.dark ? "bg-[#242424]" : "bg-white"} ${t.text}`}
      >
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className={`rounded p-1 ${t.hover} ${t.sub}`}>
            <X size={17} />
          </button>
          <span className="text-[14px]">{isNew ? "افزودن" : "ویرایش"}</span>
        </div>

        <div className="my-4 flex justify-center">
          <img src={s.avatar} alt="" className="h-[130px] w-[130px] rounded-full object-cover" />
        </div>

        <div className="mb-4 flex items-center justify-end gap-6 text-[12.5px]">
          <label className="flex items-center gap-2">
            <span>نصب و راه اندازی</span>
            <input
              type="checkbox"
              checked={s.install}
              onChange={(e) => set("install", e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
          </label>
          <label className="flex items-center gap-2">
            <span>سرویس و نگهداری</span>
            <input
              type="checkbox"
              checked={s.service}
              onChange={(e) => set("service", e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
          </label>
        </div>

        <Field label="تلفن همراه" req>
          <div className="relative">
            <Phone size={13} className={`absolute right-3 top-3 ${t.sub}`} />
            <input
              value={s.phone}
              readOnly={!isNew}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
              className={inputCls(t, `pr-8 ${isNew ? "" : "opacity-70"}`)}
            />
          </div>
          {!isNew && (
            <div className={`mt-1 text-[11px] ${t.sub}`}>
              امکان ویرایش شماره موبایل وجود ندارد،درصورت لزوم کاربر جدید ثبت کنید.
            </div>
          )}
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Smartphone size={12} />
            <span>این شماره شناسه ورود مجاز سرویس‌کار به اپلیکیشن اندروید (تلیفت همراه) خواهد بود.</span>
          </div>
        </Field>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="نام" req>
            <input value={s.first} onChange={(e) => set("first", e.target.value)} className={inputCls(t)} />
          </Field>
          <Field label="نام خانوادگی" req>
            <input value={s.last} onChange={(e) => set("last", e.target.value)} className={inputCls(t)} />
          </Field>
          <Field label="تاریخ تولد">
            <DatePicker t={t} value={s.birth} onChange={(v) => set("birth", v)} />
          </Field>
          <Field label="رنگ">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="h-9 flex-1 rounded" style={{ background: s.color || "#666" }} />
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={`h-5 w-5 rounded ${s.color === c ? "ring-2 ring-violet-400" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
        </div>

        <label className="mt-4 flex items-center justify-end gap-3 text-[12.5px]">
          <span>مشاهده همه ی خرابی های انجام نشده</span>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className={`relative h-5 w-10 rounded-full transition ${showAll ? "bg-violet-500" : "bg-neutral-600"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                showAll ? "left-0.5" : "right-0.5"
              }`}
            />
          </button>
        </label>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onSave(s)}
            className="rounded bg-violet-400 px-6 py-1.5 text-[12.5px] text-white hover:bg-violet-500"
          >
            ذخیره
          </button>
          <button
            type="button"
            onClick={() => set("avatar", "https://i.pravatar.cc/120?img=1")}
            className={`rounded border px-4 py-1.5 text-[12.5px] ${t.border} ${t.hover}`}
          >
            حذف تصویر کاربر
          </button>
        </div>
      </div>
    </div>
  );
}

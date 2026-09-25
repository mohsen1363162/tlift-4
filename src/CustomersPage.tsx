import { useMemo, useState } from "react";
import {
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Phone,
  HelpCircle,
  UserRound,
  Wallet,
  Paperclip,
  Lock,
  SquareArrowOutUpRight,
  Check,
  Sheet,
} from "lucide-react";
import type { Theme } from "./theme";
import { Customer, provinces, cities, Contract } from "./data";
import { useCustomers, appStore } from "./store";
import TableToolbar from "./components/TableToolbar";
import ColumnSettingsDrawer, { ColumnDef } from "./components/ColumnSettingsDrawer";
import PrintTableModal from "./components/PrintTableModal";
import { exportToExcel } from "./utils/exportUtils";

const PAGE = 12;

const CUSTOMER_COLUMNS: ColumnDef[] = [
  { key: "name", title: "نام مشتری", visible: true },
  { key: "isLegal", title: "نوع", visible: true },
  { key: "phone", title: "شماره تماس", visible: true },
  { key: "buildings", title: "ساختمان ها", visible: true },
  { key: "active", title: "فعال", visible: true },
  { key: "sms", title: "ارسال پیامک", visible: true },
];

export default function CustomersPage({
  t,
  onOpenTab,
  onOpenContract,
  onOpenCsvUpload,
}: {
  t: Theme;
  onOpenTab?: (title: string) => void;
  onOpenContract?: (c: Contract) => void;
  onOpenCsvUpload?: () => void;
}) {
  const customers = useCustomers();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<{ id: number; x: number; y: number } | null>(null);

  // Drawers and print
  const [columns, setColumns] = useState<ColumnDef[]>(CUSTOMER_COLUMNS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  };

  const rowActions = (c: Customer) => [
    {
      label: "مشاهده پرونده و قرارداد",
      icon: SquareArrowOutUpRight,
      ext: true,
      run: () => {
        const contract = appStore.getOrCreateContractForCustomer(c.name);
        onOpenContract?.(contract);
      },
    },
    {
      label: "پروفایل مشتری",
      icon: UserRound,
      ext: true,
      run: () => onOpenTab?.(`پروفایل مشتری - ${c.name.replace("* ", "")}`),
    },
    { label: "پرونده مالی مشتری", icon: Wallet, ext: true, run: () => onOpenTab?.("پرونده مالی مشتری") },
    { label: "آپلود و مشاهده فایل ها", icon: Paperclip, ext: false, run: () => notify("بخش فایل ها باز شد") },
    {
      label: c.active ? "غیرفعال کردن" : "فعال کردن",
      icon: Lock,
      ext: false,
      run: () => {
        appStore.toggleCustomerActive(c.id);
        notify(c.active ? "مشتری غیرفعال شد" : "مشتری فعال شد");
      },
    },
  ];

  const list = useMemo(() => {
    let l = customers;
    if (tab === "active") l = l.filter((c) => c.active);
    if (tab === "inactive") l = l.filter((c) => !c.active);
    if (q.trim().length >= 2) {
      const query = q.trim().toLowerCase();
      l = l.filter((c) => c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query)));
    }
    return l;
  }, [customers, tab, q]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice((page - 1) * PAGE, page * PAGE);

  const addCustomer = (c: Omit<Customer, "id">) => {
    appStore.addCustomer(c);
    setOpen(false);
    notify("مشتری با موفقیت ثبت و ذخیره شد");
  };

  const handleExportExcel = () => {
    exportToExcel(
      list as unknown as Record<string, unknown>[],
      columns
        .filter((c) => c.visible)
        .map((c) => ({
          key: c.key,
          title: c.title,
          render: (item: Record<string, unknown>) => {
            if (c.key === "isLegal") return item.isLegal ? "حقوقی" : "حقیقی";
            if (c.key === "active") return item.active ? "بله" : "خیر";
            if (c.key === "sms") return item.sms ? "بله" : "خیر";
            return item[c.key] ?? "";
          },
        })),
      "لیست_مشتریان"
    );
    notify("فایل اکسل مشتریان با موفقیت دریافت شد");
  };

  const chip = (key: typeof tab, label: string, count: number, color: string) => (
    <button
      key={key}
      type="button"
      onClick={() => {
        setTab(key);
        setPage(1);
      }}
      className={`flex items-center gap-2 rounded px-2 py-1 text-[12px] ${t.text} ${
        tab === key ? "ring-1 ring-violet-400 font-semibold" : ""
      } ${t.hover}`}
    >
      <span>{label}</span>
      <span className={`rounded px-1.5 text-[11px] text-white ${color}`}>{count}</span>
    </button>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* Table Toolbar with 5 Action Icons */}
      <TableToolbar
        searchQuery={q}
        onSearchChange={(val) => {
          setQ(val);
          setPage(1);
        }}
        searchPlaceholder="جستجو خودکار با نام یا تلفن..."
        onOpenFilter={() => notify("فیلترهای مشتریان فعال هستند")}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={() => notify("اطلاعات مشتریان با موفقیت به‌روزرسانی شد")}
        onPrint={() => setIsPrintModalOpen(true)}
        onExportExcel={handleExportExcel}
        hasActiveFilters={tab !== "all"}
        t={t}
      >
        <div className="flex-1" />

        {onOpenCsvUpload && (
          <button
            type="button"
            onClick={onOpenCsvUpload}
            className="flex items-center gap-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-[12.5px] text-sky-300 transition"
            title="آپلود و ذخیره‌سازی فایل‌های CSV مشتریان"
          >
            <Sheet size={14} className="text-sky-400" />
            <span>آپلود فایل CSV مشتریان</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded bg-violet-600 px-3.5 py-1.5 text-[12.5px] text-white hover:bg-violet-700 shadow-sm transition"
        >
          اضافه کردن مشتری
        </button>

        {chip("all", "همه", customers.length, "bg-neutral-600")}
        {chip("inactive", "غیرفعال", customers.filter((c) => !c.active).length, "bg-red-600")}
        {chip("active", "فعال", customers.filter((c) => c.active).length, "bg-green-700")}
      </TableToolbar>

      {/* Customers Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-[12.5px]">
          <thead className={`${t.head} ${t.sub}`}>
            <tr>
              <th className="w-12 px-3 py-2.5 text-right font-normal">ردیف</th>
              {columns
                .filter((c) => c.visible)
                .map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 font-normal ${
                      col.key === "name" ? "text-right" : "text-center"
                    }`}
                  >
                    {col.title}
                  </th>
                ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className={t.text}>
            {shown.map((c, i) => (
              <tr key={c.id} className={`border-b ${t.border} ${t.row}`}>
                <td className="px-3 py-3 font-mono text-zinc-400">{(page - 1) * PAGE + i + 1}</td>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => {
                    if (col.key === "name") {
                      return (
                        <td
                          key={col.key}
                          className="px-3 py-3 font-semibold cursor-pointer hover:text-violet-400 transition"
                          onClick={() => {
                            const contract = appStore.getOrCreateContractForCustomer(c.name);
                            onOpenContract?.(contract);
                          }}
                          title="کلیک برای باز کردن پرونده قرارداد"
                        >
                          {c.name}
                        </td>
                      );
                    }
                    if (col.key === "isLegal") {
                      return (
                        <td key={col.key} className="px-3 py-3 text-center">
                          {c.isLegal ? (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
                              حقوقی
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-zinc-700/60 text-zinc-300 text-[11px]">
                              حقیقی
                            </span>
                          )}
                        </td>
                      );
                    }
                    if (col.key === "phone") {
                      return (
                        <td key={col.key} className="px-3 py-3 text-center font-mono text-zinc-300" dir="ltr">
                          {c.phone || "—"}
                        </td>
                      );
                    }
                    if (col.key === "buildings") {
                      return <td key={col.key} className="px-3 py-3 text-center">{c.buildings}</td>;
                    }
                    if (col.key === "active") {
                      return (
                        <td key={col.key} className="px-3 py-3 text-center">
                          {c.active && <Check size={15} className="mx-auto text-green-500" />}
                        </td>
                      );
                    }
                    if (col.key === "sms") {
                      return (
                        <td key={col.key} className="px-3 py-3 text-center">
                          {c.sms && <Check size={15} className="mx-auto text-green-500" />}
                        </td>
                      );
                    }
                    return (
                      <td key={col.key} className="px-3 py-3 text-center">
                        {String((c as unknown as Record<string, unknown>)[col.key] || "—")}
                      </td>
                    );
                  })}
                <td className="px-2 text-center">
                  <button
                    type="button"
                    onClick={(e) => {
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
            {shown.length === 0 && (
              <tr>
                <td colSpan={columns.filter((c) => c.visible).length + 2} className={`py-10 text-center ${t.sub}`}>
                  موردی یافت نشد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      <div className={`flex items-center justify-between border-t ${t.border} px-3 py-2 text-[12px] ${t.text}`}>
        <div className={`flex items-center gap-1 rounded border px-2 py-1 ${t.border} ${t.sub}`}>
          <ChevronDown size={13} /> <span>{PAGE} / صفحه</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`rounded p-1 ${t.hover} ${t.sub}`}
          >
            <ChevronRight size={15} />
          </button>
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i + 1)}
              className={`h-6 w-6 rounded text-[12px] ${
                page === i + 1 ? "bg-violet-600 text-white font-semibold" : `${t.hover} ${t.sub}`
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className={`rounded p-1 ${t.hover} ${t.sub}`}
          >
            <ChevronLeft size={15} />
          </button>
        </div>
        <span className={t.sub}>{list.length.toLocaleString("fa-IR")} مورد پیدا شد</span>
      </div>

      {/* Drawers & Modals */}
      <ColumnSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        onSave={() => notify("تنظیمات ستون‌های مشتریان اعمال شد")}
        t={t}
      />

      <PrintTableModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="لیست مشتریان و طرف‌های حساب"
        data={list as unknown as Record<string, unknown>[]}
        columns={columns
          .filter((c) => c.visible)
          .map((c) => ({
            key: c.key,
            title: c.title,
            align: c.key === "name" ? "right" : "center",
            render: (item: Record<string, unknown>) => {
              if (c.key === "isLegal") return item.isLegal ? "حقوقی" : "حقیقی";
              if (c.key === "active") return item.active ? "فعال" : "غیرفعال";
              if (c.key === "sms") return item.sms ? "بله" : "خیر";
              return (item[c.key] as string) ?? "-";
            },
          }))}
        t={t}
      />

      {toast && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded bg-neutral-800 border border-neutral-700 px-4 py-2 text-[12.5px] text-white shadow-xl">
          {toast}
        </div>
      )}

      {rowMenu &&
        (() => {
          const c = customers.find((x) => x.id === rowMenu.id);
          if (!c) return null;
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
              <div
                style={{ top: rowMenu.y + 2, left: rowMenu.x }}
                className={`fixed z-50 w-[210px] rounded border py-1 shadow-2xl ${t.border} ${
                  t.dark ? "bg-[#232323]" : "bg-white"
                }`}
              >
                {rowActions(c).map((a) => {
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

      {open && <AddCustomerModal t={t} onClose={() => setOpen(false)} onSubmit={addCustomer} />}
    </div>
  );
}

function AddCustomerModal({
  t,
  onClose,
  onSubmit,
}: {
  t: Theme;
  onClose: () => void;
  onSubmit: (c: Omit<Customer, "id">) => void;
}) {
  const [kind, setKind] = useState<"real" | "legal">("real");
  const [f, setF] = useState({
    mobile: "",
    mobile2: "",
    first: "",
    last: "",
    national: "",
    birth: "",
    province: "",
    city: "",
    gender: "",
    email: "",
    address: "",
  });
  const [sms, setSms] = useState(false);
  const [portal, setPortal] = useState(false);
  const [err, setErr] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const inputClsStr = `h-9 w-full rounded border px-3 text-[12.5px] outline-none focus:border-violet-500 ${t.input}`;
  const Label = ({ children, req }: { children: string; req?: boolean }) => (
    <label className={`mb-1 block text-[12.5px] ${t.text}`}>
      {req && <span className="text-red-500">* </span>}
      {children}
    </label>
  );

  const submit = () => {
    if (!f.mobile || (kind === "real" ? !f.first || !f.last : !f.first)) {
      setErr(true);
      return;
    }
    onSubmit({
      name: "* " + (kind === "real" ? `${f.first} ${f.last}` : f.first),
      buildings: 0,
      active: true,
      sms,
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`flex max-h-full w-full max-w-[950px] overflow-hidden rounded ${
          t.dark ? "bg-[#1a1a1a]" : "bg-white"
        } shadow-2xl`}
      >
        {/* side tabs (right) */}
        <div className={`order-1 w-[120px] shrink-0 border-e ${t.border} py-4`}>
          {(["real", "legal"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`block w-full px-4 py-3 text-right text-[13px] ${
                kind === k ? `border-e-2 border-violet-500 ${t.text}` : t.sub
              }`}
            >
              {k === "real" ? "حقیقی" : "حقوقی"}
            </button>
          ))}
        </div>

        <div className="order-2 flex min-w-0 flex-1 flex-col">
          <div className="flex items-center px-4 pt-3">
            <button type="button" onClick={onClose} className={`rounded p-1 ${t.hover} ${t.sub}`}>
              <X size={18} />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto px-6 pb-4 pt-2">
            <div>
              <Label req>شماره موبایل</Label>
              <div className="relative">
                <Phone size={14} className={`absolute right-3 top-2.5 ${t.sub}`} />
                <input value={f.mobile} onChange={(e) => set("mobile", e.target.value)} className={inputClsStr + " pr-8"} />
              </div>
            </div>
            <div>
              <Label>شماره موبایل 2</Label>
              <div className="relative">
                <Phone size={14} className={`absolute right-3 top-2.5 ${t.sub}`} />
                <input value={f.mobile2} onChange={(e) => set("mobile2", e.target.value)} className={inputClsStr + " pr-8"} />
              </div>
            </div>

            <div>
              <Label req>{kind === "real" ? "نام" : "نام شرکت"}</Label>
              <input value={f.first} onChange={(e) => set("first", e.target.value)} className={inputClsStr} />
            </div>
            <div>
              <Label req={kind === "real"}>{kind === "real" ? "نام خانوادگی" : "نام مدیرعامل"}</Label>
              <input value={f.last} onChange={(e) => set("last", e.target.value)} className={inputClsStr} />
            </div>

            <div>
              <Label>{kind === "real" ? "کد ملی" : "شناسه ملی"}</Label>
              <input value={f.national} onChange={(e) => set("national", e.target.value)} className={inputClsStr} />
            </div>
            <div>
              <Label>{kind === "real" ? "تاریخ تولد" : "تاریخ ثبت"}</Label>
              <input
                value={f.birth}
                onChange={(e) => set("birth", e.target.value)}
                placeholder="انتخاب تاریخ"
                className={inputClsStr}
              />
            </div>

            <div>
              <Label>استان</Label>
              <select
                value={f.province}
                onChange={(e) => {
                  set("province", e.target.value);
                  set("city", "");
                }}
                className={inputClsStr}
              >
                <option value=""></option>
                {provinces.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>شهر</Label>
              <select value={f.city} onChange={(e) => set("city", e.target.value)} className={inputClsStr}>
                <option value=""></option>
                {(cities[f.province] || []).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>جنسیت</Label>
              <select value={f.gender} onChange={(e) => set("gender", e.target.value)} className={inputClsStr}>
                <option value=""></option>
                <option>مرد</option>
                <option>زن</option>
              </select>
            </div>
            <div>
              <Label>ایمیل</Label>
              <input value={f.email} onChange={(e) => set("email", e.target.value)} className={inputClsStr} />
            </div>

            <div className="col-span-2">
              <Label>آدرس</Label>
              <input value={f.address} onChange={(e) => set("address", e.target.value)} className={inputClsStr} />
            </div>

            <div className={`col-span-2 flex items-center gap-2 border-t pt-3 text-[12.5px] ${t.border} ${t.sub}`}>
              <span>فیلد ها</span>
              <HelpCircle size={13} />
            </div>

            <div className={`col-span-2 rounded border ${t.border} p-3`}>
              <div className={`flex items-center justify-between text-[12.5px] ${t.text}`}>
                <ChevronDown size={15} />
                <span>دسترسی ها</span>
              </div>
              <label className={`mt-3 flex items-center justify-end gap-2 text-[12.5px] ${t.text}`}>
                ارسال پیامک
                <input
                  type="checkbox"
                  checked={sms}
                  onChange={(e) => setSms(e.target.checked)}
                  className="h-4 w-4 accent-violet-500"
                />
              </label>
              <label className={`mt-2 flex items-center justify-end gap-2 text-[12.5px] ${t.text}`}>
                استفاده از پورتال
                <input
                  type="checkbox"
                  checked={portal}
                  onChange={(e) => setPortal(e.target.checked)}
                  className="h-4 w-4 accent-violet-500"
                />
              </label>
            </div>

            {err && <div className="col-span-2 text-[12px] text-red-500">لطفاً فیلدهای ستاره‌دار را تکمیل کنید.</div>}
          </div>

          <div className={`flex items-center gap-2 border-t ${t.border} px-6 py-3`}>
            <button
              type="button"
              onClick={submit}
              className="rounded bg-violet-500 px-5 py-1.5 text-[12.5px] text-white hover:bg-violet-600"
            >
              ثبت
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded border px-5 py-1.5 text-[12.5px] ${t.border} ${t.text} ${t.hover}`}
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

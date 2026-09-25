import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  RotateCw,
  FileDown,
  MoreVertical,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Building2,
  ArrowUpRight,
  TrendingDown,
  Printer,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import { Theme } from "../theme";
import {
  ChecklistItem,
  useChecklist,
  useChecklistCategories,
  appStore,
} from "../store";

interface ChecklistSettingsPageProps {
  t: Theme;
  onShowToast: (msg: string) => void;
}

export default function ChecklistSettingsPage({
  t,
  onShowToast,
}: ChecklistSettingsPageProps) {
  const checklist = useChecklist();
  const categories = useChecklistCategories();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(20);

  // Active Row Menu
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ChecklistItem | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Form State for Add / Edit Modal (Matching sshot-15.png)
  const [formQuestion, setFormQuestion] = useState("");
  const [formCategory, setFormCategory] = useState("طبقات");
  const [formPeriod, setFormPeriod] = useState("ماهیانه");
  const [formDeviceType, setFormDeviceType] = useState("آسانسور");
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");

  // Filtered Checklist
  const filteredList = useMemo(() => {
    return checklist.filter((item) => {
      // Search with > 2 characters matching prompt
      if (search.trim().length >= 2) {
        const q = search.trim().toLowerCase();
        const matchQ = item.question.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchDev = item.deviceType.toLowerCase().includes(q);
        if (!matchQ && !matchCat && !matchDev) return false;
      }
      if (filterCategory !== "all" && item.category !== filterCategory) {
        return false;
      }
      if (filterDevice !== "all" && item.deviceType !== filterDevice) {
        return false;
      }
      return true;
    });
  }, [checklist, search, filterCategory, filterDevice]);

  // Paginated Slice
  const totalItems = filteredList.length;
  const effectivePageSize = pageSize === "all" ? totalItems || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validPage = Math.min(currentPage, totalPages);

  const displayedList = useMemo(() => {
    if (pageSize === "all") return filteredList;
    const start = (validPage - 1) * effectivePageSize;
    return filteredList.slice(start, start + effectivePageSize);
  }, [filteredList, validPage, effectivePageSize, pageSize]);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormQuestion("");
    setFormCategory(categories[0] || "طبقات");
    setFormPeriod("ماهیانه");
    setFormDeviceType("آسانسور");
    setIsAddingNewCat(false);
    setNewCatInput("");
    setShowAddModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormQuestion(item.question);
    setFormCategory(item.category);
    setFormPeriod(item.period);
    setFormDeviceType(item.deviceType);
    setIsAddingNewCat(false);
    setNewCatInput("");
    setActiveMenuId(null);
    setShowAddModal(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim()) {
      onShowToast("لطفاً عنوان سوال چک لیست را وارد نمایید");
      return;
    }

    let finalCategory = formCategory;
    if (isAddingNewCat && newCatInput.trim()) {
      finalCategory = newCatInput.trim();
      appStore.addChecklistCategory(finalCategory);
    }

    if (editingItem) {
      appStore.updateChecklistItem(editingItem.id, {
        question: formQuestion.trim(),
        category: finalCategory,
        period: formPeriod,
        deviceType: formDeviceType,
      });
      onShowToast("مورد چک لیست با موفقیت ویرایش شد");
    } else {
      appStore.addChecklistItem({
        question: formQuestion.trim(),
        category: finalCategory,
        period: formPeriod,
        deviceType: formDeviceType,
      });
      onShowToast("مورد جدید با موفقیت به چک لیست افزوده شد");
    }

    setShowAddModal(false);
    setEditingItem(null);
  };

  // Delete Action
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    appStore.deleteChecklistItem(deletingItem.id);
    onShowToast(`مورد ردیف ${deletingItem.rowNo} با موفقیت حذف گردید`);
    setDeletingItem(null);
    setActiveMenuId(null);
  };

  return (
    <div className={`flex h-full flex-col ${t.dark ? "bg-[#141414] text-neutral-200" : "bg-[#f8f9fa] text-neutral-800"}`}>
      {/* Top Action & Search Bar (matching sshot-11.png) */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 ${t.dark ? "border-[#262626] bg-[#1a1a1a]" : "border-neutral-200 bg-white"}`}>
        {/* Left tools in RTL (Search, filter, column settings, refresh, PDF) */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className={`flex h-8 w-64 items-center gap-2 rounded border px-2.5 text-xs transition-colors ${
            t.dark ? "border-[#333] bg-[#222] text-neutral-200 focus-within:border-purple-500" : "border-neutral-300 bg-white text-neutral-800 focus-within:border-purple-500"
          }`}>
            <Search size={13} className="text-neutral-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو خودکار با بیش از 2 کاراکتر"
              className="w-full bg-transparent text-[11.5px] outline-none placeholder:text-neutral-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            title="فیلترها"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              filterCategory !== "all" || filterDevice !== "all"
                ? "border-purple-500 bg-purple-500/10 text-purple-400"
                : t.dark ? "border-[#333] bg-[#222] text-neutral-400 hover:text-neutral-200" : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <Filter size={13} />
          </button>

          {/* Settings / Reset to default */}
          <button
            type="button"
            title="بازنشانی به ۳۸ مورد پیش‌فرض"
            onClick={() => {
              if (window.confirm("آیا می‌خواهید چک‌لیست به ۳۸ مورد پیش‌فرض بازگردانی شود؟")) {
                appStore.resetChecklistToDefault();
                onShowToast("چک‌لیست به ۳۸ مورد پیش‌فرض بازگردانی شد");
              }
            }}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              t.dark ? "border-[#333] bg-[#222] text-neutral-400 hover:text-neutral-200" : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <SlidersHorizontal size={13} />
          </button>

          {/* Refresh */}
          <button
            type="button"
            title="تازه‌سازی"
            onClick={() => {
              onShowToast("اطلاعات چک‌لیست به‌روزرسانی شد");
            }}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              t.dark ? "border-[#333] bg-[#222] text-neutral-400 hover:text-neutral-200" : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            <RotateCw size={13} />
          </button>

          {/* PDF Export / Print button */}
          <button
            type="button"
            title="چاپ و خروجی PDF چک لیست"
            onClick={() => setShowPrintModal(true)}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              t.dark ? "border-[#333] bg-[#222] text-neutral-400 hover:text-purple-400 hover:border-purple-500/50" : "border-neutral-300 bg-white text-neutral-600 hover:text-purple-600 hover:border-purple-400"
            }`}
          >
            <FileDown size={14} />
          </button>
        </div>

        {/* Right action button: افزودن مورد جدید (matching sshot-11.png) */}
        <div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#6d28d9] px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#5b21b6] active:scale-[0.98]"
          >
            <span>افزودن مورد جدید</span>
          </button>
        </div>
      </div>

      {/* Optional Filters Drawer */}
      {showFilterDrawer && (
        <div className={`flex flex-wrap items-center gap-4 border-b px-4 py-2.5 text-xs ${t.dark ? "border-[#262626] bg-[#1e1e1e]" : "border-neutral-200 bg-neutral-50"}`}>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">دسته‌بندی:</span>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className={`h-7 rounded border px-2 text-xs outline-none ${t.dark ? "border-[#333] bg-[#222] text-neutral-200" : "border-neutral-300 bg-white text-neutral-800"}`}
            >
              <option value="all">همه دسته‌ها ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400">نوع دستگاه:</span>
            <select
              value={filterDevice}
              onChange={(e) => {
                setFilterDevice(e.target.value);
                setCurrentPage(1);
              }}
              className={`h-7 rounded border px-2 text-xs outline-none ${t.dark ? "border-[#333] bg-[#222] text-neutral-200" : "border-neutral-300 bg-white text-neutral-800"}`}
            >
              <option value="all">همه دستگاه‌ها</option>
              <option value="آسانسور">آسانسور</option>
              <option value="پله برقی">پله برقی</option>
              <option value="رمپ">رمپ</option>
            </select>
          </div>

          {(filterCategory !== "all" || filterDevice !== "all") && (
            <button
              type="button"
              onClick={() => {
                setFilterCategory("all");
                setFilterDevice("all");
                setCurrentPage(1);
              }}
              className="text-[11px] text-purple-400 hover:underline"
            >
              پاک کردن فیلترها
            </button>
          )}
        </div>
      )}

      {/* Main Table Area (matching sshot-11.png, 12, 13, 14) */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className={`border-b text-center ${t.dark ? "border-[#282828] bg-[#1a1a1a] text-neutral-400" : "border-neutral-200 bg-neutral-100 text-neutral-600"}`}>
              <th className="w-12 py-2.5 px-2 font-normal text-center">عملیات</th>
              <th className="w-28 py-2.5 px-3 font-normal text-center">دوره ماهیانه</th>
              <th className="py-2.5 px-4 font-normal text-right">سوال</th>
              <th className="w-36 py-2.5 px-3 font-normal text-center">دسته بندی</th>
              <th className="w-28 py-2.5 px-3 font-normal text-center">نوع دستگاه</th>
              <th className="w-14 py-2.5 px-2 font-normal text-center">ردیف</th>
            </tr>
          </thead>
          <tbody>
            {displayedList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400">
                  هیچ موردی مطابق جستجو یافت نشد
                </td>
              </tr>
            ) : (
              displayedList.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b transition-colors hover:bg-white/[0.02] ${
                    t.dark ? "border-[#222]" : "border-neutral-100 hover:bg-neutral-50"
                  }`}
                >
                  {/* Action 3-dots on left */}
                  <td className="relative py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                      }}
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-500/10 hover:text-neutral-200"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {/* Popover Menu: ویرایش و حذف */}
                    {activeMenuId === item.id && (
                      <div
                        className={`absolute left-2 top-8 z-30 w-28 rounded-md border py-1 shadow-xl backdrop-blur-md ${
                          t.dark
                            ? "border-[#333] bg-[#222] text-neutral-200"
                            : "border-neutral-200 bg-white text-neutral-800"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-right text-xs hover:bg-purple-500/10 hover:text-purple-400"
                        >
                          <Edit2 size={12} />
                          <span>ویرایش</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingItem(item);
                            setActiveMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-right text-xs text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 size={12} />
                          <span>حذف</span>
                        </button>
                      </div>
                    )}
                  </td>

                  {/* دوره ماهیانه */}
                  <td className="py-2.5 px-3 text-center text-neutral-400 font-light text-[12px]">
                    {item.period}
                  </td>

                  {/* سوال */}
                  <td className={`py-2.5 px-4 text-right font-normal leading-relaxed ${t.dark ? "text-neutral-200" : "text-neutral-800"}`}>
                    {item.question}
                  </td>

                  {/* دسته بندی */}
                  <td className="py-2.5 px-3 text-center text-neutral-400 text-[12px]">
                    {item.category}
                  </td>

                  {/* نوع دستگاه */}
                  <td className="py-2.5 px-3 text-center text-neutral-400 text-[12px]">
                    {item.deviceType}
                  </td>

                  {/* ردیف */}
                  <td className="py-2.5 px-2 text-center text-neutral-400 font-mono text-[12px]">
                    {item.rowNo}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar with count and pagination (matching sshot-11.png) */}
      <div className={`flex flex-wrap items-center justify-between border-t px-4 py-2 text-xs ${t.dark ? "border-[#262626] bg-[#181818] text-neutral-400" : "border-neutral-200 bg-white text-neutral-600"}`}>
        {/* Right side in RTL: Page size selector */}
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              const v = e.target.value === "all" ? "all" : Number(e.target.value);
              setPageSize(v);
              setCurrentPage(1);
            }}
            className={`h-7 rounded border px-2 text-xs outline-none ${t.dark ? "border-[#333] bg-[#222] text-neutral-200" : "border-neutral-300 bg-white text-neutral-800"}`}
          >
            <option value={20}>20 / صفحه</option>
            <option value={38}>38 / صفحه (همه موارد)</option>
            <option value={50}>50 / صفحه</option>
            <option value="all">نمایش همه</option>
          </select>
        </div>

        {/* Center: Pagination numbers */}
        {pageSize !== "all" && totalPages > 1 && (
          <div className="flex items-center gap-1 font-mono">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={`h-6 w-6 rounded text-xs transition-colors ${
                  p === validPage
                    ? "bg-purple-600 font-semibold text-white"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        )}

        {/* Left: Total found count */}
        <div className="font-light">
          <span>{totalItems} مورد پیدا شد</span>
        </div>
      </div>

      {/* ADD / EDIT MODAL (Identical to sshot-15.png) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-[480px] rounded-2xl border p-6 shadow-2xl transition-all ${
              t.dark ? "border-[#333] bg-[#202020] text-neutral-100" : "border-neutral-200 bg-white text-neutral-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-purple-400">
                {editingItem ? "ویرایش مورد چک لیست" : "افزودن مورد جدید به چک لیست"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded p-1 text-neutral-400 hover:text-neutral-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Field 1: عنوان سوال */}
              <div>
                <label className="mb-1.5 block text-xs text-neutral-300">
                  <span className="text-rose-500 font-bold">* </span>
                  عنوان سوال
                </label>
                <input
                  type="text"
                  required
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="عنوان سوال بازرسی چک لیست..."
                  className={`w-full rounded-md border px-3 py-2 text-xs outline-none transition-colors ${
                    t.dark
                      ? "border-[#333] bg-[#181818] text-neutral-100 focus:border-purple-500"
                      : "border-neutral-300 bg-neutral-50 text-neutral-900 focus:border-purple-500"
                  }`}
                />
              </div>

              {/* Field 2: دسته بندی */}
              <div>
                <label className="mb-1.5 block text-xs text-neutral-300">
                  <span className="text-rose-500 font-bold">* </span>
                  دسته بندی
                </label>
                {!isAddingNewCat ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="افزودن دسته بندی جدید"
                      onClick={() => setIsAddingNewCat(true)}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        t.dark ? "border-[#333] bg-[#181818] text-neutral-300 hover:border-purple-500 hover:text-purple-400" : "border-neutral-300 bg-neutral-100 hover:bg-neutral-200"
                      }`}
                    >
                      <Plus size={15} />
                    </button>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className={`h-9 flex-1 rounded-md border px-3 text-xs outline-none transition-colors ${
                        t.dark
                          ? "border-[#333] bg-[#181818] text-neutral-100 focus:border-purple-500"
                          : "border-neutral-300 bg-neutral-50 text-neutral-900 focus:border-purple-500"
                      }`}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCat(false)}
                      className="rounded p-1.5 text-neutral-400 hover:text-neutral-200"
                    >
                      <X size={14} />
                    </button>
                    <input
                      type="text"
                      autoFocus
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      placeholder="نام دسته بندی جدید..."
                      className={`h-9 flex-1 rounded-md border px-3 text-xs outline-none ${
                        t.dark ? "border-[#333] bg-[#181818] text-neutral-100 focus:border-purple-500" : "border-neutral-300 bg-white"
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Field 3: زمانبندی */}
              <div>
                <label className="mb-1.5 block text-xs text-neutral-300">
                  <span className="text-rose-500 font-bold">* </span>
                  زمانبندی
                </label>
                <select
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  className={`h-9 w-full rounded-md border px-3 text-xs outline-none transition-colors ${
                    t.dark
                      ? "border-[#333] bg-[#181818] text-neutral-100 focus:border-purple-500"
                      : "border-neutral-300 bg-neutral-50 text-neutral-900 focus:border-purple-500"
                  }`}
                >
                  <option value="ماهیانه">ماهیانه</option>
                  <option value="هفتگی">هفتگی</option>
                  <option value="دو هفته یکبار">دو هفته یکبار</option>
                  <option value="دو ماه یکبار">دو ماه یکبار</option>
                  <option value="فصلی (سه ماهه)">فصلی (سه ماهه)</option>
                  <option value="شش ماه یکبار">شش ماه یکبار</option>
                  <option value="سالیانه">سالیانه</option>
                </select>
              </div>

              {/* Field 4: نوع وسیله (Matching sshot-15.png with 3 selectable cards) */}
              <div>
                <label className="mb-2 block text-xs text-neutral-300">
                  <span className="text-rose-500 font-bold">* </span>
                  نوع وسیله
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* آسانسور */}
                  <button
                    type="button"
                    onClick={() => setFormDeviceType("آسانسور")}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 transition-all ${
                      formDeviceType === "آسانسور"
                        ? "border-purple-500 bg-purple-500/10 text-purple-300 shadow-sm"
                        : t.dark
                        ? "border-[#333] bg-[#181818] text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <Building2 size={24} />
                    <span className="text-xs font-medium">آسانسور</span>
                  </button>

                  {/* پله برقی */}
                  <button
                    type="button"
                    onClick={() => setFormDeviceType("پله برقی")}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 transition-all ${
                      formDeviceType === "پله برقی"
                        ? "border-purple-500 bg-purple-500/10 text-purple-300 shadow-sm"
                        : t.dark
                        ? "border-[#333] bg-[#181818] text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <ArrowUpRight size={24} />
                    <span className="text-xs font-medium">پله برقی</span>
                  </button>

                  {/* رمپ */}
                  <button
                    type="button"
                    onClick={() => setFormDeviceType("رمپ")}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3.5 transition-all ${
                      formDeviceType === "رمپ"
                        ? "border-purple-500 bg-purple-500/10 text-purple-300 shadow-sm"
                        : t.dark
                        ? "border-[#333] bg-[#181818] text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    <TrendingDown size={24} />
                    <span className="text-xs font-medium">رمپ</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-full bg-[#7c3aed] py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:bg-[#6d28d9] active:scale-[0.99]"
                >
                  {editingItem ? "ذخیره تغییرات" : "اضافه کردن به چک لیست"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-xl border p-5 shadow-2xl ${
              t.dark ? "border-[#333] bg-[#202020] text-neutral-100" : "border-neutral-200 bg-white text-neutral-900"
            }`}
          >
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={20} />
              <h3 className="text-sm font-semibold">حذف مورد از چک لیست</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-300">
              آیا از حذف مورد ردیف {deletingItem.rowNo} («{deletingItem.question}») از چک لیست اطمینان دارید؟
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className={`rounded-md px-3.5 py-1.5 text-xs ${
                  t.dark ? "bg-[#333] text-neutral-300 hover:bg-[#444]" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                }`}
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                حذف مورد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Preview / PDF Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white text-neutral-900 shadow-2xl">
            {/* Header controls */}
            <div className="flex items-center justify-between border-b px-5 py-3 text-neutral-700">
              <div className="flex items-center gap-2">
                <Printer size={18} className="text-purple-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  فرم رسمی چک لیست بازدید سرویس و نگهداری آسانسور ({totalItems} مورد)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                >
                  <Printer size={13} />
                  <span>پرینت فرم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="rounded p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="flex-1 overflow-y-auto p-6 text-[11.5px]" dir="rtl">
              {/* Official Header */}
              <div className="mb-4 border-b pb-3 text-center">
                <h2 className="text-base font-bold text-neutral-900">
                  چک لیست استاندارد بازدید دوره‌ای آسانسور
                </h2>
                <div className="mt-2 flex justify-around text-neutral-600 text-[11px]">
                  <span>نوع دستگاه: آسانسور</span>
                  <span>دوره بازرسی: ماهیانه</span>
                  <span>تعداد کل موارد کنترلی: {checklist.length} مورد</span>
                  <span>تاریخ چاپ: {new Date().toLocaleDateString("fa-IR")}</span>
                </div>
              </div>

              {/* Items by Category */}
              <div className="space-y-4">
                {categories.map((cat) => {
                  const items = checklist.filter((i) => i.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="rounded border border-neutral-300 overflow-hidden">
                      <div className="bg-neutral-100 px-3 py-1.5 font-bold text-neutral-800 border-b border-neutral-300 flex justify-between">
                        <span>بخش: {cat}</span>
                        <span className="font-normal text-neutral-600">({items.length} مورد کنترلی)</span>
                      </div>
                      <table className="w-full text-right">
                        <thead>
                          <tr className="border-b bg-neutral-50 text-neutral-600 text-[10.5px]">
                            <th className="py-1 px-2 text-center w-10">ردیف</th>
                            <th className="py-1 px-3">عنوان آزمون و مورد بازرسی</th>
                            <th className="py-1 px-2 text-center w-16">سالم ✓</th>
                            <th className="py-1 px-2 text-center w-16">معیوب ✗</th>
                            <th className="py-1 px-3 w-36">توضیحات و رفع عیب</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className="border-b border-neutral-200">
                              <td className="py-1 px-2 text-center font-mono text-neutral-500">{item.rowNo}</td>
                              <td className="py-1 px-3 text-neutral-800">{item.question}</td>
                              <td className="py-1 px-2 text-center border-x border-neutral-200"></td>
                              <td className="py-1 px-2 text-center border-x border-neutral-200"></td>
                              <td className="py-1 px-3 text-neutral-400"></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              {/* Signatures */}
              <div className="mt-8 flex justify-between border-t pt-4 text-center text-neutral-700 text-xs">
                <div>
                  <p className="font-bold">نام و امضای سرویسکار:</p>
                  <div className="mt-8 h-8">...................................</div>
                </div>
                <div>
                  <p className="font-bold">نام و امضای مدیر ساختمان:</p>
                  <div className="mt-8 h-8">...................................</div>
                </div>
                <div>
                  <p className="font-bold">مهر شرکت آسانسور:</p>
                  <div className="mt-8 h-8">...................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

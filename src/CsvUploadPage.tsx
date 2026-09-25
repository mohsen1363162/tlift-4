import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Database,
  ArrowRight,
  Search,
  Download,
  Building2,
  Users,
  RefreshCw,
  Eye,
  Trash2,
  Layers,
  Sparkles,
  Phone,
  ShieldCheck,
  UserCheck,
  Check,
  X,
} from "lucide-react";
import type { Theme } from "./theme";
import { parseBuildingsCsv } from "./utils/buildingsCsv";
import { downloadFullBackup, restoreFullBackup } from "./utils/fullBackup";
import { appStore, useContracts, useCustomers } from "./store";
import {
  parseContractsCsv,
  RAW_CSV_DATA,
  CsvContractRow,
  parseCustomersCsv,
  RAW_CUSTOMERS_CSV_DATA,
  CsvCustomerRow,
} from "./csvData";

interface CsvUploadPageProps {
  t: Theme;
  initialType?: "contracts" | "customers";
  onOpenContracts?: () => void;
  onOpenCustomers?: () => void;
}

export default function CsvUploadPage({
  t,
  initialType = "contracts",
  onOpenContracts,
  onOpenCustomers,
}: CsvUploadPageProps) {
  const [activeDataset, setActiveDataset] = useState<"contracts" | "customers" | "buildings">(initialType);

  useEffect(() => {
    if (initialType) {
      setActiveDataset(initialType);
    }
  }, [initialType]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [backupMessage, setBackupMessage] = useState("");

  const handleBackupDownload = () => {
    const count = downloadFullBackup();
    setBackupMessage(`پشتیبان کامل با ${count.toLocaleString("fa-IR")} بخش اطلاعاتی دانلود شد.`);
  };

  const handleBackupRestore = async (file?: File) => {
    if (!file) return;
    try {
      const result = await restoreFullBackup(file);
      setBackupMessage(`${result.restored.toLocaleString("fa-IR")} بخش بازیابی و برای همگام‌سازی سرور صف‌بندی شد؛ برنامه در حال بازنشانی است...`);
      window.setTimeout(() => window.location.reload(), 1800);
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "بازیابی پشتیبان ناموفق بود.");
    }
  };

  // Contracts CSV state
  const [contractsCsv, setContractsCsv] = useState<string>("");
  const [contractsFileName, setContractsFileName] = useState<string>("هنوز فایلی انتخاب نشده است");
  const [contractsFileSize, setContractsFileSize] = useState<string>("0 KB");

  // Customers CSV state
  const [customersCsv, setCustomersCsv] = useState<string>("");
  const [customersFileName, setCustomersFileName] = useState<string>("هنوز فایلی انتخاب نشده است");
  const [customersFileSize, setCustomersFileSize] = useState<string>("0 KB");
  const [buildingsCsv, setBuildingsCsv] = useState("");
  const [buildingsFileName, setBuildingsFileName] = useState("هنوز فایلی انتخاب نشده است");
  const parsedBuildingsRows = useMemo(() => parseBuildingsCsv(buildingsCsv), [buildingsCsv]);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [importStatus, setImportStatus] = useState<{
    status: "idle" | "success" | "error";
    message: string;
    stats?: { totalRows: number; added: number; updated: number };
  }>({ status: "idle", message: "" });

  const [isDragging, setIsDragging] = useState(false);
  const [activeView, setActiveView] = useState<"preview" | "raw">("preview");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const currentContracts = useContracts();
  const currentCustomers = useCustomers();

  // Parse current CSV contents
  const parsedContractsRows: CsvContractRow[] = useMemo(() => {
    try {
      return parseContractsCsv(contractsCsv);
    } catch (e) {
      console.error("Error parsing Contracts CSV:", e);
      return [];
    }
  }, [contractsCsv]);

  const parsedCustomersRows: CsvCustomerRow[] = useMemo(() => {
    try {
      return parseCustomersCsv(customersCsv);
    } catch (e) {
      console.error("Error parsing Customers CSV:", e);
      return [];
    }
  }, [customersCsv]);

  // Current active rows based on dataset
  const activeRowsCount = activeDataset === "contracts" ? parsedContractsRows.length : activeDataset === "customers" ? parsedCustomersRows.length : parsedBuildingsRows.length;

  // Filtered rows for preview
  const filteredContractRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedContractsRows;
    const q = searchQuery.toLowerCase();
    return parsedContractsRows.filter(
      (r) =>
        r.customer.toLowerCase().includes(q) ||
        r.buildingName.toLowerCase().includes(q) ||
        r.no.includes(q) ||
        r.phone.includes(q) ||
        r.zone.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.coordinator.toLowerCase().includes(q)
    );
  }, [parsedContractsRows, searchQuery]);

  const filteredCustomerRows = useMemo(() => {
    if (!searchQuery.trim()) return parsedCustomersRows;
    const q = searchQuery.toLowerCase();
    return parsedCustomersRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q)
    );
  }, [parsedCustomersRows, searchQuery]);

  const currentFilteredCount =
    activeDataset === "contracts" ? filteredContractRows.length : filteredCustomerRows.length;

  const effectivePageSize = pageSize === -1 ? currentFilteredCount || 1 : pageSize;
  const totalPages = Math.ceil(currentFilteredCount / effectivePageSize) || 1;

  const currentContractSlice = useMemo(() => {
    if (pageSize === -1) return filteredContractRows;
    const start = (page - 1) * pageSize;
    return filteredContractRows.slice(start, start + pageSize);
  }, [filteredContractRows, page, pageSize]);

  const currentCustomerSlice = useMemo(() => {
    if (pageSize === -1) return filteredCustomerRows;
    const start = (page - 1) * pageSize;
    return filteredCustomerRows.slice(start, start + pageSize);
  }, [filteredCustomerRows, page, pageSize]);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        if (activeDataset === "contracts") {
          setContractsCsv(text);
          setContractsFileName(file.name);
          setContractsFileSize(sizeStr);
        } else if (activeDataset === "customers") {
          setCustomersCsv(text);
          setCustomersFileName(file.name);
          setCustomersFileSize(sizeStr);
        } else {
          setBuildingsCsv(text);
          setBuildingsFileName(file.name);
        }
        setPage(1);
        setImportStatus({ status: "idle", message: "" });
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleImport = () => {
    if (activeDataset === "buildings") {
      if (!parsedBuildingsRows.length) return setImportStatus({ status: "error", message: "فایل ساختمان معتبر یا دارای ردیف نیست." });
      const res = appStore.importBuildingsFromCsv(parsedBuildingsRows);
      setImportStatus({ status: "success", message: `${res.updated.toLocaleString("fa-IR")} قرارداد با مبلغ دوره و برنامه خام از مهر به‌روزرسانی شد.` });
      return;
    }
    if (activeDataset === "contracts") {
      if (!parsedContractsRows.length) {
        setImportStatus({
          status: "error",
          message: "هیچ ردیفی برای درون‌ریزی یافت نشد. لطفاً فایل CSV معتبر بارگذاری یا وارد کنید.",
        });
        return;
      }

      try {
        const res = appStore.importContractsFromCsv(contractsCsv, importMode);
        setImportStatus({
          status: "success",
          message: `تعداد ${res.totalRows.toLocaleString("fa-IR")} قرارداد و مشتری با موفقیت در دیتابیس ثبت و تایید شدند!`,
          stats: {
            totalRows: res.totalRows,
            added: res.contractsAdded,
            updated: res.contractsUpdated,
          },
        });
      } catch (err: unknown) {
        setImportStatus({
          status: "error",
          message: err instanceof Error ? err.message : "خطایی در پردازش و ذخیره اطلاعات قراردادها رخ داد.",
        });
      }
    } else {
      if (!parsedCustomersRows.length) {
        setImportStatus({
          status: "error",
          message: "هیچ ردیف مشتری برای درون‌ریزی یافت نشد. لطفاً فایل CSV معتبر بارگذاری یا وارد کنید.",
        });
        return;
      }

      try {
        const res = appStore.importCustomersFromCsv(customersCsv, importMode);
        setImportStatus({
          status: "success",
          message: `تعداد ${res.totalRows.toLocaleString("fa-IR")} مشتری با موفقیت در سیستم ثبت و ذخیره شدند!`,
          stats: {
            totalRows: res.totalRows,
            added: res.customersAdded,
            updated: res.customersUpdated,
          },
        });
      } catch (err: unknown) {
        setImportStatus({
          status: "error",
          message: err instanceof Error ? err.message : "خطایی در پردازش و ذخیره اطلاعات مشتریان رخ داد.",
        });
      }
    }
  };

  const handleDownloadSample = () => {
    const content = activeDataset === "contracts" ? (contractsCsv || RAW_CSV_DATA) : (customersCsv || RAW_CUSTOMERS_CSV_DATA);
    const fname = activeDataset === "contracts" ? "contracts_sample.csv" : "customers_sample.csv";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fname);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadDefaultData = () => {
    if (activeDataset === "contracts") {
      setContractsCsv(RAW_CSV_DATA);
      setContractsFileName("فایل_پیش‌فرض_قراردادها.csv");
      setContractsFileSize("~28 KB");
    } else {
      setCustomersCsv(RAW_CUSTOMERS_CSV_DATA);
      setCustomersFileName("فایل_پیش‌فرض_مشتریان.csv");
      setCustomersFileSize("~6 KB");
    }
    setPage(1);
    setImportStatus({ status: "idle", message: "" });
  };

  return (
    <div className={`min-h-full p-4 md:p-6 pb-28 space-y-6 ${t.bg} ${t.text}`} dir="rtl">
      <div className={`rounded-2xl border ${t.border} ${t.card} p-4 shadow-sm`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={18} className="text-emerald-500"/> پشتیبان کامل اطلاعات</h2>
            <p className={`mt-1 text-xs ${t.sub}`}>قراردادها، مشتریان، قیمت‌ها، سرویس‌ها، پرداخت‌ها و تنظیمات را یکجا دانلود یا بازیابی کنید. بازیابی هم‌زمان برای سرور نیز صف‌بندی می‌شود.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleBackupDownload} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"><Download size={16}/> دانلود پشتیبان کامل</button>
            <button type="button" onClick={() => backupInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-sky-500/50 px-4 py-2.5 text-xs font-bold text-sky-500 hover:bg-sky-500/10"><UploadCloud size={16}/> بازیابی پشتیبان</button>
            <input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { handleBackupRestore(event.target.files?.[0]); event.currentTarget.value = ""; }}/>
          </div>
        </div>
        {backupMessage && <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">{backupMessage}</div>}
      </div>

      {/* Dataset Selection Tabs */}
      <div className={`p-2 rounded-2xl border ${t.border} ${t.card} flex flex-wrap items-center justify-between gap-3 shadow-sm`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveDataset("contracts");
              setPage(1);
              setSearchQuery("");
              setImportStatus({ status: "idle", message: "" });
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeDataset === "contracts"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                : `${t.hover} ${t.sub} hover:text-white`
            }`}
          >
            <Building2 size={16} />
            <span>آپلود CSV قراردادها و سرویس‌ها</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeDataset === "contracts" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {parsedContractsRows.length.toLocaleString("fa-IR")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveDataset("customers");
              setPage(1);
              setSearchQuery("");
              setImportStatus({ status: "idle", message: "" });
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeDataset === "customers"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                : `${t.hover} ${t.sub} hover:text-white`
            }`}
          >
            <Users size={16} />
            <span>آپلود CSV لیست مشتریان</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${
                activeDataset === "customers" ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {parsedCustomersRows.length.toLocaleString("fa-IR")}
            </span>
          </button>
          <button type="button" onClick={() => { setActiveDataset("buildings"); setImportStatus({ status: "idle", message: "" }); }} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${activeDataset === "buildings" ? "bg-emerald-600 text-white" : `${t.hover} ${t.sub}`}`}>
            <Building2 size={16}/><span>آپلود CSV ساختمان‌ها و مبلغ دوره</span><span className="rounded-full bg-white/20 px-2">{parsedBuildingsRows.length.toLocaleString("fa-IR")}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={t.sub}>قراردادهای جاری دیتابیس:</span>
          <span className="font-bold text-violet-400">{currentContracts.length.toLocaleString("fa-IR")}</span>
          <span className="opacity-40">|</span>
          <span className={t.sub}>مشتریان جاری:</span>
          <span className="font-bold text-sky-400">{currentCustomers.length.toLocaleString("fa-IR")}</span>
          <button type="button" onClick={() => setConfirmReset(true)} className="mr-3 flex items-center gap-1 rounded-lg border border-rose-500/40 px-3 py-1.5 font-bold text-rose-500 hover:bg-rose-500/10"><Trash2 size={13}/> پاکسازی کامل اطلاعات</button>
        </div>
      </div>

      {/* Top Header Card with Instant Confirm Button */}
      <div
        className={`p-5 rounded-2xl border ${t.border} ${t.card} flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              activeDataset === "contracts"
                ? "bg-violet-600/15 text-violet-400"
                : "bg-sky-600/15 text-sky-400"
            }`}
          >
            <UploadCloud size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {activeDataset === "contracts"
                  ? "آپلود و ذخیره‌سازی فایل CSV قراردادها و سرویس‌ها"
                  : "آپلود و ذخیره‌سازی فایل CSV لیست مشتریان"}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold ${
                  activeDataset === "contracts"
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-sky-500/20 text-sky-300"
                }`}
              >
                {activeRowsCount.toLocaleString("fa-IR")} ردیف آماده
              </span>
            </div>
            <p className={`text-xs mt-1 ${t.sub}`}>
              {activeDataset === "contracts"
                ? "بارگذاری فایل CSV قراردادها، اعتبارسنجی خودکار و ثبت فوری در لیست ۵۱۴ قرارداد و مشتریان"
                : "بارگذاری فایل CSV مشخصات و وضعیت مشتریان، اعتبارسنجی و ثبت فوری در دیتابیس مشتریان"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleImport}
            disabled={activeRowsCount === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition active:scale-95 text-white ${
              activeDataset === "contracts"
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/25"
            }`}
          >
            <CheckCircle2 size={17} />
            <span>تأیید و ذخیره در سیستم ({activeRowsCount.toLocaleString("fa-IR")})</span>
          </button>
          <button
            onClick={handleLoadDefaultData}
            className={`px-3 py-2 text-xs font-medium rounded-xl border ${t.border} ${t.hover} flex items-center gap-1.5 transition`}
            title="بارگذاری داده‌های پیش‌فرض ارسالی"
          >
            <RefreshCw size={14} />
            بارگذاری داده‌های ارسالی
          </button>
          <button
            onClick={handleDownloadSample}
            className={`px-3 py-2 text-xs font-medium rounded-xl border ${t.border} ${t.hover} flex items-center gap-1.5 transition`}
          >
            <Download size={14} />
            دانلود نمونه CSV
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border ${t.border} ${t.card} flex items-center justify-between`}>
          <div>
            <div className={`text-xs ${t.sub}`}>ردیف‌های آماده در این فایل</div>
            <div
              className={`text-2xl font-bold mt-1 ${
                activeDataset === "contracts" ? "text-violet-400" : "text-sky-400"
              }`}
            >
              {activeRowsCount.toLocaleString("fa-IR")}
            </div>
          </div>
          <FileSpreadsheet
            className={activeDataset === "contracts" ? "text-violet-500 opacity-70" : "text-sky-500 opacity-70"}
            size={26}
          />
        </div>
        <div className={`p-4 rounded-xl border ${t.border} ${t.card} flex items-center justify-between`}>
          <div>
            <div className={`text-xs ${t.sub}`}>قراردادهای ثبت‌شده دیتابیس</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {currentContracts.length.toLocaleString("fa-IR")}
            </div>
          </div>
          <Building2 className="text-emerald-500 opacity-70" size={26} />
        </div>
        <div className={`p-4 rounded-xl border ${t.border} ${t.card} flex items-center justify-between`}>
          <div>
            <div className={`text-xs ${t.sub}`}>مشتریان ثبت‌شده در سیستم</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">
              {currentCustomers.length.toLocaleString("fa-IR")}
            </div>
          </div>
          <Users className="text-sky-500 opacity-70" size={26} />
        </div>
        <div className={`p-4 rounded-xl border ${t.border} ${t.card} flex items-center justify-between`}>
          <div>
            <div className={`text-xs ${t.sub}`}>وضعیت فایل انتخابی</div>
            <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={16} />
              {activeRowsCount > 0 ? "آماده ثبت و ذخیره" : "فایل خالی است"}
            </div>
          </div>
          <Database className="text-blue-500 opacity-70" size={26} />
        </div>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all duration-200 ${
          isDragging
            ? "border-violet-500 bg-violet-500/10 scale-[0.99]"
            : `border-zinc-700 hover:border-violet-500/60 ${t.card}`
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv,.txt"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 cursor-pointer hover:scale-105 transition ${
              activeDataset === "contracts"
                ? "bg-violet-600/15 text-violet-400"
                : "bg-sky-600/15 text-sky-400"
            }`}
          >
            <UploadCloud size={32} />
          </div>

          <h3 className="text-base font-bold">
            فایل CSV {activeDataset === "contracts" ? "قراردادها" : "مشتریان"} خود را اینجا بکشید یا برای انتخاب فایل کلیک کنید
          </h3>
          <p className={`text-xs mt-1.5 max-w-lg mx-auto ${t.sub}`}>
            پشتیبانی از هرگونه فایل اکسل و CSV متنی، ویرگول یا تب، بدون هیچ‌گونه محدودیت حجمی
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                activeDataset === "contracts"
                  ? "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20"
                  : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/20"
              }`}
            >
              <FileSpreadsheet size={15} />
              انتخاب فایل CSV از سیستم
            </button>

            {activeRowsCount > 0 && (
              <button
                type="button"
                onClick={handleImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition animate-pulse"
              >
                <CheckCircle2 size={16} />
                تأیید و ذخیره نهایی ({activeRowsCount.toLocaleString("fa-IR")} ردیف)
              </button>
            )}
          </div>

          <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 text-xs font-medium">
            <FileText size={14} className={activeDataset === "contracts" ? "text-violet-400" : "text-sky-400"} />
            <span>{activeDataset === "contracts" ? contractsFileName : customersFileName}</span>
            <span className="opacity-60">({activeDataset === "contracts" ? contractsFileSize : customersFileSize})</span>
            <span
              className={`px-1.5 py-0.5 rounded text-white text-[10px] font-bold ${
                activeDataset === "contracts" ? "bg-violet-600" : "bg-sky-600"
              }`}
            >
              {activeRowsCount} رکورد
            </span>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div
        className={`p-4 rounded-xl border ${t.border} ${t.card} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-2">
          <Layers size={18} className={activeDataset === "contracts" ? "text-violet-400" : "text-sky-400"} />
          <span className="text-xs font-bold">نحوه ذخیره‌سازی داده‌ها در سیستم:</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === "replace"}
              onChange={() => setImportMode("replace")}
              className="accent-violet-600"
            />
            <span className="font-semibold text-emerald-300">
              جایگزینی کامل دیتابیس با این فایل (پیشنهادی برای همگام‌سازی کامل)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === "merge"}
              onChange={() => setImportMode("merge")}
              className="accent-violet-600"
            />
            <span>افزودن و ادغام با داده‌های قبلی</span>
          </label>
        </div>
      </div>

      {/* Import Status Banner */}
      {importStatus.status !== "idle" && (
        <div
          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            importStatus.status === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {importStatus.status === "success" ? (
              <CheckCircle2 size={24} className="shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle size={24} className="shrink-0 mt-0.5 text-rose-400" />
            )}
            <div>
              <div className="font-bold text-sm">{importStatus.message}</div>
              {importStatus.stats && (
                <div className="text-xs opacity-90 mt-1 flex flex-wrap gap-4">
                  <span>➕ موارد ثبت‌شده: <b>{importStatus.stats.added}</b></span>
                  <span>🔄 موارد به‌روزرسانی‌شده: <b>{importStatus.stats.updated}</b></span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenContracts && (
              <button
                onClick={onOpenContracts}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
              >
                رفتن به لیست قراردادها ({currentContracts.length})
                <ArrowRight size={14} />
              </button>
            )}
            {onOpenCustomers && (
              <button
                onClick={onOpenCustomers}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow"
              >
                رفتن به لیست مشتریان ({currentCustomers.length})
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Controls Bar & Search */}
      <div
        className={`p-4 rounded-xl border ${t.border} ${t.card} flex flex-col md:flex-row items-center justify-between gap-3`}
      >
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.sub}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={`جستجو در پیش‌نمایش ${activeDataset === "contracts" ? "قراردادها" : "مشتریان"}...`}
              className={`w-full pr-9 pl-3 py-2 text-xs rounded-lg border outline-none ${t.border} ${t.bg} focus:border-violet-500`}
            />
          </div>

          <div className="flex items-center bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-700 text-xs">
            <button
              onClick={() => setActiveView("preview")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeView === "preview" ? "bg-violet-600 text-white" : `${t.sub} hover:text-white`
              }`}
            >
              <Eye size={14} />
              جدول پیش‌نمایش ({currentFilteredCount})
            </button>
            <button
              onClick={() => setActiveView("raw")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-medium transition ${
                activeView === "raw" ? "bg-violet-600 text-white" : `${t.sub} hover:text-white`
              }`}
            >
              <FileText size={14} />
              متن خام CSV
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              if (activeDataset === "contracts") {
                setContractsCsv("");
                setContractsFileName("");
                setContractsFileSize("");
              } else {
                setCustomersCsv("");
                setCustomersFileName("");
                setCustomersFileSize("");
              }
              setImportStatus({ status: "idle", message: "" });
            }}
            className={`px-3 py-2 text-xs rounded-lg border border-zinc-700 ${t.hover} text-rose-400 flex items-center gap-1.5 transition`}
            title="پاکسازی محتوا"
          >
            <Trash2 size={14} />
            پاک کردن
          </button>
          <button
            onClick={handleImport}
            disabled={activeRowsCount === 0}
            className={`px-6 py-2 text-xs font-bold rounded-lg text-white flex items-center gap-2 shadow-lg transition ${
              activeDataset === "contracts"
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/20"
            }`}
          >
            <CheckCircle2 size={16} />
            تأیید و ذخیره نهایی ({activeRowsCount})
          </button>
        </div>
      </div>

      {/* Table Preview */}
      {activeView === "preview" ? (
        <div className={`rounded-xl border ${t.border} ${t.card} overflow-hidden shadow-sm`}>
          <div className="overflow-x-auto">
            {activeDataset === "buildings" ? (
              <table className="w-full text-right text-xs"><thead className={`border-b ${t.border} bg-zinc-800/50 ${t.sub}`}><tr><th className="p-3">شماره قرارداد</th><th className="p-3">مشتری</th><th className="p-3">ساختمان</th><th className="p-3">شروع</th><th className="p-3">پایان</th><th className="p-3">هزینه هر دوره</th></tr></thead><tbody>{parsedBuildingsRows.map((row,index)=><tr key={index} className={`border-b ${t.border}`}><td className="p-3">{row.contractNo}</td><td className="p-3">{row.customerName}</td><td className="p-3">{row.buildingName}</td><td className="p-3">{row.startDate}</td><td className="p-3">{row.endDate}</td><td className="p-3">{row.serviceFee.toLocaleString("fa-IR")} ریال</td></tr>)}</tbody></table>
            ) : activeDataset === "contracts" ? (
              /* Contracts Table Preview */
              <table className="w-full text-right text-xs">
                <thead className={`border-b ${t.border} bg-zinc-800/50 ${t.sub} uppercase font-semibold`}>
                  <tr>
                    <th className="px-3 py-3 w-14 text-center">ردیف</th>
                    <th className="px-3 py-3">شماره قرارداد</th>
                    <th className="px-3 py-3">نام مشتری</th>
                    <th className="px-3 py-3">نام ساختمان</th>
                    <th className="px-3 py-3">شماره تماس</th>
                    <th className="px-3 py-3">مسئول هماهنگی</th>
                    <th className="px-3 py-3">منطقه</th>
                    <th className="px-3 py-3">آدرس و مشخصات</th>
                    <th className="px-3 py-3 text-center">تاریخ شروع</th>
                    <th className="px-3 py-3 text-center">تاریخ پایان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {currentContractSlice.length > 0 ? (
                    currentContractSlice.map((row, idx) => (
                      <tr key={idx} className={`hover:bg-zinc-800/40 transition`}>
                        <td className="px-3 py-2.5 text-center opacity-60">
                          {pageSize === -1 ? idx + 1 : (page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-violet-400">{row.no}</td>
                        <td className="px-3 py-2.5 font-semibold">{row.customer}</td>
                        <td className="px-3 py-2.5">{row.buildingName || "—"}</td>
                        <td className="px-3 py-2.5 font-mono text-zinc-300" dir="ltr">
                          {row.phone || row.coordinatorPhone || "—"}
                        </td>
                        <td className="px-3 py-2.5">{row.coordinator || "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-300 text-[11px]">
                            {row.zone || "عمومی"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-xs truncate" title={row.address}>
                          {row.address || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-zinc-400 text-[11px]">{row.start}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-zinc-400 text-[11px]">{row.end}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                        هیچ ردیفی متناسب با جستجو یافت نشد یا فایلی بارگذاری نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              /* Customers Table Preview */
              <table className="w-full text-right text-xs">
                <thead className={`border-b ${t.border} bg-zinc-800/50 ${t.sub} uppercase font-semibold`}>
                  <tr>
                    <th className="px-3 py-3 w-14 text-center">ردیف</th>
                    <th className="px-3 py-3">نام مشتری</th>
                    <th className="px-3 py-3 text-center">نوع مشتری</th>
                    <th className="px-3 py-3">شماره تماس</th>
                    <th className="px-3 py-3 text-center">تعداد ساختمان‌ها</th>
                    <th className="px-3 py-3 text-center">سرنخ</th>
                    <th className="px-3 py-3 text-center">قرارداد نصب</th>
                    <th className="px-3 py-3 text-center">قرارداد سرویس</th>
                    <th className="px-3 py-3 text-center">وضعیت</th>
                    <th className="px-3 py-3 text-center">پیامک</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {currentCustomerSlice.length > 0 ? (
                    currentCustomerSlice.map((row, idx) => (
                      <tr key={idx} className={`hover:bg-zinc-800/40 transition`}>
                        <td className="px-3 py-2.5 text-center opacity-60">
                          {pageSize === -1 ? idx + 1 : (page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-sky-400">{row.name}</td>
                        <td className="px-3 py-2.5 text-center">
                          {row.isLegal ? (
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[11px] font-semibold">
                              حقوقی
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-zinc-700/60 text-zinc-300 text-[11px]">
                              حقیقی
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-zinc-300" dir="ltr">
                          {row.phone || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold">{row.buildings}</td>
                        <td className="px-3 py-2.5 text-center font-mono opacity-80">{row.leads}</td>
                        <td className="px-3 py-2.5 text-center font-mono opacity-80">{row.installContracts}</td>
                        <td className="px-3 py-2.5 text-center font-mono opacity-80">{row.serviceContracts}</td>
                        <td className="px-3 py-2.5 text-center">
                          {row.active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold">
                              <Check size={14} /> فعال
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                              <X size={14} /> غیرفعال
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.sms ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <Check size={14} /> بله
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">خیر</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                        هیچ ردیفی متناسب با جستجو یافت نشد یا فایلی بارگذاری نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination & Page Size */}
          <div
            className={`p-3 border-t ${t.border} flex flex-col sm:flex-row items-center justify-between gap-3 text-xs`}
          >
            <div className="flex items-center gap-3">
              <span className={t.sub}>
                نمایش {pageSize === -1 ? 1 : (page - 1) * pageSize + 1} تا{" "}
                {pageSize === -1 ? currentFilteredCount : Math.min(page * pageSize, currentFilteredCount)} از{" "}
                {currentFilteredCount.toLocaleString("fa-IR")} ردیف
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={`rounded border px-2 py-1 outline-none text-xs ${t.border} ${t.bg} ${t.sub}`}
              >
                <option value={20}>20 در صفحه</option>
                <option value={50}>50 در صفحه</option>
                <option value={100}>100 در صفحه</option>
                <option value={250}>250 در صفحه</option>
                <option value={500}>500 در صفحه</option>
                <option value={-1}>نمایش همه موارد</option>
              </select>
            </div>

            {totalPages > 1 && pageSize !== -1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`px-3 py-1 rounded border ${t.border} ${t.hover} disabled:opacity-30`}
                >
                  صفحه قبلی
                </button>
                <span className="px-3 py-1 font-semibold rounded bg-violet-600 text-white">
                  {page} از {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={`px-3 py-1 rounded border ${t.border} ${t.hover} disabled:opacity-30`}
                >
                  صفحه بعدی
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`rounded-xl border ${t.border} ${t.card} p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">
              ویرایشگر مستقیم متن CSV {activeDataset === "contracts" ? "قراردادها" : "مشتریان"}:
            </span>
            <span className={`text-xs ${t.sub}`}>می‌توانید کل خطوط فایل CSV را مستقیماً اینجا Paste کنید</span>
          </div>
          <textarea
            value={activeDataset === "contracts" ? contractsCsv : activeDataset === "customers" ? customersCsv : buildingsCsv}
            onChange={(e) => {
              if (activeDataset === "contracts") {
                setContractsCsv(e.target.value);
              } else if (activeDataset === "customers") {
                setCustomersCsv(e.target.value);
              } else {
                setBuildingsCsv(e.target.value);
              }
              setImportStatus({ status: "idle", message: "" });
            }}
            rows={16}
            dir="ltr"
            className={`w-full p-4 font-mono text-xs rounded-xl border outline-none resize-y ${t.border} ${t.bg} focus:border-violet-500`}
            placeholder={
              activeDataset === "contracts"
                ? "شماره قرارداد,مشتری,حقوقی,شماره تماس,شماره اشتراک ساختمان,نام ساختمان,نام مسئول هماهنگی,شماره همراه مسئول هماهنگی,وضعیت موقعیت مکانی,منطقه,آدرس,تاریخ عقد قرارداد,تاریخ شروع,تاریخ پایان,فسخ شده,تاریخ فسخ"
                : "نام مشتری,حقوقی,شماره تماس,ساختمان ها,سرنخ,قرارداد نصب,قرارداد سرویس,فعال,ارسال پیامک"
            }
          />
        </div>
      )}

      {/* Sticky Floating Confirmation Bar */}
      <div
        className={`fixed bottom-4 left-4 right-4 md:left-8 md:right-8 z-30 p-3.5 rounded-2xl border ${t.border} ${t.card} backdrop-blur-md bg-zinc-900/95 shadow-2xl flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeDataset === "contracts" ? "bg-emerald-500/20 text-emerald-400" : "bg-sky-500/20 text-sky-400"
            }`}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div className="text-xs font-bold">
              تعداد <span className="text-emerald-400 text-sm">{activeRowsCount.toLocaleString("fa-IR")}</span> ردیف{" "}
              {activeDataset === "contracts" ? "قرارداد و مشتری" : "مشتری"} آماده ثبت
            </div>
            <div className="text-[11px] text-zinc-400">
              با کلیک روی دکمه تایید، تمام این اطلاعات با موفقیت در دیتابیس نرم‌افزار ثبت و ذخیره خواهند شد.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenContracts && (
            <button
              onClick={onOpenContracts}
              className={`px-3 py-2 rounded-xl border ${t.border} ${t.hover} text-xs font-medium transition hidden sm:flex items-center gap-1`}
            >
              <Building2 size={14} />
              قراردادها ({currentContracts.length})
            </button>
          )}
          {onOpenCustomers && (
            <button
              onClick={onOpenCustomers}
              className={`px-3 py-2 rounded-xl border ${t.border} ${t.hover} text-xs font-medium transition hidden sm:flex items-center gap-1`}
            >
              <Users size={14} />
              مشتریان ({currentCustomers.length})
            </button>
          )}
          <button
            onClick={handleImport}
            disabled={activeRowsCount === 0}
            className={`px-6 py-2.5 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition active:scale-95 ${
              activeDataset === "contracts"
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                : "bg-sky-600 hover:bg-sky-500 shadow-sky-600/30"
            }`}
          >
            <CheckCircle2 size={18} />
            <span>تأیید و ذخیره نهایی در سیستم</span>
          </button>
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${t.panel} ${t.border}`}>
            <h3 className="flex items-center gap-2 font-bold text-rose-500"><AlertCircle size={20}/> پاکسازی کامل پایگاه اطلاعات</h3>
            <p className={`mt-3 text-xs leading-6 ${t.sub}`}>تمام قراردادها، مشتریان، سوابق وابسته، زمان‌بندی‌ها و موقعیت‌های ساختمان پاک می‌شوند. این عملیات برای شروع خام و ورود CSV جدید است.</p>
            <div className="mt-5 flex gap-2"><button onClick={() => setConfirmReset(false)} className={`flex-1 rounded-xl border py-2.5 text-xs ${t.border}`}>انصراف</button><button onClick={() => { appStore.clearAllCustomerContractData(); setConfirmReset(false); setImportStatus({ status: "success", message: "اطلاعات قراردادها و مشتریان پاک شد؛ اکنون فایل‌های CSV جدید را بارگذاری کنید." }); }} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white">بله، همه پاک شوند</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

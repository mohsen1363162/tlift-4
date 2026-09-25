import { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  ArrowLeft,
  RotateCw,
  Search,
  Plus,
  X,
  Lock,
  Megaphone,
  Monitor,
  User,
  Headphones,
  MessageSquare,
  GitBranch,
  TerminalSquare,
  SquareArrowOutUpRight,
  LayoutGrid,
  Star,
  CheckCircle2,
  LogOut,
  Smartphone,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  navItems,
  serviceMenu,
  fileMenu,
  settingsMenu,
  salesMenu,
  cartableMenu,
  recentItems,
  MenuGroup,
  Contract,
} from "./data";
import { makeTheme } from "./theme";
import ContractRibbonBar from "./components/ContractRibbonBar";
import WelcomeBanner from "./components/WelcomeBanner";
import SyncIndicator from "./components/SyncIndicator";
import AndroidAppModal from "./components/AndroidAppModal";

// صفحه‌های سنگین به‌صورت تنبل (lazy) لود می‌شوند تا باندل اولیهٔ اپ کوچک بماند
const StaffPage = lazy(() => import("./StaffPage"));
const PartsPage = lazy(() => import("./PartsPage"));
const CustomersPage = lazy(() => import("./CustomersPage"));
const ContractsPage = lazy(() => import("./ContractsPage"));
const NewContractWizard = lazy(() => import("./NewContractWizard"));
const ContractView = lazy(() => import("./ContractView"));
const CustomerReportsPage = lazy(() => import("./CustomerReportsPage"));
const CsvUploadPage = lazy(() => import("./CsvUploadPage"));
const ServiceForm = lazy(() => import("./ServiceForm"));
const MarketingFlyout = lazy(() => import("./components/MarketingFlyout"));
const ScheduleManagementPage = lazy(() => import("./components/ScheduleManagementPage"));
const ZonesPage = lazy(() => import("./components/ZonesPage"));
const ChecklistSettingsPage = lazy(() => import("./components/ChecklistSettingsPage"));
const CpanelSettingsPage = lazy(() => import("./components/CpanelSettingsPage"));
const TechnicianMobileApp = lazy(() => import("./components/mobile/TechnicianMobileApp"));
const TechnicianDashboard = lazy(() => import("./components/TechnicianDashboard"));
const AccessManagementPage = lazy(() => import("./components/AccessManagementPage"));
const CustomerPortalView = lazy(() => import("./components/CustomerPortalView"));

function PageLoader({ label = "در حال بارگذاری…" }: { label?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}
import { useContracts, useMarketingItems, useCompanyAccessSettings, appStore, MonthService } from "./store";
import { useAuth } from "./contexts/AuthContext";
import { checkForAppUpdates, APP_VERSION } from "./utils/appUpdater";
import { CustomerAuthData } from "./utils/customerAuth";

type Tab = {
  id: number;
  title: string;
  kind:
    | "home"
    | "customers"
    | "blank"
    | "contracts"
    | "newContract"
    | "contractView"
    | "staff"
    | "parts"
    | "debtorReport"
    | "customerReport"
    | "csvUpload"
    | "schedule"
    | "zones"
    | "checklist"
    | "cpanel"
    | "technicianDashboard"
    | "accessManagement"
    | "serviceReport";
  contract?: Contract;
  monthService?: MonthService;
  csvType?: "contracts" | "customers";
  initialSubView?: "overview" | "payments" | "breakdowns" | "services";
};

let uid = 100;

const menus: Record<string, MenuGroup[]> = {
  service: serviceMenu,
  file: fileMenu,
  settings: settingsMenu,
  sales: salesMenu,
  cartable: cartableMenu,
};

export default function App() {
  const { currentUserInfo, signOut } = useAuth();
  const [welcomeUser, setWelcomeUser] = useState<CustomerAuthData | null>(null);

  useEffect(() => {
    // اگر در این نشست کاربر تازه لاگین کرده باشد
    const shouldShow = sessionStorage.getItem('tlift_show_welcome');
    if (shouldShow && currentUserInfo) {
      setWelcomeUser(currentUserInfo);
      sessionStorage.removeItem('tlift_show_welcome');
    }
  }, [currentUserInfo]);
  const [dark, setDark] = useState(true);
  const [mobileMode, setMobileMode] = useState<boolean>(() => {
    if (localStorage.getItem("tlift_mobile_mode") === "1") return true;
    return typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  });
  useEffect(() => {
    localStorage.setItem("tlift_mobile_mode", mobileMode ? "1" : "0");
  }, [mobileMode]);
  useEffect(() => {
    if (currentUserInfo?.role === "technician" || currentUserInfo?.role === "staff") setMobileMode(true);
  }, [currentUserInfo?.role]);
  const [query, setQuery] = useState("");
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, title: "تب جدید", kind: "home" }]);
  const [active, setActive] = useState(1);
  const activeHistory = useRef<number[]>([]);
  const navigatingBack = useRef(false);
  useEffect(() => {
    if (navigatingBack.current) {
      navigatingBack.current = false;
      return;
    }
    const history = activeHistory.current;
    if (history[history.length - 1] !== active) history.push(active);
    if (history.length > 50) history.shift();
  }, [active]);
  const goBack = () => {
    const history = activeHistory.current;
    if (history.length <= 1) {
      showToast("صفحه قبلی وجود ندارد");
      return;
    }
    history.pop();
    const previous = history[history.length - 1];
    if (tabs.some((tab) => tab.id === previous)) {
      navigatingBack.current = true;
      setActive(previous);
    }
  };
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [androidModal, setAndroidModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    showToast("در حال بررسی و دریافت آخرین نسخه نرم‌افزار...");
    try {
      const res = await checkForAppUpdates();
      showToast(res.message);
    } catch {
      showToast(`نسخه ${APP_VERSION} فعال است.`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const contracts = useContracts();
  const marketingItems = useMarketingItems();
  const accessSettings = useCompanyAccessSettings();
  const currentLeader = accessSettings.leaders.find((leader) => leader.phone.replace(/\D/g, "").slice(-10) === (currentUserInfo?.phone || "").replace(/\D/g, "").slice(-10));
  const visibleNavItems = currentUserInfo?.role !== "operator" ? navItems : navItems.filter((item) =>
    item.id === "service" ||
    item.id === "home" ||
    (item.id === "settings" && currentLeader?.canAccessSettings) ||
    (item.id === "file" && currentLeader?.canManageContracts)
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  const t = makeTheme(dark);

  const filtered = useMemo(
    () => recentItems.filter((r) => r.title.includes(query.trim())),
    [query]
  );

  const addTab = (
    title = "تب جدید",
    kind: Tab["kind"] = "blank",
    contract?: Contract,
    csvType?: "contracts" | "customers",
    initialSubView?: "overview" | "payments"
  ) => {
    // If a tab of this specific kind already exists, switch to it instead of creating duplicates
    if (kind !== "blank" && kind !== "contractView") {
      const existing = tabs.find((x) => x.kind === kind);
      if (existing) {
        setActive(existing.id);
        return;
      }
    }
    const id = ++uid;
    setTabs((s) => [...s, { id, title, kind, contract, csvType, initialSubView }]);
    setActive(id);
  };
  const closeTab = (id: number) => {
    setTabs((s) => {
      const n = s.filter((x) => x.id !== id);
      if (id === active && n.length) setActive(n[n.length - 1].id);
      return n;
    });
  };

  const openMenuItem = (label: string) => {
    if (label === "مدیریت مدیران و دسترسی‌ها") addTab("مدیریت دسترسی‌ها", "accessManagement");
    else if (["داشبورد سرویس‌کاران", "سرویس‌های انجام‌شده", "ساعات کارکرد", "وضعیت کارهای جاری", "قطعات تحویل‌شده", "قطعات مصرف‌شده", "گزارش عملکرد ماهانه"].includes(label))
      addTab("داشبورد سرویس‌کاران", "technicianDashboard");
    else if (label === "لیست مشتریان") addTab("مشتریان", "customers");
    else if (label === "چاپ گزارش مشتریان بدهکار") addTab("چاپ گزارش مشتریان بدهکار", "debtorReport");
    else if (label === "چاپ گزارش مشتریان") addTab("چاپ گزارش مشتریان", "customerReport");
    else if (label === "قرارداد ها" || label === "قراردادها") addTab("قرارداد ها", "contracts");
    else if (
      label === "مدیریت زمانبندی سرویس ها و خرابی ها" ||
      label.includes("مدیریت زمانبندی") ||
      label.includes("زمانبندی سرویس") ||
      label === "سرویس ها"
    )
      addTab("مدیریت زمانبندی سرویس ها و خرابی ها", "schedule");
    else if (label === "سرویسکار و مسئول انجام") addTab("سرویس کار و مسئول انجام", "staff");
    else if (label === "قطعات" || label === "قطعات مصرفی") addTab("قطعه ها", "parts");
    else if (label === "منطقه" || label === "منطقه‌ها" || label === "منطقه ها" || label.includes("منطقه"))
      addTab("منطقه ها", "zones");
    else if (
      label === "چک لیست" ||
      label.includes("چک لیست") ||
      label === "چک‌لیست"
    )
      addTab("تنظیمات اولیه - چک لیست", "checklist");
    else if (
      label === "مدیریت هاست و خروجی cPanel" ||
      label === "تنظیمات اولیه" ||
      label.includes("cPanel") ||
      label.includes("سی پنل") ||
      label.includes("سی‌پنل") ||
      label.includes("هاست") ||
      label.includes("خروجی") ||
      label.includes("public_html")
    )
      addTab("تنظیمات اولیه - خروجی cPanel", "cpanel");
    else if (
      label === "پرداختی ها" ||
      label === "پرداختی‌ها" ||
      label === "چاپ پرداخت ها" ||
      label === "پرداخت ها"
    ) {
      const target = contracts.find((c) => c.no === "5475") || contracts[0];
      if (target) {
        addTab(
          `پرداختی های قرارداد ${target.no}`,
          "contractView",
          target,
          undefined,
          "payments"
        );
      }
    }
    else if (label.includes("مشتریان") && label.includes("CSV")) addTab("آپلود CSV مشتریان", "csvUpload", undefined, "customers");
    else if (label.includes("قرارداد") && label.includes("CSV")) addTab("آپلود CSV قراردادها", "csvUpload", undefined, "contracts");
    else if (label === "آپلود فایلهای CSV" || label.toLowerCase().includes("csv")) addTab("آپلود فایلهای CSV", "csvUpload", undefined, "contracts");
    else if (label.startsWith("ثبت قرارداد")) addTab("قرارداد جدید", "newContract");
    else if (label === "مشاهده گزارش" || label === "مشاهده گزارش سرویس") {
      const target = contracts.find((c) => c.no === "5475") || contracts[0];
      if (target) {
        const details = appStore.getContractDetails(target.id);
        const m = details.months[0];
        if (m) openServiceReport(m, target);
      }
    }
    else addTab(label, "blank");
    setOpenMenu(null);
  };

  const openContractView = (
    c: Contract,
    initialSubView: "overview" | "payments" | "breakdowns" | "services" = "overview"
  ) => {
    const id = ++uid;
    setTabs((s) => [
      ...s,
      {
        id,
        title:
          initialSubView === "payments"
            ? `پرداختی های قرارداد ${c.no}`
            : initialSubView === "services"
            ? `سرویس‌های قرارداد ${c.no}`
            : initialSubView === "breakdowns"
            ? `خرابی‌های قرارداد ${c.no}`
            : "مشاهده ی قرارداد",
        kind: "contractView",
        contract: c,
        initialSubView,
      },
    ]);
    setActive(id);
  };

  const openServiceReport = (m: MonthService, c: Contract) => {
    const id = ++uid;
    setTabs((s) => [
      ...s,
      {
        id,
        title: "مشاهده گزارش",
        kind: "serviceReport",
        contract: c,
        monthService: m,
      },
    ]);
    setActive(id);
  };

  const current = tabs.find((x) => x.id === active);

  // ۱. اگر کاربر لاگین‌شده مشتری/طرف قرارداد است، منحصراً پرتال اختصاصی مشتریان (فقط‌خواندنی) را ببیند
  if (currentUserInfo?.role === "customer") {
    return (
      <Suspense fallback={<PageLoader />}>
        <CustomerPortalView
          customer={currentUserInfo}
          onSignOut={() => signOut()}
        />
      </Suspense>
    );
  }

  // ۲. کنترل دسترسی نسخه اندروید/موبایل: فقط سرویس‌کاران و مسئولین فنی ثبت‌شده در تنظیمات اولیه
  if (mobileMode) {
    const isTechOrStaff =
      currentUserInfo?.role === "technician" ||
      currentUserInfo?.role === "staff" ||
      currentUserInfo?.role === "admin";

    if (!isTechOrStaff) {
      return (
        <Suspense fallback={<PageLoader />}>
          <CustomerPortalView
            customer={
              currentUserInfo || {
                id: "cust_guest",
                name: "مشتری گرامی",
                role: "customer",
              }
            }
            onSignOut={() => signOut()}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<PageLoader />}>
        <TechnicianMobileApp
          technician={{
            name: currentUserInfo?.name || "محسن امامی برسری",
            phone: currentUserInfo?.phone || "09192868509",
            company: "شرکت آسمان‌سرا",
          }}
          onExitToDesktop={
            currentUserInfo?.role === "admin" ? () => setMobileMode(false) : undefined
          }
          onSignOut={() => signOut()}
        />
      </Suspense>
    );
  }

  return (
    <div
      dir="rtl"
      className={`min-h-screen w-full text-right ${dark ? "bg-[radial-gradient(circle_at_top_right,#243047_0%,#171717_48%,#101010_100%)]" : "bg-[radial-gradient(circle_at_top_right,#e0edff_0%,#f4f7fb_48%,#e9edf4_100%)]"} p-3 font-[Vazirmatn,Tahoma,system-ui]`}
    >
      <div
        className={`mx-auto flex h-[calc(100vh-24px)] max-w-[1400px] flex-col overflow-hidden rounded-md border ${t.border} ${t.body} shadow-2xl`}
      >
        {/* Title bar */}
        <div className={`flex items-center gap-2 ${t.chrome} px-2 py-1.5`}>
          <div className={`flex h-7 w-[220px] items-center gap-2 rounded border px-2 ${t.input}`}>
            <Search size={13} className={t.sub} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو..."
              className="w-full bg-transparent text-[12px] outline-none"
            />
          </div>

          <div className="flex flex-1 items-center gap-[2px] overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`group flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-t px-3 text-[12px] ${
                  active === tab.id ? `${t.tabActive} ${t.text}` : `${t.sub} ${t.hover}`
                }`}
              >
                <span className="whitespace-nowrap">{tab.title}</span>
                {tabs.length > 1 && (
                  <X
                    size={13}
                    className="opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addTab("تب جدید", "home")}
              className={`rounded p-1.5 ${t.hover} ${t.sub}`}
            >
              <Plus size={16} />
            </button>
            <button type="button" className={`rounded p-1.5 ${t.hover} ${t.sub}`}>
              <LayoutGrid size={15} />
            </button>
          </div>

          <SyncIndicator variant="header" onShowToast={setToastMsg} />

          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            title={`بروزرسانی نرم‌افزار به آخرین تغییرات (نسخه ${APP_VERSION})`}
            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-blue-700 shadow-sm transition disabled:opacity-60"
          >
            <RefreshCw size={12} className={checkingUpdate ? "animate-spin" : ""} />
            <span>آپدیت</span>
          </button>

          <button
            type="button"
            onClick={() => setAndroidModal(true)}
            title="نصب برنامه مستقل آسمانسرا روی گوشی"
            className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <Smartphone size={13} /> نصب برنامه آسمانسرا
          </button>

          <button
            type="button"
            onClick={() => setMobileMode(true)}
            title="اپلیکیشن موبایل تکنسین"
            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-blue-700"
          >
            <Smartphone size={13} /> نمای موبایل
          </button>

          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            title="تم شب و روز"
            className={`relative h-5 w-10 rounded-full transition ${dark ? "bg-neutral-600" : "bg-amber-400"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                dark ? "right-0.5" : "right-[22px]"
              }`}
            />
          </button>

          <div className={`flex items-center gap-1 border-r pr-2 ${t.border} ${t.sub}`}>
            <button type="button" onClick={() => window.location.reload()} title="تازه‌سازی صفحه و دریافت آخرین اطلاعات" className={`rounded-lg p-2 ${t.hover} hover:text-sky-500`}>
              <RotateCw size={17} />
            </button>
            <button type="button" onClick={goBack} title="بازگشت به صفحه قبلی برنامه" className={`rounded-lg p-2 ${t.hover} hover:text-violet-500`}>
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative flex min-h-0 flex-1">
          {/* Sidebar */}
          <div className={`order-first flex w-[68px] shrink-0 flex-col overflow-y-auto border-s ${t.border} ${t.chrome}`}>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const on = openMenu === item.id;
              const hasFlyout = item.id === "marketing" || !!menus[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOpenMenu(on ? null : item.id)}
                  onMouseEnter={() => hasFlyout && setOpenMenu(item.id)}
                  className={`relative flex flex-col items-center gap-1 border-b px-1 py-3 text-[10.5px] leading-4 ${
                    t.border
                  } ${on ? (dark ? "bg-white/10" : "bg-black/5") : ""} ${t.hover} ${t.text}`}
                >
                  {item.locked && <Lock size={10} className="absolute end-1 top-1 text-amber-500" />}
                  {item.badge && <span className="absolute start-1 top-2 h-3 w-3 rounded-full bg-orange-500" />}
                  {item.id === "marketing" && marketingItems.length > 0 && (
                    <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-neutral-950">
                      {marketingItems.length}
                    </span>
                  )}
                  <Icon size={19} className={on ? "text-amber-400" : t.sub} />
                  <span className="text-center">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Marketing Flyout */}
          {openMenu === "marketing" && (
            <div
              onMouseLeave={() => setOpenMenu(null)}
              className={`absolute inset-y-0 right-[68px] z-30 flex w-[280px] flex-col border-e text-right ${
                t.border
              } ${t.chrome} shadow-[0_0_30px_rgba(0,0,0,.6)]`}
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                  </div>
                }
              >
                <MarketingFlyout
                  t={t}
                  dark={dark}
                  onOpenItem={openMenuItem}
                  onClose={() => setOpenMenu(null)}
                  onShowToast={showToast}
                />
              </Suspense>
            </div>
          )}

          {/* Standard Menu Flyout */}
          {openMenu && openMenu !== "marketing" && menus[openMenu] && (
            <div
              onMouseLeave={() => setOpenMenu(null)}
              className={`absolute inset-y-0 right-[68px] z-30 flex w-[265px] flex-col border-e text-right ${
                t.border
              } ${t.chrome} shadow-[0_0_25px_rgba(0,0,0,.5)]`}
            >
              <div className="flex-1 overflow-y-auto">
                {menus[openMenu].map((g) => (
                  <div key={g.title}>
                    <div
                      className={`sticky top-0 z-10 px-3 py-2 text-right text-[12.5px] font-bold ${
                        dark ? "bg-[#2c2c2c]" : "bg-neutral-200"
                      } ${t.text}`}
                    >
                      {g.title}
                    </div>
                    {g.items.map((it) => {
                      const isPinned = marketingItems.some((m) => m.name === it);
                      const currentMenuLabel =
                        navItems.find((n) => n.id === openMenu)?.label || "سایر منوها";

                      return (
                        <div
                          key={it}
                          className={`group/menuitem flex w-full items-center justify-between gap-1.5 border-b px-2.5 py-2 text-[12px] transition ${
                            t.border
                          } ${t.hover} ${t.text}`}
                        >
                          {/* Item click to open page */}
                          <button
                            type="button"
                            onClick={() => openMenuItem(it)}
                            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-right text-inherit"
                          >
                            <span className="truncate text-right leading-5">{it}</span>
                            <SquareArrowOutUpRight
                              size={12}
                              className={`shrink-0 opacity-40 group-hover/menuitem:opacity-80 ${t.sub}`}
                            />
                          </button>

                          {/* Small Toggle Icon for Marketing */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const added = appStore.toggleMarketingItem({
                                name: it,
                                section: currentMenuLabel,
                                groupTitle: g.title,
                              });
                              showToast(
                                added
                                  ? `«${it}» به دسترسی سریع اضافه شد ⭐`
                                  : `«${it}» از دسترسی سریع حذف شد`
                              );
                            }}
                            title={
                              isPinned
                                ? "حذف از دسترسی سریع"
                                : "افزودن به دسترسی سریع (روشن کردن)"
                            }
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all ${
                              isPinned
                                ? "bg-amber-500/25 text-amber-400 ring-1 ring-amber-400/50 hover:bg-amber-500/40"
                                : "text-zinc-500 hover:bg-zinc-700/50 hover:text-amber-300 opacity-40 group-hover/menuitem:opacity-100"
                            }`}
                          >
                            <Star
                              size={13}
                              className={
                                isPinned
                                  ? "fill-amber-400 text-amber-400"
                                  : "transition-transform hover:scale-110"
                              }
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div
            className="flex min-w-0 flex-1 flex-col overflow-hidden"
            onClick={() => setOpenMenu(null)}
          >
            <Suspense fallback={<PageLoader />}>
            {current?.kind === "schedule" ? (
              <ScheduleManagementPage
                t={t}
                onOpenContract={(no) => {
                  const c = contracts.find((x) => x.no === no);
                  if (c) openContractView(c);
                  else addTab("قرارداد ها", "contracts");
                }}
                onShowToast={showToast}
              />
            ) : current?.kind === "customers" ? (
              <CustomersPage
                t={t}
                onOpenTab={(title) => addTab(title, "blank")}
                onOpenContract={openContractView}
                onOpenCsvUpload={() => addTab("آپلود CSV مشتریان", "csvUpload", undefined, "customers")}
              />
            ) : current?.kind === "debtorReport" || current?.kind === "customerReport" ? (
              <CustomerReportsPage
                t={t}
                reportType={current.kind === "debtorReport" ? "debtors" : "general"}
                onOpenContract={openContractView}
                onOpenCustomerProfile={(name) => addTab(`پروفایل مشتری - ${name}`, "blank")}
              />
            ) : current?.kind === "contracts" ? (
              <ContractsPage
                t={t}
                contracts={contracts}
                onNewContract={() => addTab("قرارداد جدید", "newContract")}
                onOpenContract={openContractView}
                onOpenCsvUpload={() => addTab("آپلود CSV قراردادها", "csvUpload", undefined, "contracts")}
              />
            ) : current?.kind === "staff" ? (
              <StaffPage t={t} />
            ) : current?.kind === "parts" ? (
              <PartsPage t={t} />
            ) : current?.kind === "technicianDashboard" ? (
              <TechnicianDashboard t={t} />
            ) : current?.kind === "accessManagement" ? (
              <AccessManagementPage t={t} />
            ) : current?.kind === "zones" ? (
              <ZonesPage t={t} onShowToast={showToast} />
            ) : current?.kind === "csvUpload" ? (
              <CsvUploadPage
                t={t}
                initialType={current.csvType || "contracts"}
                onOpenContracts={() => addTab("قرارداد ها", "contracts")}
                onOpenCustomers={() => addTab("مشتریان", "customers")}
              />
            ) : current?.kind === "contractView" && current.contract ? (
              <ContractView
                t={t}
                contract={current.contract}
                initialSubView={current.initialSubView || "overview"}
                onOpenServiceReport={openServiceReport}
              />
            ) : current?.kind === "serviceReport" && current.contract && current.monthService ? (
              <ServiceForm
                t={t}
                planDate={`${current.monthService.y}/${String(current.monthService.id).padStart(2, "0")}/13`}
                baseAmount={current.monthService.amount || 7000000}
                contractRibbon={
                  <ContractRibbonBar
                    t={t}
                    contract={current.contract}
                    contractNo={current.contract.no}
                  />
                }
                initialData={{
                  techs: current.monthService.techs,
                  doneBy: current.monthService.doneBy || "محسن امامی برسری",
                  report: current.monthService.report,
                  reminder: current.monthService.reminder,
                  doneDate: current.monthService.date || "1405/06/25",
                  inTime: current.monthService.inTime || "10:00",
                  outTime: current.monthService.outTime || "11:30",
                  wage: current.monthService.wage,
                  trip: current.monthService.trip,
                  discount: current.monthService.discount,
                  faultsList: current.monthService.faultsList,
                  partsList: current.monthService.partsList,
                }}
                onBack={() => closeTab(current.id)}
                onSubmit={(d) => {
                  appStore.addServiceSubmission(current.contract!.id, current.monthService!.id, d);
                  showToast("گزارش سرویس با موفقیت ثبت و ذخیره شد");
                  closeTab(current.id);
                }}
              />
            ) : current?.kind === "checklist" ? (
              <ChecklistSettingsPage t={t} onShowToast={showToast} />
            ) : current?.kind === "cpanel" ? (
              <CpanelSettingsPage t={t} onShowToast={showToast} />
            ) : current?.kind === "newContract" ? (
              <NewContractWizard
                t={t}
                onSave={(nc) => {
                  appStore.addContract(nc);
                  setTabs((s) =>
                    s.map((x) =>
                      x.id === current.id
                        ? { ...x, title: "قرارداد ها", kind: "contracts" as const, contract: undefined }
                        : x
                    )
                  );
                }}
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-10 py-6">
                <div className="mb-8 flex justify-center gap-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addTab("تب جدید", "home")}
                      className={`flex h-[120px] w-[120px] items-center justify-center rounded border-2 border-dashed ${t.card} ${t.sub} ${t.hover}`}
                    >
                      <Plus size={30} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
                <div className="mx-auto w-full max-w-[880px]">
                  {filtered.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const target = r.title.split(" - ").pop()!;
                        openMenuItem(target);
                      }}
                      className={`flex cursor-pointer items-center justify-between border-b px-4 py-4 text-[13px] ${t.border} ${t.hover} ${t.text}`}
                    >
                      <span className={t.sub}>{r.time}</span>
                      <span>{r.title}</span>
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <div className={`py-10 text-center text-[13px] ${t.sub}`}>موردی یافت نشد</div>
                  )}
                </div>
              </div>
            )}
            </Suspense>
          </div>
        </div>

        {/* Status bar */}
        <div
          className={`flex items-center justify-between border-t ${t.border} ${t.chrome} px-3 py-1.5 text-[11.5px] ${t.sub}`}
        >
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1">
              <Megaphone size={13} /> اعلان ها
            </span>
            <span
              onClick={() => currentUserInfo && setWelcomeUser(currentUserInfo)}
              title="کلیک برای نمایش پیام خوش‌آمدگویی"
              className="flex items-center gap-1 font-medium text-emerald-400 cursor-pointer hover:underline transition"
            >
              <User size={13} /> {currentUserInfo?.name || "محسن امامی"} عزیز خوش آمدید!
              {currentUserInfo?.userType && (
                <span className="mr-1 rounded bg-violet-900/60 border border-violet-500/40 px-1.5 py-0.5 text-[10px] text-violet-200">
                  {currentUserInfo.userType}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              title="خروج از حساب"
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition px-1.5 py-0.5 rounded hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut size={13} /> خروج
            </button>
            <SyncIndicator />
            <span className="flex items-center gap-1">
              <Headphones size={13} /> پشتیبانی
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={13} /> مانده پیامک: ۵٬۳۲۶٬۳۹۸ ریال
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1">
              <GitBranch size={13} /> نسخه 1.1.22
            </span>
          </div>
        </div>

        {/* کادر خوش‌آمدگویی شکیل ۵ ثانیه‌ای */}
        {welcomeUser && (
          <WelcomeBanner
            user={welcomeUser}
            duration={5000}
            onClose={() => setWelcomeUser(null)}
          />
        )}

        {/* مودال دانلود و راهنمای نصب نسخه اندروید موبایل */}
        <AndroidAppModal
          open={androidModal}
          onClose={() => setAndroidModal(false)}
          onOpenMobileView={() => setMobileMode(true)}
        />

        {/* Floating Toast Notification */}
        {toastMsg && (
          <div className="pointer-events-none fixed bottom-12 start-12 z-50 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-neutral-900/95 px-4 py-2.5 text-[12px] font-medium text-amber-200 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
            <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

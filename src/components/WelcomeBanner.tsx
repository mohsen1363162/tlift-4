import React, { useEffect, useState } from 'react';
import { CustomerAuthData } from '@/utils/customerAuth';
import BrandLogo from './BrandLogo';
import {
  CheckCircle2,
  ShieldCheck,
  Wrench,
  Building2,
  Phone,
  X,
  Sparkles,
} from 'lucide-react';

interface WelcomeBannerProps {
  user: CustomerAuthData;
  duration?: number; // میلی‌ثانیه، پیش‌فرض ۵۰۰۰ (۵ ثانیه)
  onClose: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  user,
  duration = 5000,
  onClose,
}) => {
  const [progress, setProgress] = useState(100);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // کاهش تدریجی خط پیشرفت نوار تایمر در ۵ ثانیه
    const stepTime = 50;
    const totalSteps = duration / stepTime;
    const decrement = 100 / totalSteps;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(progressInterval);
          return 0;
        }
        return Math.max(0, prev - decrement);
      });
    }, stepTime);

    // زمان‌بندی خروج خودکار دقیقاً بعد از ۵ ثانیه
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 280); // انیمیشن خروج
  };

  const isTech = user.role === 'technician';
  const isAdmin = user.role === 'admin';

  return (
    <aside
      aria-label="پیام خوش‌آمدگویی"
      dir="rtl"
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] w-[92%] max-w-[480px] overflow-hidden rounded-2xl border border-white/10 bg-[#16171a]/95 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_35px_rgba(141,127,201,0.20)] backdrop-blur-xl transition-all duration-300 ${
        isClosing
          ? 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
          : 'animate-in fade-in slide-in-from-top-6 duration-300'
      }`}
    >
      <div className="relative p-4 sm:p-4.5">
        {/* دکمه بستن دستی */}
        <button
          type="button"
          onClick={handleClose}
          title="بستن پیام"
          className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-3.5 pl-6">
          {/* لوگو یا آواتار کاربر */}
          <div className="relative shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-400/50 shadow-md"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8d7fc9]/30 to-emerald-500/20 ring-1 ring-white/10 shadow-inner">
                <BrandLogo className="h-9 w-9 shadow-sm" />
              </div>
            )}
            {/* نشان آنلاین با انیمیشن پالس */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#16171a]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </span>
          </div>

          {/* متن‌های خوش‌آمدگویی و اطلاعات کاربری */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[14.5px] font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span>{user.name}</span>
                <span className="text-zinc-300 font-normal text-[13px]">عزیز، خوش آمدید!</span>
              </h2>

              {/* برچسب نقش کاربر */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium border shadow-xs ${
                  isAdmin
                    ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                    : isTech
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-violet-400/40 bg-[#8d7fc9]/20 text-violet-200'
                }`}
              >
                {isAdmin ? (
                  <>
                    <ShieldCheck size={11} />
                    مدیریت ارشد
                  </>
                ) : isTech ? (
                  <>
                    <Wrench size={11} />
                    تکنسین سرویس
                  </>
                ) : (
                  <>
                    <Building2 size={11} />
                    مشتری آسانسور
                  </>
                )}
              </span>
            </div>

            <p className="mt-1 text-[11.5px] text-zinc-400 flex items-center gap-2 truncate">
              <span className="flex items-center gap-1 text-zinc-300">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                ورود موفق به سامانه آسمان‌سرا
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-400" dir="ltr">
                <Phone size={10} className="text-zinc-500" />
                {user.phone}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* خط پیشرفت تایمر ۵ ثانیه (Progress Bar) */}
      <div className="h-[3px] w-full bg-white/10 overflow-hidden">
        <div
          style={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-emerald-400 via-[#8d7fc9] to-emerald-400 transition-all ease-linear shadow-[0_0_8px_rgba(52,211,153,0.8)]"
        />
      </div>
    </aside>
  );
};

export default WelcomeBanner;

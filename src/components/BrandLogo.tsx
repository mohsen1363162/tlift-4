import React from 'react';

interface BrandLogoProps {
  className?: string;
}

/**
 * لوگوی شرکت آسمان‌سرا — دایره قرمز با حرف A سفید
 * مطابق تصویر فرم ورود
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'h-11 w-11' }) => {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f05252] to-[#c53030] shadow-md shadow-red-500/25 ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[58%] w-[58%]">
        <path
          d="M12 3.5 L19.8 20.5 H15.9 L12 10.8 L8.1 20.5 H4.2 Z"
          fill="white"
        />
        <rect x="8.6" y="14.6" width="6.8" height="2.4" rx="1.2" fill="white" />
      </svg>
    </div>
  );
};

export default BrandLogo;


import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  getTodayJalali, 
  shamsiMonths, 
  getShamsiDaysInMonth, 
  getShamsiFirstDayOfWeek,
  jalaliToGregorian
} from '../utils/dateConverter';

interface ShamsiDatePickerProps {
  value: { jy: number; jm: number; jd: number };
  onChange: (date: { jy: number; jm: number; jd: number }) => void;
  label?: string;
  onClose?: () => void;
}

const ShamsiDatePicker: React.FC<ShamsiDatePickerProps> = ({
  value,
  onChange,
  label = "انتخاب تاریخ"
}) => {
  const [year, setYear] = useState<number>(value?.jy || getTodayJalali().jy);
  const [month, setMonth] = useState<number>(value?.jm || getTodayJalali().jm);
  
  // Update local state when prop value changes
  useEffect(() => {
    if (value) {
      setYear(value.jy);
      setMonth(value.jm);
    }
  }, [value?.jy, value?.jm]);
  
  const changeMonth = (increment: number) => {
    let newMonth = month + increment;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    setMonth(newMonth);
    setYear(newYear);
  };
  
  const renderCalendar = () => {
    const daysInMonth = getShamsiDaysInMonth(year, month);
    const firstDayOfWeek = getShamsiFirstDayOfWeek(year, month);
    
    // Create array for days in month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Create empty cells for days before the first day of month
    const emptyCells = Array.from({ length: firstDayOfWeek }, (_, i) => null);
    
    // Combine empty cells and days
    const allCells = [...emptyCells, ...days];
    
    // Create weeks (rows)
    const weeks = [];
    for (let i = 0; i < allCells.length; i += 7) {
      weeks.push(allCells.slice(i, i + 7));
    }
    
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-center">ش</th>
            <th className="p-1 text-center">ی</th>
            <th className="p-1 text-center">د</th>
            <th className="p-1 text-center">س</th>
            <th className="p-1 text-center">چ</th>
            <th className="p-1 text-center">پ</th>
            <th className="p-1 text-center">ج</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={`week-${weekIndex}`}>
              {week.map((day, dayIndex) => (
                <td key={`day-${weekIndex}-${dayIndex}`} className="p-1 text-center">
                  {day ? (
                    <button
                      type="button"
                      onClick={() => handleDateSelect(day as number)}
                      className={`w-8 h-8 rounded-full focus:outline-none ${
                        value && value.jy === year && value.jm === month && value.jd === day
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  
  const handleDateSelect = (day: number) => {
    const selectedDate = { jy: year, jm: month, jd: day };
    onChange(selectedDate);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-right">
          <Calendar className="ml-2 h-4 w-4" />
          {value ? (
            <span>
              {value.jy}/{value.jm}/{value.jd}
            </span>
          ) : (
            <span>{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto pointer-events-auto" align="start">
        <div className="p-3 rtl">
          <div className="flex justify-between items-center mb-2">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              &lt;
            </button>
            <div className="font-bold">
              {shamsiMonths[month - 1]} {year}
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="p-1 rounded hover:bg-gray-200"
              type="button"
            >
              &gt;
            </button>
          </div>
          {renderCalendar()}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShamsiDatePicker;

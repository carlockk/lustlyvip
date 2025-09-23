"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DatePicker({
  value,
  onChange,
  onClose,
  minDate,
  className = "",
  locale = "es",
}) {
  const containerRef = useRef(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const min = useMemo(() => (minDate ? startOfDay(new Date(minDate)) : today), [minDate, today]);
  const [current, setCurrent] = useState(() => {
    try {
      return value ? startOfDay(new Date(value)) : today;
    } catch {
      return today;
    }
  });

  const [selected, setSelected] = useState(() => {
    try {
      return value ? startOfDay(new Date(value)) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const onClick = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        onClose && onClose();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  const year = current.getFullYear();
  const month = current.getMonth(); // 0-11
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let dayCounter = 1 - startWeekday; // fill leading blanks
  while (dayCounter <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const thisDate = new Date(year, month, dayCounter);
      const inCurrent = thisDate.getMonth() === month;
      const disabled = startOfDay(thisDate) < min;
      week.push({ inCurrent, date: thisDate, disabled });
      dayCounter++;
    }
    weeks.push(week);
  }

  const monthNames = locale === "en"
    ? ["January","February","March","April","May","June","July","August","September","October","November","December"]
    : ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const weekdayNames = locale === "en"
    ? ["Su","Mo","Tu","We","Th","Fr","Sa"]
    : ["Do","Lu","Ma","Mi","Ju","Vi","Sa"];

  const goPrev = () => setCurrent(new Date(year, month - 1, 1));
  const goNext = () => setCurrent(new Date(year, month + 1, 1));

  const pick = (d) => {
    if (!d || d.disabled || !d.inCurrent) return;
    setSelected(startOfDay(d.date));
    onChange && onChange(fmtISO(d.date));
    onClose && onClose();
  };

  return (
    <div ref={containerRef} className={`rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={goPrev} className="px-2 py-1 rounded hover:bg-gray-700 text-gray-200" aria-label="Prev">‹</button>
        <div className="text-gray-100 font-semibold">{monthNames[month]} {year}</div>
        <button onClick={goNext} className="px-2 py-1 rounded hover:bg-gray-700 text-gray-200" aria-label="Next">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-1">
        {weekdayNames.map((w) => (
          <div key={w} className="text-center">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="contents">
            {week.map((d, di) => {
              const isToday = fmtISO(d.date) === fmtISO(today);
              const isSelected = selected && fmtISO(d.date) === fmtISO(selected);
              return (
                <button
                  key={di}
                  onClick={() => pick(d)}
                  disabled={d.disabled || !d.inCurrent}
                  className={
                    `h-8 rounded text-sm ${
                      !d.inCurrent ? 'text-gray-600' : d.disabled ? 'text-gray-500' : 'text-gray-100'
                    } ${isSelected ? 'bg-pink-600 text-white' : isToday ? 'border border-pink-600' : 'hover:bg-gray-700'} `
                  }
                >
                  {d.inCurrent ? d.date.getDate() : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}


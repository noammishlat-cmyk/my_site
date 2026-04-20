"use client";

import { useEffect, useState } from "react";
import { useOptions } from "../options";

const timeZone = "Asia/Jerusalem";

export default function IsraelTime() {
  const { hebrew_font } = useOptions();
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();

      // Format Time
      const israelTime = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);

      // Format Date (e.g., 20/04/2026)
      const israelDate = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      setTime(israelTime);
      setDate(israelDate);
    };

    updateDateTime();
    const timer = window.setInterval(updateDateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`fixed bottom-0 left-0 right-0 flex justify-center gap-4 bg-zinc-900/80 text-white text-sm px-4 py-2 backdrop-blur-sm ${hebrew_font.className} font-semibold`}>
      <div className="flex items-center gap-4">
        <span>{date}</span>
        <span>{time}</span>
        <span>:הזמן כרגע</span>
      </div>
    </div>
  );
}
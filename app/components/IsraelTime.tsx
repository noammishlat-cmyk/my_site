"use client";

import { useEffect, useState } from "react";
import { useOptions } from "../options";

const timeZone = "Asia/Jerusalem";

export default function IsraelTime() {
  const { hebrew_font } = useOptions();
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const israelTime = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date());
      setTime(israelTime);
    };

    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`fixed bottom-0 left-0 right-0 flex justify-center bg-zinc-900 text-white text-sm px-4 py-2 backdrop-blur-sm ${hebrew_font.className} font-semibold`}>
      <span className="ml-2">{time}</span>&nbsp;: הזמן כרגע
    </div>
  );
}

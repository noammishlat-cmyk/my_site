"use client";

import IsraelTime from "./components/IsraelTime";
import Link from "next/link";
import Image from "next/image"
import { useOptions } from "./options";
import { useRouter } from "next/navigation";


export default function Home() {
  const router = useRouter();
  const { bgColor, hebrew_font, user } = useOptions();

  if (!user) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center font-sans bg-black">
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          לחץ כדי להתחבר
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans" style={{ backgroundColor: bgColor }}>
      <Link href="/settings" className="fixed top-6 right-6 text-white hover:text-gray-300 transition-colors">
        <Image className="invert" src="/gear.svg" width="32" height="32" alt="Settings" />
      </Link>
      <main className="flex w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-zinc sm:items-start">
        <h1 className={`flex self-center py-10 text-6xl font-bold ${hebrew_font.className}`}> שם </h1>
        <button 
          className={`self-center-safe px-6 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors ${hebrew_font.className}`}
          onClick={() => router.push("/money_report")}
        >
          דוח עלויות
        </button>
      </main>
      <IsraelTime />
    </div>
  );
}



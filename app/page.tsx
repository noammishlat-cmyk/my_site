"use client";

import IsraelTime from "./components/IsraelTime";
import Login from "./components/Login";
import Link from "next/link";
import Image from "next/image"
import { useOptions } from "./options";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion"


export default function Home() {
  const router = useRouter();
  const {hebrew_font, user } = useOptions();

  if (!user) {
    return (
      <Login/>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans bg-gradient-to-br from-amber-600 to-pink-800">
      <motion.button 
        className="fixed top-6 right-6 bg-zinc-800 p-4 rounded-2xl"
        onClick={() => router.push("/settings")}
        whileHover={{ scale: 1.05, filter: "brightness(1.3)" }}>
        <Image className="invert" src="/gear.svg" width="32" height="32" alt="Settings" />
      </motion.button>
      <main className="flex w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-zinc sm:items-start">
        <h1 className={`flex self-center py-10 text-6xl font-bold text-center ${hebrew_font.className}`}> ALINOAM </h1>
        <div className="flex w-full max-w-3xl flex-col items-center justify-between bg-zinc py-16 sm:items-start gap-8">
          <button 
            className={`self-center-safe px-6 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors ${hebrew_font.className}`}
            onClick={() => router.push("/money_report")}
          >
            דוח עלויות
          </button>
          <button 
            className={`self-center-safe px-6 py-3 bg-blue-500 text-white rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors ${hebrew_font.className}`}
            onClick={() => router.push("/dates")}
          >
            דייטים
          </button>
        </div>
      </main>
      <IsraelTime />
    </div>
  );
}



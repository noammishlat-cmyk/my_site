"use client";

import { useOptions } from "../options";
import Login from "../components/Login";
import Image from "next/image";
import IsraelTime from "../components/IsraelTime";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Settings() {
  const router = useRouter();
  const { logout, user } = useOptions();
  
  // Split the word correctly for Hebrew
  const titleLetters = "הגדרות".split("");

  if (!user) return <Login />;

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#050408] overflow-hidden text-white">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Back Button */}
      <motion.button
        onClick={() => router.push("/")}
        className="fixed top-6 right-6 z-250"
        style={{
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 14,
        }}
        whileHover={{ scale: 1.08, filter: 'brightness(1.4)' }}
        whileTap={{ scale: 0.95 }}
      >
        <Image className="invert opacity-70" src="/back_arrow.svg" width="24" height="24" alt="Back" />
      </motion.button>

      {/* Corrected Staggered Hebrew Title */}
      <div className="flex flex-row space-x-1 mb-12" dir="rtl">
        {titleLetters.map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10, rotateX: 90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ 
              type: "spring", 
              damping: 12, 
              stiffness: 100, 
              delay: i * 0.1 
            }}
            className="text-4xl font-black bg-gradient-to-b from-white via-amber-200 to-amber-600 bg-clip-text text-transparent"
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Simple Settings Space */}
      <div className="flex flex-col space-y-6 w-full max-w-xs items-center">
        <div className="w-full h-[1px] bg-white/10" />
        {/* You can add simple text settings here later */}
      </div>

      {/* Logout Button */}
      <motion.button
        className="mt-12 px-10 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500 hover:text-white transition-all"
        onClick={() => { router.push("/"); logout(); }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        התנתק
      </motion.button>

      <div className="fixed bottom-10 opacity-20 text-xs">
        <IsraelTime />
      </div>
    </main>
  );
}
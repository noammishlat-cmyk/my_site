"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LogIn() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.button
        onClick={() => router.push("/login")}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          // Subtle breathing glow loop
          boxShadow: [
            "0px 0px 20px rgba(59, 130, 246, 0.1)",
            "0px 0px 35px rgba(59, 130, 246, 0.3)",
            "0px 0px 20px rgba(59, 130, 246, 0.1)"
          ]
        }}
        transition={{ 
          boxShadow: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          duration: 0.8 
        }}
        whileHover={{ 
          scale: 1.05, 
          letterSpacing: "2px",
        }}
        whileTap={{ scale: 0.98 }}
        className="group relative px-12 py-5 bg-white/5 backdrop-blur-md border border-white/20 text-white rounded-2xl text-xl font-light tracking-widest overflow-visible"
      >
        {/* 1. Animated Inner Shine - Moves across the button */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
            animate={{ x: ['-150%', '150%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
          />
        </div>

        {/* 2. Colorful Inner Glow on Hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600/20 via-transparent to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* 3. The Text and Icon */}
        <span className="relative z-10 flex items-center gap-4">
          <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent group-hover:from-white group-hover:to-amber-200 transition-all">
            לחץ כדי להתחבר
          </span>
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-amber-400 text-2xl"
          >
            ←
          </motion.span>
        </span>

        {/* 4. Outer Border "Neon" Glow - Appears on hover */}
        <div className="absolute -inset-[2px] bg-gradient-to-r from-blue-500 via-cyan-400 to-amber-400 rounded-2xl opacity-0 group-hover:opacity-60 blur-md transition-opacity duration-500 -z-10" />
        
        {/* 5. Sharp Border Gradient */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-500/50 to-amber-500/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      </motion.button>
    </div>
  );
}
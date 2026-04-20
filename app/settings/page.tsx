"use client";

import { useOptions } from "../options";
import Login from "../components/Login";
import Link from "next/link";
import Image from "next/image";
import IsraelTime from "../components/IsraelTime";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion"


export default function Settings() {
  const router = useRouter();

  const { logout, user } = useOptions();

  function handleLogout() {
    router.push("/");
    logout();
  }

  if (!user) {
    return (
      <Login/>
    );
  }

  return (
    <main>
      <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-zinc-900">
        <motion.button 
          className="fixed top-6 right-6 bg-zinc-800 p-4 rounded-2xl"
          onClick={() => router.push("/")}
          whileHover={{ scale: 1.05, filter: "brightness(1.3)" }}>
          <Image className="invert" src="/back_arrow.svg" width="32" height="32" alt="Back" />
        </motion.button>
        <h1 className="absolute text-2xl font-bold mb-8 top-8">: הגדרות</h1>
        <div className="flex flex-col space-y-8 py-8">
          
        </div>
        <motion.button
        className="absolute bottom-14 w-32 h-10 bg-red-500 text-white rounded mt-6"
        onClick={handleLogout}
        whileHover={{ scale: 1.1, filter: "brightness(1.5)" }}>
          התנתק
        </motion.button>
      </div>
      <IsraelTime />
    </main>
  );
}

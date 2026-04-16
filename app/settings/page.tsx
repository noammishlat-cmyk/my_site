"use client";

import { useOptions } from "../options";
import Link from "next/link";
import Image from "next/image";
import IsraelTime from "../components/IsraelTime";
import { useRouter } from "next/navigation";

export default function Settings() {
  const router = useRouter();

  const { bgColor, setBgColor, logout, user } = useOptions();

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setBgColor(color);
  };

  function handleLogout() {
    router.push("/");
    logout();
  }

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
    <main>
      <div className="flex flex-col items-center justify-center min-h-screen p-8" style={{ backgroundColor: bgColor }}>
        <Link href="/" className="fixed top-6 right-6 text-white hover:text-gray-300 transition-colors">
          <Image className="invert" src="/back_arrow.svg" width="32" height="32" alt="Back" />
        </Link>
        <h1 className="absolute text-2xl font-bold mb-8 top-8">: הגדרות</h1>
        <div className="flex flex-row justify-items-center space-x-6">
            <input
            id="bgColor"
            type="color"
            value={bgColor}
            onChange={handleColorChange}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          />
          <label htmlFor="bgColor" className="text-lg">
            : צבע רקע אתר
          </label>
        </div>
        <button className="absolute bottom-14 w-32 h-10 bg-red-500 text-white rounded mt-6" onClick={handleLogout}>
          התנתק
        </button>
      </div>
      <IsraelTime />
    </main>
  );
}

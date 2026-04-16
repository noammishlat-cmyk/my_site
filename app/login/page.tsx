"use client";

import { useState } from "react";
import { useOptions } from "../options";
import { useRouter } from "next/navigation";

export default function Login() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const { login } = useOptions();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const email = `${name.replace(/\s+/g, '').toLowerCase()}@app.local`;
      await login(email, phone);
      router.push("/");
    } catch {
      setError('.ההתחברות נכשלה, וודא שהנתונים נכונים');
    }
  };

  return (
    <div dir="rtl" className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8">התחבר לאתר</h1>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-full max-w-md">
        <input
          type="text"
          placeholder="שם"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-4 py-2 border rounded"
          required
        />
        <input
          type="tel"
          dir="rtl"
          placeholder="מס פלאפון"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="px-4 py-2 border rounded"
          required
        />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
          התחבר
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </form>
    </div>
  );
}

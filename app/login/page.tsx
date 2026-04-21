"use client";
import { useState, useEffect, useRef } from "react";
import { useOptions } from "../options";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// --- BACKGROUND COMPONENTS ---

const GrainOverlay = () => (
  <div 
    className="fixed inset-0 pointer-events-none z-[1] opacity-[0.03]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
    }}
  />
);

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let stars: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        speed: 0.2 + Math.random() * 0.5,
        drift: Math.random() * 0.5 - 0.25,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      stars.forEach((s) => {
        s.y -= s.speed;
        s.x += Math.sin(s.phase) * s.drift;
        s.phase += 0.01;
        if (s.y < 0) s.y = canvas.height;
        
        const twinkle = (Math.sin(s.phase) + 1) / 2;
        ctx.globalAlpha = 0.3 + twinkle * 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 bg-neutral-950" />;
};

const Orbs = () => {
  const colors = ["bg-pink-500/20", "bg-purple-500/20", "bg-amber-500/20", "bg-blue-500/20"];
  return (
    <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none">
      {colors.map((color, i) => (
        <motion.div
          key={i}
          className={`absolute w-[40vw] h-[40vw] rounded-full blur-[120px] ${color}`}
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -100, 50, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            left: `${10 + i * 20}%`,
            top: `${20 + i * 10}%`,
          }}
        />
      ))}
    </div>
  );
};

const StaggeredTitle = () => {
  const title = "ALINOAM".split("");
  
  return (
    <div className="flex space-x-1 mb-8" dir="ltr">
      {title.map((char, i) => {
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: -50, rotateX: 90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{
              type: "spring",
              damping: 12,
              stiffness: 100,
              delay: i * 0.1,
            }}
            className="text-5xl font-black tracking-tighter bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(to bottom, 
                hsl(45, 100%, ${30 + i * 3}%), 
                hsl(45, 100%, ${50 + i * 3}%), 
                hsl(35, 100%, ${90 + i * 3}%)
              )`,
              WebkitBackgroundClip: "text",
            }}
          >
            {char}
          </motion.span>
        );
      })}
    </div>
  );
};

// --- MAIN LOGIN COMPONENT ---

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
      const email = `${name.replace(/\s+/g, "").toLowerCase()}@app.local`;
      await login(email, phone);
      router.push("/");
    } catch {
      setError(".ההתחברות נכשלה, וודא שהנתונים נכונים");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <StarField />
      <Orbs />
      <GrainOverlay />

      <div className="z-10 w-full max-w-md px-6 py-12 flex flex-col items-center">
        <StaggeredTitle />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl"
        >
          <motion.h2 className="text-white/70 text-center mb-8 text-lg font-light">
            התחברות למערכת
          </motion.h2>

          <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
            <div className="relative">
              <input
                type="text"
                dir="rtl"
                placeholder="שם פרטי"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                required
              />
            </div>
            
            <div className="relative">
              <input
                type="tel"
                dir="rtl"
                placeholder="מספר פלאפון"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 bg-white/10 border border-white/20 text-white font-medium rounded-lg backdrop-blur-md shadow-lg transition-colors hover:border-yellow-500/50"
            >
              התחבר
            </motion.button>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-sm text-center pt-2"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
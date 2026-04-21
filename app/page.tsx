"use client";

import IsraelTime from "./components/IsraelTime";
import Login from "./components/Login";
import Image from "next/image";
import { useOptions } from "./options";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useFirebaseLogic } from "./components/FirebaseLogic";
import { useEffect, useRef } from "react";

// ─── Floating particle canvas ──────────────────────────────────────────────

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width  = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // Generate stars
    const stars = Array.from({ length: 120 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.18 + 0.04,
      drift: (Math.random() - 0.5) * 0.12,
      pulse: Math.random() * Math.PI * 2, // phase offset
    }));

    let frame = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;

      for (const s of stars) {
        // Gentle twinkling
        const twinkle = Math.sin(frame * 0.018 + s.pulse) * 0.25;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 230, 180, ${s.alpha + twinkle})`;
        ctx.fill();

        // Drift upward, wrap around
        s.y -= s.speed;
        s.x += s.drift;
        if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
        if (s.x < -4) s.x = W + 4;
        if (s.x > W + 4) s.x = -4;
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", opacity: 0.7,
      }}
    />
  );
}

// ─── Animated gradient orbs ─────────────────────────────────────────────────

const ORBS = [
  { size: 700, x: "-10%", y: "-15%", color: "rgba(200, 80, 120, 0.18)",  dur: 18 },
  { size: 550, x: "55%",  y: "10%",  color: "rgba(120, 60, 200, 0.14)",  dur: 24 },
  { size: 480, x: "20%",  y: "55%",  color: "rgba(212, 140, 50, 0.11)",  dur: 20 },
  { size: 400, x: "70%",  y: "60%",  color: "rgba(80,  160, 220, 0.09)", dur: 28 },
];

function Orbs() {
  return (
    <>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          animate={{
            x: [0, 30, -20, 15, 0],
            y: [0, -25, 20, -10, 0],
            scale: [1, 1.08, 0.96, 1.04, 1],
          }}
          transition={{
            duration: o.dur, repeat: Infinity,
            ease: "easeInOut", delay: i * 2.5,
          }}
          style={{
            position: "fixed",
            width: o.size, height: o.size,
            left: o.x, top: o.y,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            pointerEvents: "none", zIndex: 0,
            filter: "blur(2px)",
          }}
        />
      ))}
    </>
  );
}

// ─── Nav card data ──────────────────────────────────────────────────────────

const NAV_CARDS = [
  {
    route: "/money_report",
    icon:  "💸",
    label: "דוח עלויות",
    sub:   "הוצאות חודשיות",
    accent: "#e8a060",
    glow:   "rgba(232, 160, 96, 0.22)",
    border: "rgba(232, 160, 96, 0.28)",
    grad:   "linear-gradient(135deg, rgba(232,160,96,0.12) 0%, rgba(200,90,80,0.08) 100%)",
  },
  {
    route: "/dates",
    icon:  "💫",
    label: "דייטים",
    sub:   "מציאון הדייטים",
    accent: "#c8627a",
    glow:   "rgba(200, 98, 122, 0.22)",
    border: "rgba(200, 98, 122, 0.28)",
    grad:   "linear-gradient(135deg, rgba(200,98,122,0.12) 0%, rgba(120,60,200,0.08) 100%)",
  },
];

// ─── Title letters stagger ──────────────────────────────────────────────────

const TITLE = "ALINOAM";

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const { hebrew_font } = useOptions();
  const { authLoading, currentUser } = useFirebaseLogic();

  if (authLoading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{ background: "#09080f" }}
      >
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ color: "#d4a853", fontSize: 18, letterSpacing: "0.15em" }}
        >
          טוען...
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, #1c0e30 0%, #09080f 70%)",
        }}
      >
        <StarField />
        <Orbs />
        <div style={{ position: "relative", zIndex: 10 }}>
          <Login />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *,*::before,*::after { box-sizing: border-box; }
        body { background: #09080f !important; }
      `}</style>

      {/* ── Layered background ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: "radial-gradient(ellipse 100% 60% at 50% 0%, #1d0b2e 0%, #09080f 65%)",
      }} />
      <StarField />
      <Orbs />

      {/* ── Grain texture overlay ── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.45,
      }} />

      <div
        dir="rtl"
        className={hebrew_font.className}
        style={{
          position: "relative", zIndex: 10,
          minHeight: "100vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px 20px 80px",
        }}
      >
        {/* Settings button */}
        <motion.button
          onClick={() => router.push("/settings")}
          className="fixed top-6 right-6 z-250"
          style={{
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 14,
          }}
          whileHover={{ scale: 1.08, filter: 'brightness(1.4)' }}
          whileTap={{ scale: 0.95 }}
        >
          <Image className="invert" src="/gear.svg" width="28" height="28" alt="Settings" />
        </motion.button>

        {/* ── Title ── */}
        <motion.div
          style={{ textAlign: "center", marginBottom: 16 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Glowing subtitle above */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: 16,
              color: "#d4a853",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            ✦ ברוכים הבאים ✦
          </motion.p>

          {/* Staggered title letters */}
          <div dir="ltr" style={{ display: "flex", justifyContent: "center", gap: 2 }}>
            {TITLE.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: -40, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  delay: 0.5 + i * 0.08,
                  duration: 0.6,
                  type: "spring",
                  stiffness: 180,
                  damping: 18,
                }}
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(52px, 13vw, 96px)",
                  fontWeight: 300,
                  letterSpacing: "0.06em",
                  color: "#f0e8d8",
                  lineHeight: 1,
                  display: "inline-block",
                  // Subtle golden shimmer on the middle letters
                  background: i >= 2 && i <= 4
                    ? "linear-gradient(180deg, #f0e8d8 40%, #d4a853 100%)"
                    : undefined,
                  WebkitBackgroundClip: i >= 2 && i <= 4 ? "text" : undefined,
                  WebkitTextFillColor: i >= 2 && i <= 4 ? "transparent" : undefined,
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* Decorative rule */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.8, ease: "easeOut" }}
            style={{
              margin: "20px auto 0",
              width: 180,
              height: 1,
              background: "linear-gradient(90deg, transparent, #d4a853, rgba(200,98,122,0.8), transparent)",
            }}
          />
        </motion.div>

        {/* ── Nav cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.7, ease: "easeOut" }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
            maxWidth: 380,
            marginTop: 52,
          }}
        >
          {NAV_CARDS.map((card, i) => (
            <motion.button
              key={card.route}
              onClick={() => router.push(card.route)}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.25 + i * 0.15, duration: 0.55, type: "spring", stiffness: 160, damping: 20 }}
              whileHover={{
                scale: 1.03,
                boxShadow: `0 12px 48px ${card.glow}`,
                borderColor: card.accent,
              }}
              whileTap={{ scale: 0.97 }}
              style={{
                background: card.grad,
                border: `1px solid ${card.border}`,
                borderRadius: 20,
                padding: "22px 28px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 20,
                textAlign: "right",
                boxShadow: `0 4px 24px ${card.glow}`,
                transition: "box-shadow 0.25s, border-color 0.25s",
              }}
            >
              {/* Icon */}
              <motion.span
                animate={{ rotate: [0, -6, 6, -3, 0] }}
                transition={{ duration: 3.5, delay: 2 + i * 0.8, repeat: Infinity, repeatDelay: 5 }}
                style={{ fontSize: 38, flexShrink: 0, lineHeight: 1 }}
              >
                {card.icon}
              </motion.span>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 26, fontWeight: 400,
                  color: "#f0e8d8", lineHeight: 1.1,
                  marginBottom: 4,
                }}>
                  {card.label}
                </div>
                <div style={{
                  fontSize: 12, letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: card.accent, fontWeight: 500,
                }}>
                  {card.sub}
                </div>
              </div>

              {/* Arrow */}
              <motion.span
                style={{
                  color: card.accent, fontSize: 22,
                  opacity: 0.7, flexShrink: 0,
                  fontFamily: "sans-serif",
                  // Flip for RTL (arrow should point left = ←)
                  display: "inline-block",
                  transform: "scaleX(-1)",
                }}
              >
                →
              </motion.span>
            </motion.button>
          ))}
        </motion.div>

        {/* ── Israel time ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          style={{ marginTop: 48 }}
          dir="ltr"
        >
          <IsraelTime />
        </motion.div>
      </div>
    </>
  );
}
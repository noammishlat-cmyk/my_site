"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import EmojiPicker from "../components/EmojiPicker";
import { useOptions } from '../options';
import {
  useFirebaseLogic,
  SeedDateItem,
  SeedDateCategory,
} from "../components/FirebaseLogic";
import ConfirmDialog from '../components/ConfirmDialog';
import IsraelTime from "../components/IsraelTime";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_H  = 76;
const REPEATS = 40;

// ─── Seed Data ────────────────────────────────────────────────────────────────

const DATE_SEEDS: SeedDateItem[] = [];

const CATEGORY_SEEDS: SeedDateCategory[] = [
  { id: "romantic",  label: "רומנטי",  color: "#e87080", emoji: "🌹" },
  { id: "adventure", label: "הרפתקה", color: "#60c896", emoji: "🏔️" },
  { id: "cozy",      label: "נוח",     color: "#a090e8", emoji: "🧸" },
  { id: "food",      label: "אוכל",   color: "#e8a060", emoji: "🍽️" },
];

const COLOR_PALETTE = [
  "#e87080", "#c8627a", "#d4a853", "#e8a060",
  "#60c896", "#7ab87a", "#60b4e8", "#7ab8b8",
  "#a090e8", "#b87ab8", "#e8e060", "#60e8c8",
];

// ─── Star field canvas ────────────────────────────────────────────────────────

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

    const COLORS: Record<string, string> = {
      purple: "rgba(160,144,232,",
      pink:   "rgba(200,98,122,",
      gold:   "rgba(212,168,83,",
    };

    const stars = Array.from({ length: 130 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.55 + 0.1,
      speed: Math.random() * 0.14 + 0.03,
      drift: (Math.random() - 0.5) * 0.1,
      pulse: Math.random() * Math.PI * 2,
      hue:   Math.random() < 0.45 ? "purple" : Math.random() < 0.6 ? "pink" : "gold",
    }));

    let frame = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      for (const s of stars) {
        const twinkle = Math.sin(frame * 0.018 + s.pulse) * 0.22;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[s.hue] + (s.alpha + twinkle) + ")";
        ctx.fill();
        s.y -= s.speed;
        s.x += s.drift;
        if (s.y < -4)    { s.y = H + 4; s.x = Math.random() * W; }
        if (s.x < -4)      s.x = W + 4;
        if (s.x > W + 4)   s.x = -4;
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 0,
      pointerEvents: "none", opacity: 0.65,
    }} />
  );
}

// ─── Animated orbs ────────────────────────────────────────────────────────────

const ORBS = [
  { size: 620, x: "-8%",  y: "-12%", color: "rgba(180,70,110,0.14)",  dur: 22 },
  { size: 480, x: "58%",  y: "8%",   color: "rgba(90,70,200,0.11)",   dur: 28 },
  { size: 400, x: "22%",  y: "50%",  color: "rgba(212,140,60,0.07)",  dur: 20 },
  { size: 350, x: "68%",  y: "58%",  color: "rgba(160,100,200,0.09)", dur: 32 },
];

function Orbs() {
  return (
    <>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          animate={{ x:[0,22,-16,10,0], y:[0,-18,16,-7,0], scale:[1,1.07,0.96,1.04,1] }}
          transition={{ duration:o.dur, repeat:Infinity, ease:"easeInOut", delay:i*2.2 }}
          style={{
            position:"fixed", width:o.size, height:o.size,
            left:o.x, top:o.y, borderRadius:"50%",
            background:`radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            pointerEvents:"none", zIndex:0, filter:"blur(2px)",
          }}
        />
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DatesPage() {
  const router   = useRouter();
  const controls = useAnimation();

  const [pendingDeleteionDateID,       setPendingDeleteionDateID]       = useState("");
  const [pendingDeleteionDateName,     setPendingDeleteionDateName]     = useState("");
  const [pendingDeleteionCatagoryID,   setPendingDeleteionCatagoryID]   = useState("");
  const [pendingDeleteionCatagoryName, setPendingDeleteionCatagoryName] = useState("");

  const { hebrew_font } = useOptions();

  const {
    authLoading, currentUser,
    dateItems, activatedDateItems, dateCategories,
    datesLoading, seedDatesIfEmpty,
    addDateItem, deleteDateItem,
    addDateCategory, deleteDateCategory,
    setDateItemCompleted,
  } = useFirebaseLogic();

  // ── UI state ───────────────────────────────────────────────────────────────

  const [tab,          setTab]       = useState("spin");
  const [spinning,     setSpinning]  = useState(false);
  const [selectedDate, setSelectedDate] = useState<(typeof activatedDateItems)[0] | null>(null);
  const [showResult,   setShowResult]   = useState(false);
  const [spinFilter,   setSpinFilter]   = useState("all");
  const [listFilter,   setListFilter]   = useState("all");
  const [completed,    setCompleted]    = useState(false);

  const [showDeleteDateConfirmDialog,     setShowDeleteDateConfirmDialog]     = useState(false);
  const [showDeleteCatagoryConfirmDialog, setShowDeleteCatagoryConfirmDialog] = useState(false);

  const [showDateModal, setShowDateModal] = useState(false);
  const [newDate,       setNewDate]       = useState({ title:"", emoji:"", category:"romantic", description:"" });

  const [showCatModal,  setShowCatModal]  = useState(false);
  const [newCategory,   setNewCategory]   = useState({ label:"", color:COLOR_PALETTE[0], emoji:"" });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // ── Seed ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading) seedDatesIfEmpty(DATE_SEEDS, CATEGORY_SEEDS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const categoriesMap   = Object.fromEntries(dateCategories.map(c => [c.id, c]));
  const getCategoryById = (id: string) => categoriesMap[id] ?? { label:id, color:"#888888", emoji:undefined };

  const spinDates = spinFilter === "all" ? activatedDateItems : activatedDateItems.filter(d => d.category === spinFilter);
  const listDates = listFilter === "all" ? dateItems          : dateItems.filter(d => d.category === listFilter);
  const reelItems = Array(REPEATS).fill(null).flatMap(() => spinDates);

  useEffect(() => {
    controls.set({ y:0 });
    setShowResult(false);
    setSelectedDate(null);
  }, [spinFilter, controls]);

  // ── Spin ──────────────────────────────────────────────────────────────────

  const spin = useCallback(async () => {
    if (spinning || spinDates.length < 2) return;
    setCompleted(false);
    setSpinning(true);
    setShowResult(false);
    setSelectedDate(null);

    const targetIdx      = Math.floor(Math.random() * spinDates.length);
    const finalGlobalIdx = 10 * spinDates.length + targetIdx;
    const finalY         = ITEM_H * (1 - finalGlobalIdx);

    await controls.set({ y:0 });
    await controls.start({ y:finalY, transition:{ duration:4.5, ease:[0.45,0.05,0.2,1.15] } });

    setSelectedDate(spinDates[targetIdx]);
    setShowResult(true);
    setSpinning(false);
  }, [spinning, spinDates, controls]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddDate = async () => {
    if (!newDate.title.trim()) return;
    const ok = await addDateItem(newDate);
    if (ok) { setNewDate({ title:"", emoji:"", category:dateCategories[0]?.id ?? "romantic", description:"" }); setShowDateModal(false); }
  };

  const handleAddCategory = async () => {
    if (!newCategory.label.trim()) return;
    setCatSubmitting(true);
    const ok = await addDateCategory({ label:newCategory.label, color:newCategory.color, emoji:newCategory.emoji });
    if (ok) setNewCategory({ label:"", color:COLOR_PALETTE[0], emoji:"" });
    setCatSubmitting(false);
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteDateCategory(id);
    if (spinFilter === id) setSpinFilter("all");
    if (listFilter === id) setListFilter("all");
    if (newDate.category === id && dateCategories.length > 1)
      setNewDate(p => ({ ...p, category: dateCategories.find(c => c.id !== id)?.id ?? "all" }));
  };

  const cancelDateDeletion      = () => { setPendingDeleteionDateID(""); setPendingDeleteionDateName(""); setShowDeleteDateConfirmDialog(false); };
  const confirmDateDeletion     = () => { if (pendingDeleteionDateID) deleteDateItem(pendingDeleteionDateID); setShowDeleteDateConfirmDialog(false); };
  const cancelCatagoryDeletion  = () => { setPendingDeleteionCatagoryID(""); setPendingDeleteionCatagoryName(""); setShowDeleteCatagoryConfirmDialog(false); };
  const confirmCatagoryDeletion = () => { if (pendingDeleteionCatagoryID) handleDeleteCategory(pendingDeleteionCatagoryID); setShowDeleteCatagoryConfirmDialog(false); };
  const setCompletedDate        = async () => { if (!selectedDate) return; await setDateItemCompleted(selectedDate.id, true); setCompleted(true); };

  // ── Category chips ────────────────────────────────────────────────────────

  const CategoryChips = ({ value, onChange, size="md" }: { value:string; onChange:(k:string)=>void; size?:"sm"|"md" }) => (
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
      {[{ id:"all", label:"הכל", color:"#d4a853", emoji:"" }, ...dateCategories].map(({ id, label, color, emoji }) => (
        <motion.button key={id} onClick={() => onChange(id)} whileTap={{ scale:0.93 }}
          style={{
            padding: size==="sm" ? "4px 11px" : "6px 14px",
            borderRadius:20,
            border:`1px solid ${value===id ? color : "rgba(255,255,255,0.09)"}`,
            background: value===id ? color+"22" : "transparent",
            color: value===id ? color : "#5a4a72",
            fontSize: size==="sm" ? 12 : 13,
            fontWeight:500, cursor:"pointer",
            transition:"all 0.18s", fontFamily:"inherit",
          }}
        >
          {emoji} {label}
        </motion.button>
      ))}
    </div>
  );

  // ── Auth guards ───────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div dir="rtl" className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{ background:"#09080f" }}>
        <motion.p animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:1.8, repeat:Infinity }}
          style={{ color:"#d4a853", fontSize:18, letterSpacing:"0.12em" }}>
          טוען...
        </motion.p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{ background:"#09080f" }}>
        <p style={{ color:"#f0e8d8", fontSize:18 }}>יש להתחבר כדי לצפות באתר.</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <main className={hebrew_font.className}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #09080f !important; }
        select option { background: #1c1630; color: #f0e8d8; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2a1f3d; border-radius: 2px; }
      `}</style>

      {/* ── Background ── */}
      <div style={{ position:"fixed", inset:0, zIndex:0, background:"radial-gradient(ellipse 90% 55% at 50% 0%, #1c0e30 0%, #09080f 65%)" }} />
      <StarField />
      <Orbs />
      <div style={{
        position:"fixed", inset:0, zIndex:1, pointerEvents:"none",
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity:0.45,
      }} />

      <div dir="rtl" style={{ minHeight:"100vh", position:"relative", zIndex:10, padding:"0 16px 100px", overflow:"hidden" }}>

        {/* Home button */}
        <motion.button onClick={() => router.push("/")} className="fixed top-6 right-6"
          style={{ background:"rgba(255,255,255,0.06)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:16, padding:14, zIndex:20 }}
          whileHover={{ scale:1.08, filter:"brightness(1.4)" }} whileTap={{ scale:0.95 }}>
          <Image className="invert" src="/home_icon.svg" width="28" height="28" alt="Back" />
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.75, ease:"easeOut" }}
          style={{ textAlign:"center", paddingTop:52, paddingBottom:28 }}
        >
          <motion.div
            animate={{ rotate:[0,-8,8,-4,4,0] }}
            transition={{ duration:1.6, delay:0.6, ease:"easeInOut" }}
            style={{ fontSize:42, marginBottom:10, display:"inline-block" }}
          >
            💫
          </motion.div>
          <h1 style={{
            fontFamily:"'Cormorant Garamond', serif",
            fontSize:"clamp(38px, 9vw, 64px)", fontWeight:300,
            letterSpacing:"0.05em", color:"#f0e8d8", lineHeight:1.05,
          }}>
            מציאון הדייטים
          </h1>
          <motion.p
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            transition={{ delay:0.4, duration:0.6 }}
            style={{ marginTop:10, fontFamily:"'Cormorant Garamond', serif", fontStyle:"italic", fontSize:18, color:"#6a5a7a", letterSpacing:"0.02em" }}
          >
            סובב את הגלגל או תבחר מהרשימה
          </motion.p>
          <motion.div
            initial={{ scaleX:0, opacity:0 }} animate={{ scaleX:1, opacity:1 }}
            transition={{ delay:0.6, duration:0.8, ease:"easeOut" }}
            style={{ margin:"16px auto 0", width:160, height:1, background:"linear-gradient(90deg, transparent, #d4a853, rgba(200,98,122,0.8), transparent)" }}
          />
        </motion.div>

        {/* Tab Bar */}
        <motion.div
          initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.25, duration:0.55 }}
          style={{
            display:"flex", gap:4,
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:50, padding:4,
            maxWidth:340, margin:"0 auto 40px",
          }}
        >
          {[{ id:"spin", label:"🎰  סובב" }, { id:"dates", label:"📋  רשימת הדייטים" }].map(({ id, label }) => (
            <motion.button key={id} onClick={() => setTab(id)} whileTap={{ scale:0.96 }}
              style={{
                flex:1, padding:"10px 16px", borderRadius:46,
                border:"none", cursor:"pointer",
                fontSize:14, fontWeight:500, letterSpacing:"0.02em",
                fontFamily:"inherit", transition:"color 0.2s",
                background: tab===id ? "linear-gradient(135deg, #d4a853, #c8627a)" : "transparent",
                color: tab===id ? "#09080f" : "#6a5a7a",
              }}
            >
              {label}
            </motion.button>
          ))}
        </motion.div>

        {/* Loading */}
        {datesLoading && (
          <motion.div animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:1.6, repeat:Infinity }}
            style={{ textAlign:"center", padding:"20px 0", color:"#4a3a5a", fontSize:14 }}>
            טוען...
          </motion.div>
        )}

        {/* Tab content */}
        <div style={{ maxWidth:480, margin:"0 auto" }}>
          <AnimatePresence mode="wait">

            {/* ════ SPIN TAB ════ */}
            {tab === "spin" && (
              <motion.div key="spin"
                initial={{ opacity:0, x:-18 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:18 }} transition={{ duration:0.28 }}>

                <div style={{ marginBottom:28 }}>
                  <CategoryChips value={spinFilter} onChange={setSpinFilter} />
                </div>

                {/* Reel */}
                <div style={{
                  background:"linear-gradient(180deg, #16101f 0%, #100c1a 100%)",
                  border:"1px solid rgba(212,168,83,0.22)",
                  borderRadius:22, overflow:"hidden", position:"relative",
                  marginBottom:28,
                  boxShadow:"0 0 48px rgba(212,168,83,0.05), inset 0 1px 0 rgba(212,168,83,0.1)",
                }}>
                  {["left","right"].map(side => (
                    <div key={side} style={{
                      position:"absolute", [side]:0, top:0, bottom:0, width:44, pointerEvents:"none",
                      background:`linear-gradient(${side==="left"?"90deg":"270deg"}, rgba(212,168,83,0.06) 0%, transparent 100%)`,
                    }} />
                  ))}

                  <div style={{ height:ITEM_H*3, overflow:"hidden", position:"relative" }}>
                    <div style={{
                      position:"absolute", top:ITEM_H, left:0, right:0, height:ITEM_H, zIndex:2,
                      background:"rgba(212,168,83,0.055)",
                      borderTop:"1px solid rgba(212,168,83,0.22)",
                      borderBottom:"1px solid rgba(212,168,83,0.22)",
                      pointerEvents:"none",
                    }} />
                    {["top","bottom"].map(pos => (
                      <div key={pos} style={{
                        position:"absolute", [pos]:0, left:0, right:0,
                        height:ITEM_H*1.25, zIndex:3, pointerEvents:"none",
                        background:`linear-gradient(${pos==="top"?"180deg":"0deg"}, #100c1a 0%, transparent 100%)`,
                      }} />
                    ))}

                    {spinDates.length === 0 ? (
                      <div style={{ height:ITEM_H*3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#4a3a5a", fontWeight:500 }}>
                        אין דייטים בקטגוריה זו
                      </div>
                    ) : (
                      <motion.div animate={controls}>
                        {reelItems.map((date, i) => (
                          <div key={i} style={{ height:ITEM_H, display:"flex", alignItems:"center", justifyContent:"center", gap:14, padding:"0 52px" }}>
                            <span style={{ fontSize:26, flexShrink:0 }}>{date.emoji}</span>
                            <span style={{ fontSize:22, fontWeight:500, letterSpacing:"0.01em", color:"#f0e8d8", textAlign:"center", lineHeight:1.2 }}>
                              {date.title}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Spin button */}
                <div style={{ display:"flex", justifyContent:"center", marginBottom:30 }}>
                  <motion.button
                    onClick={spin} disabled={spinning || spinDates.length < 2}
                    whileHover={!spinning ? { scale:1.05, boxShadow:"0 8px 36px rgba(212,168,83,0.4)" } : {}}
                    whileTap={!spinning ? { scale:0.96 } : {}}
                    style={{
                      background: spinning ? "rgba(212,168,83,0.12)" : "linear-gradient(135deg, #d4a853 0%, #bf9035 50%, #d4a853 100%)",
                      border: spinning ? "1px solid rgba(212,168,83,0.28)" : "none",
                      color: spinning ? "#7a6030" : "#09080f",
                      padding:"16px 52px", borderRadius:50,
                      fontSize:15, fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase",
                      cursor: spinning ? "not-allowed" : "pointer",
                      boxShadow: spinning ? "none" : "0 4px 28px rgba(212,168,83,0.28)",
                      transition:"all 0.3s", fontFamily:"inherit",
                    }}
                  >
                    {spinning ? "מסתובב..." : "🎲  סובב את הגלגל"}
                  </motion.button>
                </div>

                {/* Result card */}
                <AnimatePresence>
                  {showResult && selectedDate && (
                    <motion.div
                      initial={{ opacity:0, scale:0.86, y:22 }}
                      animate={{ opacity:1, scale:1, y:0 }}
                      exit={{ opacity:0, scale:0.9, y:-10 }}
                      transition={{ type:"spring", stiffness:210, damping:22 }}
                      style={{
                        background:"linear-gradient(135deg, rgba(212,168,83,0.09) 0%, rgba(200,98,122,0.07) 100%)",
                        border:"1px solid rgba(212,168,83,0.28)",
                        borderRadius:22, padding:"30px 26px", textAlign:"center",
                        boxShadow:"0 8px 44px rgba(212,168,83,0.07)",
                      }}
                    >
                      <div style={{ fontSize:46, marginBottom:14 }}>{selectedDate.emoji}</div>
                      <div style={{ fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase", color:"#d4a853", marginBottom:8, fontWeight:500 }}>
                        הדייט הנבחר!
                      </div>
                      <h3 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:28, fontWeight:400, color:"#f0e8d8", marginBottom:10, lineHeight:1.2 }}>
                        {selectedDate.title}
                      </h3>
                      <p style={{ color:"#7a6a8a", fontSize:15, lineHeight:1.55, marginBottom:18 }}>
                        {selectedDate.description}
                      </p>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
                        <span style={{
                          padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                          background: getCategoryById(selectedDate.category).color+"22",
                          color: getCategoryById(selectedDate.category).color,
                          border:`1px solid ${getCategoryById(selectedDate.category).color}44`,
                        }}>
                          {getCategoryById(selectedDate.category).label}
                        </span>
                        <motion.button
                          onClick={setCompletedDate}
                          whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                          style={{
                            padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:500,
                            border:"1px solid rgba(255,255,255,0.12)",
                            background: completed ? "rgba(96,200,150,0.15)" : "rgba(255,255,255,0.05)",
                            color: completed ? "#60c896" : "#7a6a8a",
                            cursor:"pointer", transition:"all 0.2s", fontFamily:"inherit",
                          }}
                        >
                          {completed ? "✓ בוצע!" : "סמן כבוצע כדי להוריד את הדייט מהגלגל"}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ════ DATES TAB ════ */}
            {tab === "dates" && (
              <motion.div key="dates"
                initial={{ opacity:0, x:18 }} animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:-18 }} transition={{ duration:0.28 }}>

                {/* Controls row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, gap:10 }}>
                  <span style={{ color:"#4a3a5a", fontSize:14 }}>{listDates.length} דייטים</span>
                  <div style={{ display:"flex", gap:8 }}>
                    <motion.button onClick={() => setShowCatModal(true)}
                      whileHover={{ scale:1.05 }} whileTap={{ scale:0.96 }}
                      style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#9a8aaa", padding:"9px 16px", borderRadius:50, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                      🏷️ קטגוריות
                    </motion.button>
                    <motion.button onClick={() => setShowDateModal(true)}
                      whileHover={{ scale:1.05, boxShadow:"0 6px 24px rgba(212,168,83,0.25)" }} whileTap={{ scale:0.96 }}
                      style={{ background:"linear-gradient(135deg, #d4a853, #c8627a)", border:"none", color:"#09080f", padding:"9px 20px", borderRadius:50, fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 18px rgba(212,168,83,0.2)" }}>
                      + הוסף דייט
                    </motion.button>
                  </div>
                </div>

                {/* Filter */}
                <div style={{ marginBottom:24 }}>
                  <CategoryChips value={listFilter} onChange={setListFilter} size="sm" />
                </div>

                {/* Cards */}
                <motion.div style={{ display:"flex", flexDirection:"column", gap:10 }} layout>
                  <AnimatePresence>
                    {listDates.length === 0 && !datesLoading && (
                      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                        style={{ textAlign:"center", padding:"44px 0", fontFamily:"'Cormorant Garamond', serif", fontStyle:"italic", fontSize:20, color:"#4a3a5a" }}>
                        אין דייטים עדיין — הוסיפו אחד!
                      </motion.div>
                    )}
                    {listDates.map((date, i) => (
                      <motion.div key={date.id} layout
                        initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
                        exit={{ opacity:0, x:-40, height:0 }}
                        transition={{ delay:i*0.04, duration:0.24 }}
                        whileHover={{ background:"rgba(255,255,255,0.04)", borderColor:"rgba(255,255,255,0.12)" }}
                        style={{ background:"rgba(255,255,255,0.028)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"13px 15px", display:"flex", alignItems:"center", gap:13, transition:"background 0.2s, border-color 0.2s" }}>
                        <span style={{ fontSize:26, flexShrink:0 }}>{date.emoji}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:18, color:"#f0e8d8", lineHeight:1.2, marginBottom:3, fontWeight:500 }}>{date.title}</div>
                          <div style={{ fontSize:13, color:"#5a4a6a", lineHeight:1.35 }}>{date.description}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
                          <span style={{ fontSize:11, padding:"3px 10px", borderRadius:12, fontWeight:500, whiteSpace:"nowrap", background:getCategoryById(date.category).color+"22", color:getCategoryById(date.category).color }}>
                            {getCategoryById(date.category).label}
                          </span>
                          <div style={{ display:"flex", gap:6, fontWeight:500 }}>
                            <span className="self-center" style={{ color:"#7a6a7a", fontSize:14 }}>בוצע :</span>
                            <motion.button
                              onClick={() => setDateItemCompleted(date.id, !date.completed)}
                              whileHover={{ scale:1.15 }} whileTap={{ scale:0.9 }}
                              style={{
                                background: date.completed ? "rgba(100,255,180,0.1)" : "rgba(255,255,255,0.04)",
                                border:"1px solid", borderColor: date.completed ? "rgba(100,255,180,0.3)" : "rgba(255,255,255,0.08)",
                                color: date.completed ? "#64ffb4" : "#4a3a5a",
                                borderRadius:8, width:28, height:28,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                cursor:"pointer", fontSize:14, transition:"all 0.2s",
                              }}>
                              {date.completed ? "✓" : "O"}
                            </motion.button>
                            <span className="self-center" style={{ color:"#7a6a7a", fontSize:14 }}>מחק :</span>
                            <motion.button
                              onClick={() => { setShowDeleteDateConfirmDialog(true); setPendingDeleteionDateID(date.id); setPendingDeleteionDateName(date.title); }}
                              whileHover={{ scale:1.15, color:"#e87080" }} whileTap={{ scale:0.9 }}
                              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#4a3a5a", borderRadius:8, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:17, lineHeight:1, transition:"color 0.18s" }}>
                              X
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ Confirm Dialogs ═══ */}
        <ConfirmDialog isOpen={showDeleteDateConfirmDialog} title="האם ברצונך למחוק את הדייט?"
          message={`האם ברצונך למחוק את הדייט : ${pendingDeleteionDateName}`}
          confirmText="אישור" cancelText="ביטול" onConfirm={confirmDateDeletion} onCancel={cancelDateDeletion} isDangerous />
        <ConfirmDialog isOpen={showDeleteCatagoryConfirmDialog} title="האם ברצונך למחוק את הקטגוריה?"
          message={`האם ברצונך למחוק את הקטגוריה : ${pendingDeleteionCatagoryName}.       הדייטים ישמרו, אבל יהיו חסרי צבע ואמוג'ים`}
          confirmText="אישור" cancelText="ביטול" onConfirm={confirmCatagoryDeletion} onCancel={cancelCatagoryDeletion} isDangerous />

        {/* ═══ Add Date Modal ═══ */}
        <AnimatePresence>
          {showDateModal && (
            <Modal onClose={() => setShowDateModal(false)}>
              <ModalTitle>הוספת דייט חדש</ModalTitle>
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <EmojiPicker value={newDate.emoji} onChange={emoji => setNewDate(p => ({ ...p, emoji }))} />
                <div style={{ flex:1 }}>
                  <Label>כותרת</Label>
                  <Input placeholder="לדוגמא - ערב קוקטיילים" value={newDate.title} onChange={e => setNewDate(p => ({ ...p, title:e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <Label>תיאור</Label>
                <Input placeholder="תיאור קצר ומובן…" value={newDate.description} onChange={e => setNewDate(p => ({ ...p, description:e.target.value }))} />
              </div>
              <div style={{ marginBottom:24 }}>
                <Label>קטגוריה</Label>
                <select value={newDate.category} onChange={e => setNewDate(p => ({ ...p, category:e.target.value }))}
                  style={{ width:"100%", background:"#1c1630", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 14px", color:"#f0e8d8", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
                  {dateCategories.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              <ModalActions onCancel={() => setShowDateModal(false)} onConfirm={handleAddDate} confirmLabel="הוסף דייט ✨" />
            </Modal>
          )}
        </AnimatePresence>

        {/* ═══ Categories Modal ═══ */}
        <AnimatePresence>
          {showCatModal && (
            <Modal onClose={() => setShowCatModal(false)}>
              <ModalTitle>ניהול קטגוריות</ModalTitle>
              {dateCategories.length > 0 && (
                <div style={{ marginBottom:22 }}>
                  <Label>קטגוריות קיימות</Label>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                    {dateCategories.map(cat => (
                      <div key={cat.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"8px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:12, height:12, borderRadius:"50%", background:cat.color, flexShrink:0 }} />
                          <span style={{ color:"#d0c8e0", fontSize:14 }}>
                            {cat.emoji && <span style={{ marginLeft:6 }}>{cat.emoji}</span>}
                            {cat.label}
                          </span>
                        </div>
                        <motion.button
                          onClick={() => { setShowDeleteCatagoryConfirmDialog(true); setPendingDeleteionCatagoryID(cat.id); setPendingDeleteionCatagoryName(cat.label); }}
                          whileHover={{ scale:1.1, color:"#e87080" }} whileTap={{ scale:0.9 }}
                          style={{ background:"transparent", border:"none", color:"#4a3a5a", cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px", transition:"color 0.18s" }}>
                          ×
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", marginBottom:18, paddingTop:18 }}>
                <Label>הוסף קטגוריה חדשה</Label>
              </div>
              <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                <div style={{ width:52 }}>
                  <EmojiPicker value={newCategory.emoji} onChange={emoji => setNewCategory(p => ({ ...p, emoji }))} />
                </div>
                <div style={{ flex:1 }}>
                  <Label>שם קטגוריה</Label>
                  <Input placeholder="לדוגמא: ספורט" value={newCategory.label} onChange={e => setNewCategory(p => ({ ...p, label:e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom:22 }}>
                <Label>צבע</Label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
                  {COLOR_PALETTE.map(color => (
                    <motion.button key={color} onClick={() => setNewCategory(p => ({ ...p, color }))}
                      whileHover={{ scale:1.15 }} whileTap={{ scale:0.95 }}
                      style={{ width:28, height:28, borderRadius:"50%", background:color, border:"none", cursor:"pointer", outline:newCategory.color===color?`3px solid ${color}`:"3px solid transparent", outlineOffset:2, transition:"outline 0.15s" }} />
                  ))}
                </div>
              </div>
              <ModalActions onCancel={() => setShowCatModal(false)} onConfirm={handleAddCategory} confirmLabel={catSubmitting ? "...מוסיף" : "הוסף קטגוריה"} disabled={catSubmitting} />
            </Modal>
          )}
        </AnimatePresence>

      </div>

      <div style={{ position:"relative", zIndex:10 }}>
        <IsraelTime />
      </div>
    </main>
  );
}

// ─── Modal primitives ──────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(9,8,15,0.88)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <motion.div
        initial={{ scale:0.87, y:30 }} animate={{ scale:1, y:0 }} exit={{ scale:0.87, y:30 }}
        transition={{ type:"spring", stiffness:240, damping:24 }}
        style={{ background:"#130f20", border:"1px solid rgba(212,168,83,0.2)", borderRadius:24, padding:"30px 26px", width:"100%", maxWidth:420, boxShadow:"0 28px 80px rgba(0,0,0,0.65)", maxHeight:"85vh", overflowY:"auto" }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:26, fontWeight:400, color:"#f0e8d8", marginBottom:22, textAlign:"center" }}>
      {children}
    </h3>
  );
}

function ModalActions({ onCancel, onConfirm, confirmLabel, disabled=false }: { onCancel:()=>void; onConfirm:()=>void; confirmLabel:string; disabled?:boolean }) {
  return (
    <div style={{ display:"flex", gap:10 }}>
      <motion.button whileHover={{ scale:1.05, color:"#e87080" }} whileTap={{ scale:0.96 }} onClick={onCancel}
        style={{ flex:1, padding:"12px", borderRadius:12, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#5a4a6a", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
        ביטול
      </motion.button>
      <motion.button onClick={onConfirm} disabled={disabled}
        whileHover={!disabled ? { scale:1.03 } : {}} whileTap={!disabled ? { scale:0.97 } : {}}
        style={{ flex:2, padding:"12px", borderRadius:12, border:"none", background:disabled?"rgba(212,168,83,0.2)":"linear-gradient(135deg, #d4a853, #c8627a)", color:disabled?"#7a6030":"#09080f", fontSize:15, fontWeight:500, cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
        {confirmLabel}
      </motion.button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:11, letterSpacing:"0.09em", textTransform:"uppercase", color:"#5a4a6a", marginBottom:6, fontWeight:500 }}>
      {children}
    </div>
  );
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={{ width:"100%", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 14px", color:"#f0e8d8", fontSize:15, transition:"border-color 0.2s", fontFamily:"inherit", outline:"none", ...style }}
      onFocus={e => (e.target.style.borderColor = "rgba(212,168,83,0.5)")}
      onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
      {...props}
    />
  );
}
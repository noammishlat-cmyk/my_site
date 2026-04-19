"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_H  = 76;   // px — height of each slot reel item
const REPEATS = 6;    // how many times the date list is duplicated in the reel

// ─── Default Data ─────────────────────────────────────────────────────────────

const DEFAULT_DATES = [
  { id:  1, title: "ארוחת ערב עם נרות",  emoji: "🕯️", category: "romantic",  description: "לבשל יחד עם יין ומוזיקה רכה" },
  { id:  2, title: "הליכה בשקיעה",               emoji: "🌅", category: "adventure", description: "מצאו מסלול מקומי עם נוף עוצר נשימה" },
  { id:  3, title: "מרטון סרטים",            emoji: "🎬", category: "cozy",      description: "בחרו במאי וצפו בכל מה שהוא יצר" },
  { id:  4, title: "שוק איכרים + בראנץ'",   emoji: "🌸", category: "food",      description: "בקרו בספקים מקומיים, בישלו משהו ביחד" },
  { id:  5, title: "לילה יין & גבינות",       emoji: "🍷", category: "romantic",  description: "צור מגוון טעימות עם התאמות המועדפות עליך" },
  { id:  6, title: "משחק קופסה",         emoji: "🎲", category: "cozy",      description: "כיף תחרותי - מפסיד שוטף כלים" },
  { id:  7, title: "פיקניק כוכבים",         emoji: "⭐", category: "romantic",  description: "שמיכות, חטיפים וכל שמי הלילה" },
  { id:  8, title: "שיעור בישול משותף",    emoji: "👨‍🍳", category: "food",      description: "למדו מטבח חדש והתרשמו מעצמכם" },
  { id:  9, title: "קייאקים",        emoji: "🚣", category: "adventure", description: "חקרו נתיבי מים והעמידו פנים שאתם חוקרים" },
  { id: 10, title: "מוזאון + קפה",         emoji: "🎨", category: "culture",   description: "קבלו השראה, ואז תווכחו על פרשנויות תוך כדי קפה" },
  { id: 11, title: "ספרייה",            emoji: "📚", category: "culture",   description: "בקרו בכל חנות ספרים, בחרו ספר אחד לשני" },
  { id: 12, title: "ליל ספא בבית",         emoji: "🛁", category: "cozy",      description: "מסכות פנים, מלחי אמבט, הרפיה מוחלטת" },
];

const CATEGORIES = {
  all:       { label: "הכל",       color: "#d4a853" },
  romantic:  { label: "רומנטי",  color: "#e87080" },
  adventure: { label: "הרפתקה", color: "#60c896" },
  cozy:      { label: "נוח",      color: "#a090e8" },
  food:      { label: "אוכל",    color: "#e8a060" },
  culture:   { label: "תרבות",   color: "#60b4e8" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DatesPage() {
  const [tab,          setTab]          = useState("spin");
  const [dates,        setDates]        = useState(DEFAULT_DATES);
  const [spinning,     setSpinning]     = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showResult,   setShowResult]   = useState(false);
  const [spinFilter,   setSpinFilter]   = useState("all");
  const [listFilter,   setListFilter]   = useState("all");
  const [showModal,    setShowModal]    = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [newDate,      setNewDate]      = useState({
    title: "", emoji: "✨", category: "romantic", description: ""
  });
  const controls = useAnimation();

  // Derived
  const spinDates   = spinFilter === "all" ? dates : dates.filter(d => d.category === spinFilter);
  const listDates   = listFilter === "all" ? dates : dates.filter(d => d.category === listFilter);
  const reelItems   = Array(REPEATS).fill(null).flatMap(() => spinDates);

  // Reset reel when spin filter changes
  useEffect(() => {
    controls.set({ y: 0 });
    setShowResult(false);
    setSelectedDate(null);
  }, [spinFilter, controls]);

  // ── Slot-machine spin ──────────────────────────────────────────────────────
  const spin = useCallback(async () => {
    if (spinning || spinDates.length < 2) return;
    setSpinning(true);
    setShowResult(false);
    setSelectedDate(null);

    const targetIdx       = Math.floor(Math.random() * spinDates.length);
    // Land in the 5th repetition (index 4, 0-based) so there is plenty of reel before it
    const finalGlobalIdx  = 4 * spinDates.length + targetIdx;
    // y value that places finalGlobalIdx in the centre slot of the 3-slot window:
    //   centreSlotTop = ITEM_H  →  y = -(finalGlobalIdx * ITEM_H) + ITEM_H
    const finalY          = ITEM_H * (1 - finalGlobalIdx);

    // Phase-1 landing spot: end of 2nd repetition — always less negative than finalY
    const phase1GlobalIdx = 2 * spinDates.length - 1;
    const phase1Y         = ITEM_H * (1 - phase1GlobalIdx);

    await controls.set({ y: 0 });

    // Phase 1 — sprint (easeIn)
    await controls.start({
      y: phase1Y,
      transition: { duration: 1.0, ease: [0.42, 0, 1.0, 1.0] },
    });

    // Phase 2 — decelerate to stop (heavy ease-out for that satisfying slot-machine thud)
    await controls.start({
      y: finalY,
      transition: { duration: 2.8, ease: [0.0, 0.75, 0.2, 1.0] },
    });

    setSelectedDate(spinDates[targetIdx]);
    setShowResult(true);
    setSpinning(false);
  }, [spinning, spinDates, controls]);

  // ── List helpers ───────────────────────────────────────────────────────────
  const addDate = () => {
    if (!newDate.title.trim()) return;
    setDates(p => [...p, { ...newDate, id: Date.now() }]);
    setNewDate({ title: "", emoji: "✨", category: "romantic", description: "" });
    setShowModal(false);
  };

  const removeDate = (id) => setDates(p => p.filter(d => d.id !== id));

  const copyResult = () => {
    if (!selectedDate) return;
    navigator.clipboard.writeText(`${selectedDate.emoji} ${selectedDate.title} — ${selectedDate.description}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // ── Shared sub-components ─────────────────────────────────────────────────
  const CategoryChips = ({ value, onChange, size = "md" }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {Object.entries(CATEGORIES).map(([key, { label, color }]) => (
        <motion.button
          key={key}
          onClick={() => onChange(key)}
          whileTap={{ scale: 0.93 }}
          style={{
            padding: size === "sm" ? "4px 11px" : "6px 14px",
            borderRadius: 20,
            border: `1px solid ${value === key ? color : "rgba(255,255,255,0.09)"}`,
            background: value === key ? color + "22" : "transparent",
            color: value === key ? color : "#5a4a72",
            fontSize: size === "sm" ? 12 : 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.18s",
            fontFamily: "inherit",
          }}
        >
          {label}
        </motion.button>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Fonts & Global Reset ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #09080f; color: #f0e8d8; font-family: "DM Sans", sans-serif; }
        input, select, button, textarea { font-family: "DM Sans", sans-serif; }
        input::placeholder, textarea::placeholder { color: #4a3a5a; }
        input:focus, select:focus, textarea:focus { outline: none !important; border-color: #d4a853 !important; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #2a1f3d; border-radius: 2px; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 90% 55% at 50% 0%, #1c0e30 0%, #09080f 65%)",
        padding: "0 16px 100px",
        position: "relative",
        overflow: "hidden",
      }}
      dir="rtl">

        {/* ── Ambient glow orbs ── */}
        {[
          { top:"8%",  left:"10%",  size:360, color:"rgba(180,70,110,0.07)"  },
          { top:"18%", right:"8%",  size:280, color:"rgba(90,70,200,0.06)"   },
          { top:"55%", left:"30%",  size:320, color:"rgba(212,140,60,0.04)"  },
        ].map((o, i) => (
          <div key={i} style={{
            position:"fixed", width:o.size, height:o.size, pointerEvents:"none",
            top:o.top, left:o.left, right:o.right,
            background:`radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          }} />
        ))}

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          style={{ textAlign: "center", paddingTop: 52, paddingBottom: 28 }}
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
            transition={{ duration: 1.6, delay: 0.6, ease: "easeInOut" }}
            style={{ fontSize: 42, marginBottom: 10, display: "inline-block" }}
          >
            💫
          </motion.div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(38px, 9vw, 64px)",
            fontWeight: 300,
            letterSpacing: "0.05em",
            color: "#f0e8d8",
            lineHeight: 1.05,
          }}>
            מציאון הדייטים
          </h1>
          <p style={{
            marginTop: 10,
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 18,
            color: "#6a5a7a",
            letterSpacing: "0.02em",
          }}>
            סובב את הגלגל או תבחר מהרשימה
          </p>
        </motion.div>

        {/* ── Tab Bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55 }}
          style={{
            display: "flex", gap: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 50, padding: 4,
            maxWidth: 340, margin: "0 auto 40px",
          }}
        >
          {[
            { id: "spin",  label: "🎰  סובב" },
            { id: "dates", label: "📋  רשימת הדייטים" },
          ].map(({ id, label }) => (
            <motion.button
              key={id}
              onClick={() => setTab(id)}
              whileTap={{ scale: 0.96 }}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: 46,
                border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 500, letterSpacing: "0.02em",
                transition: "color 0.2s",
                background: tab === id
                  ? "linear-gradient(135deg, #d4a853, #c8627a)"
                  : "transparent",
                color: tab === id ? "#09080f" : "#6a5a7a",
              }}
            >
              {label}
            </motion.button>
          ))}
        </motion.div>

        {/* ── Tab Content ── */}
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <AnimatePresence mode="wait">

            {/* ════════════════ SPIN TAB ════════════════ */}
            {tab === "spin" && (
              <motion.div
                key="spin"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.28 }}
              >
                {/* Category filter */}
                <div style={{ marginBottom: 28 }}>
                  <CategoryChips value={spinFilter} onChange={setSpinFilter} />
                </div>

                {/* ── Slot-machine reel ── */}
                <div style={{
                  background: "linear-gradient(180deg, #16101f 0%, #100c1a 100%)",
                  border: "1px solid rgba(212,168,83,0.22)",
                  borderRadius: 22,
                  overflow: "hidden",
                  position: "relative",
                  marginBottom: 28,
                  boxShadow: "0 0 48px rgba(212,168,83,0.05), inset 0 1px 0 rgba(212,168,83,0.1)",
                }}>
                  {/* Left / right gold edge sheen */}
                  {["left","right"].map(side => (
                    <div key={side} style={{
                      position:"absolute", [side]:0, top:0, bottom:0, width:44, pointerEvents:"none",
                      background:`linear-gradient(${side==="left"?"90deg":"270deg"}, rgba(212,168,83,0.06) 0%, transparent 100%)`,
                    }} />
                  ))}

                  {/* Visible reel window */}
                  <div style={{
                    height: ITEM_H * 3,
                    overflow: "hidden",
                    position: "relative",
                  }}>
                    {/* Centre-slot highlight band */}
                    <div style={{
                      position:"absolute", top:ITEM_H, left:0, right:0, height:ITEM_H, zIndex:2,
                      background:"rgba(212,168,83,0.055)",
                      borderTop:"1px solid rgba(212,168,83,0.22)",
                      borderBottom:"1px solid rgba(212,168,83,0.22)",
                      pointerEvents:"none",
                    }} />
                    {/* Top / bottom fades */}
                    {["top","bottom"].map(pos => (
                      <div key={pos} style={{
                        position:"absolute", [pos]:0, left:0, right:0,
                        height: ITEM_H * 1.25, zIndex:3, pointerEvents:"none",
                        background:`linear-gradient(${pos==="top"?"180deg":"0deg"}, #100c1a 0%, transparent 100%)`,
                      }} />
                    ))}

                    {/* Items */}
                    {spinDates.length === 0 ? (
                      <div style={{
                        height: ITEM_H * 3, display:"flex", alignItems:"center", justifyContent:"center",
                        fontFamily:"'Cormorant Garamond', serif", fontStyle:"italic",
                        fontSize:18, color:"#4a3a5a",
                      }}>
                        No dates in this category
                      </div>
                    ) : (
                      <motion.div animate={controls}>
                        {reelItems.map((date, i) => (
                          <div key={i} style={{
                            height: ITEM_H, display:"flex", alignItems:"center",
                            justifyContent:"center", gap:14, padding:"0 52px",
                          }}>
                            <span style={{ fontSize:26, flexShrink:0 }}>{date.emoji}</span>
                            <span style={{
                              fontFamily:"'Cormorant Garamond', serif",
                              fontSize:20, fontWeight:400, letterSpacing:"0.01em",
                              color:"#f0e8d8", textAlign:"center", lineHeight:1.2,
                            }}>
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
                    onClick={spin}
                    disabled={spinning || spinDates.length < 2}
                    whileHover={!spinning ? { scale: 1.05 } : {}}
                    whileTap={!spinning ? { scale: 0.96 } : {}}
                    style={{
                      background: spinning
                        ? "rgba(212,168,83,0.12)"
                        : "linear-gradient(135deg, #d4a853 0%, #bf9035 50%, #d4a853 100%)",
                      border: spinning ? "1px solid rgba(212,168,83,0.28)" : "none",
                      color: spinning ? "#7a6030" : "#09080f",
                      padding: "16px 52px", borderRadius:50,
                      fontSize:15, fontWeight:500,
                      letterSpacing:"0.07em", textTransform:"uppercase",
                      cursor: spinning ? "not-allowed" : "pointer",
                      boxShadow: spinning ? "none" : "0 4px 28px rgba(212,168,83,0.28)",
                      transition:"all 0.3s",
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
                      animate={{ opacity:1, scale:1,    y:0  }}
                      exit={{   opacity:0, scale:0.9,   y:-10 }}
                      transition={{ type:"spring", stiffness:210, damping:22 }}
                      style={{
                        background:"linear-gradient(135deg, rgba(212,168,83,0.09) 0%, rgba(200,98,122,0.07) 100%)",
                        border:"1px solid rgba(212,168,83,0.28)",
                        borderRadius:22, padding:"30px 26px",
                        textAlign:"center",
                        boxShadow:"0 8px 44px rgba(212,168,83,0.07)",
                        position:"relative",
                      }}
                    >
                      <div style={{ fontSize:46, marginBottom:14 }}>{selectedDate.emoji}</div>
                      <div style={{
                        fontSize:11, letterSpacing:"0.18em",
                        textTransform:"uppercase", color:"#d4a853",
                        marginBottom:8, fontWeight:500,
                      }}>
                        הדייט הנבחר!
                      </div>
                      <h3 style={{
                        fontFamily:"'Cormorant Garamond', serif",
                        fontSize:28, fontWeight:400,
                        color:"#f0e8d8", marginBottom:10, lineHeight:1.2,
                      }}>
                        {selectedDate.title}
                      </h3>
                      <p style={{
                        color:"#7a6a8a", fontSize:15, lineHeight:1.55, marginBottom:18,
                      }}>
                        {selectedDate.description}
                      </p>

                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexWrap:"wrap" }}>
                        <span style={{
                          padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                          background: CATEGORIES[selectedDate.category]?.color + "22",
                          color: CATEGORIES[selectedDate.category]?.color,
                          border:`1px solid ${CATEGORIES[selectedDate.category]?.color}44`,
                        }}>
                          {CATEGORIES[selectedDate.category]?.label}
                        </span>

                        <motion.button
                          onClick={copyResult}
                          whileHover={{ scale:1.05 }}
                          whileTap={{ scale:0.95 }}
                          style={{
                            padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                            border:"1px solid rgba(255,255,255,0.12)",
                            background: copied ? "rgba(96,200,150,0.15)" : "rgba(255,255,255,0.05)",
                            color: copied ? "#60c896" : "#7a6a8a",
                            cursor:"pointer", transition:"all 0.2s",
                          }}
                        >
                          {copied ? "✓ הועתק!" : "📋 העתק"}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ════════════════ DATES TAB ════════════════ */}
            {tab === "dates" && (
              <motion.div
                key="dates"
                initial={{ opacity:0, x:18 }}
                animate={{ opacity:1, x:0  }}
                exit={{   opacity:0, x:-18 }}
                transition={{ duration: 0.28 }}
              >
                {/* Controls row */}
                <div style={{
                  display:"flex", alignItems:"center",
                  justifyContent:"space-between", marginBottom:20,
                }}>
                  <span style={{ color:"#4a3a5a", fontSize:14 }}>
                    {listDates.length} idea{listDates.length !== 1 ? "s" : ""}
                  </span>
                  <motion.button
                    onClick={() => setShowModal(true)}
                    whileHover={{ scale:1.05 }}
                    whileTap={{ scale:0.96 }}
                    style={{
                      background:"linear-gradient(135deg, #d4a853, #c8627a)",
                      border:"none", color:"#09080f",
                      padding:"9px 20px", borderRadius:50,
                      fontSize:14, fontWeight:500, cursor:"pointer",
                    }}
                  >
                    + הוסף דייט
                  </motion.button>
                </div>

                {/* List category filter */}
                <div style={{ marginBottom:24 }}>
                  <CategoryChips value={listFilter} onChange={setListFilter} size="sm" />
                </div>

                {/* Date cards */}
                <motion.div style={{ display:"flex", flexDirection:"column", gap:10 }} layout>
                  <AnimatePresence>
                    {listDates.length === 0 && (
                      <motion.div
                        initial={{ opacity:0 }} animate={{ opacity:1 }}
                        style={{
                          textAlign:"center", padding:"40px 0",
                          fontFamily:"'Cormorant Garamond', serif",
                          fontStyle:"italic", fontSize:18, color:"#4a3a5a",
                        }}
                      >
                        No dates here yet — add one!
                      </motion.div>
                    )}
                    {listDates.map((date, i) => (
                      <motion.div
                        key={date.id}
                        layout
                        initial={{ opacity:0, y:16 }}
                        animate={{ opacity:1, y:0  }}
                        exit={{ opacity:0, x:-40, height:0 }}
                        transition={{ delay: i * 0.04, duration: 0.24 }}
                        style={{
                          background:"rgba(255,255,255,0.028)",
                          border:"1px solid rgba(255,255,255,0.07)",
                          borderRadius:14, padding:"13px 15px",
                          display:"flex", alignItems:"center", gap:13,
                        }}
                      >
                        <span style={{ fontSize:26, flexShrink:0 }}>{date.emoji}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{
                            fontFamily:"'Cormorant Garamond', serif",
                            fontSize:18, color:"#f0e8d8", lineHeight:1.2, marginBottom:3,
                          }}>
                            {date.title}
                          </div>
                          <div style={{ fontSize:13, color:"#5a4a6a", lineHeight:1.35 }}>
                            {date.description}
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
                          <span style={{
                            fontSize:11, padding:"3px 10px", borderRadius:12, fontWeight:500,
                            whiteSpace:"nowrap",
                            background: CATEGORIES[date.category]?.color + "22",
                            color: CATEGORIES[date.category]?.color,
                          }}>
                            {CATEGORIES[date.category]?.label}
                          </span>
                          <motion.button
                            onClick={() => removeDate(date.id)}
                            whileHover={{ scale:1.15, color:"#e87080" }}
                            whileTap={{ scale:0.9 }}
                            style={{
                              background:"rgba(255,255,255,0.04)",
                              border:"1px solid rgba(255,255,255,0.08)",
                              color:"#4a3a5a", borderRadius:8,
                              width:28, height:28,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              cursor:"pointer", fontSize:17, lineHeight:1,
                              transition:"color 0.18s",
                            }}
                          >
                            ×
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Add-Date Modal ── */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              exit={{ opacity:0 }}
              onClick={e => e.target === e.currentTarget && setShowModal(false)}
              style={{
                position:"fixed", inset:0, zIndex:100,
                background:"rgba(9,8,15,0.88)",
                backdropFilter:"blur(10px)",
                display:"flex", alignItems:"center",
                justifyContent:"center", padding:24,
              }}
            >
              <motion.div
                initial={{ scale:0.87, y:30 }}
                animate={{ scale:1,    y:0  }}
                exit={{ scale:0.87,    y:30 }}
                transition={{ type:"spring", stiffness:240, damping:24 }}
                style={{
                  background:"#130f20",
                  border:"1px solid rgba(212,168,83,0.2)",
                  borderRadius:24, padding:"30px 26px",
                  width:"100%", maxWidth:420,
                  boxShadow:"0 28px 80px rgba(0,0,0,0.65)",
                }}
              >
                <h3 style={{
                  fontFamily:"'Cormorant Garamond', serif",
                  fontSize:26, fontWeight:400,
                  color:"#f0e8d8", marginBottom:22, textAlign:"center",
                }}>
                  הוספת דייט חדש
                </h3>

                {/* Emoji + Title row */}
                <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                  <div style={{ width:72 }}>
                    <Label>אמוג'י</Label>
                    <Input
                      value={newDate.emoji} maxLength={2}
                      onChange={e => setNewDate(p => ({ ...p, emoji: e.target.value }))}
                      style={{ textAlign:"center", fontSize:22 }}
                    />
                  </div>
                  <div style={{ flex:1 }}>
                    <Label>כותרת</Label>
                    <Input
                      placeholder="לדוגמא - ערב קוקטיילים"
                      value={newDate.title}
                      onChange={e => setNewDate(p => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <Label>תיאור</Label>
                  <Input
                    placeholder="תיאור קצר ומובן…"
                    value={newDate.description}
                    onChange={e => setNewDate(p => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div style={{ marginBottom:24 }}>
                  <Label>קטגוריה</Label>
                  <select
                    value={newDate.category}
                    onChange={e => setNewDate(p => ({ ...p, category: e.target.value }))}
                    style={{
                      width:"100%", background:"#1c1630",
                      border:"1px solid rgba(255,255,255,0.1)",
                      borderRadius:10, padding:"11px 14px",
                      color:"#f0e8d8", fontSize:15, cursor:"pointer",
                    }}
                  >
                    {Object.entries(CATEGORIES)
                      .filter(([k]) => k !== "all")
                      .map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                  </select>
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      flex:1, padding:"12px", borderRadius:12,
                      border:"1px solid rgba(255,255,255,0.1)",
                      background:"transparent", color:"#5a4a6a",
                      fontSize:15, cursor:"pointer",
                    }}
                  >
                    ביטול
                  </button>
                  <motion.button
                    onClick={addDate}
                    whileHover={{ scale:1.03 }}
                    whileTap={{ scale:0.97 }}
                    style={{
                      flex:2, padding:"12px", borderRadius:12,
                      border:"none",
                      background:"linear-gradient(135deg, #d4a853, #c8627a)",
                      color:"#09080f", fontSize:15, fontWeight:500, cursor:"pointer",
                    }}
                  >
                    הוסף דייט ✨
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <div style={{
      fontSize:11, letterSpacing:"0.09em", textTransform:"uppercase",
      color:"#5a4a6a", marginBottom:6, fontWeight:500,
    }}>
      {children}
    </div>
  );
}

function Input({ style, ...props }) {
  return (
    <input
      style={{
        width:"100%", background:"rgba(255,255,255,0.04)",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:10, padding:"11px 14px",
        color:"#f0e8d8", fontSize:15, transition:"border-color 0.2s",
        ...style,
      }}
      {...props}
    />
  );
}
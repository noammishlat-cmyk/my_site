"use client";

import { useState, useCallback, useEffect } from "react";
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

// ─── Seed Data (used only if Firebase collections are empty) ──────────────────

const DATE_SEEDS: SeedDateItem[] = [

];

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DatesPage() {
  const router   = useRouter();
  const controls = useAnimation();

  const [pendingDeleteionDateID, setPendingDeleteionDateID] = useState("")
  const [pendingDeleteionDateName, setPendingDeleteionDateName] = useState("")

  const [pendingDeleteionCatagoryID, setPendingDeleteionCatagoryID] = useState("")
  const [pendingDeleteionCatagoryName, setPendingDeleteionCatagoryName] = useState("")

  const { hebrew_font } = useOptions();

  const {
    authLoading,
    currentUser,
    dateItems,
    activatedDateItems,
    dateCategories,
    datesLoading,
    seedDatesIfEmpty,
    addDateItem,
    deleteDateItem,
    addDateCategory,
    deleteDateCategory,
    setDateItemCompleted,
  } = useFirebaseLogic();

  // ── UI state ───────────────────────────────────────────────────────────────

  const [tab,          setTab]          = useState("spin");
  const [spinning,     setSpinning]     = useState(false);
  const [selectedDate, setSelectedDate] = useState<(typeof activatedDateItems)[0] | null>(null);
  const [showResult,   setShowResult]   = useState(false);
  const [spinFilter,   setSpinFilter]   = useState("all");
  const [listFilter,   setListFilter]   = useState("all");
  const [completed,    setCompleted]       = useState(false);

  const [showDeleteDateConfirmDialog, setShowDeleteDateConfirmDialog] = useState(false);
  const [showDeleteCatagoryConfirmDialog, setShowDeleteCatagoryConfirmDialog] = useState(false);


  // Add date modal
  const [showDateModal, setShowDateModal] = useState(false);
  const [newDate,       setNewDate]       = useState({
    title: "", emoji: "", category: "romantic", description: "",
  });

  // Manage categories modal
  const [showCatModal,  setShowCatModal]  = useState(false);
  const [newCategory,   setNewCategory]   = useState({
    label: "", color: COLOR_PALETTE[0], emoji: "",
  });
  const [catSubmitting, setCatSubmitting] = useState(false);

  // ── Seed on first auth resolve ─────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading) {
      seedDatesIfEmpty(DATE_SEEDS, CATEGORY_SEEDS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const categoriesMap = Object.fromEntries(dateCategories.map((c) => [c.id, c]));

  const getCategoryById = (id: string) =>
    categoriesMap[id] ?? { label: id, color: "#888888", emoji: undefined };

  const spinDates = spinFilter === "all"
    ? activatedDateItems
    : activatedDateItems.filter((d) => d.category === spinFilter);

  const listDates = listFilter === "all"
    ? dateItems
    : dateItems.filter((d) => d.category === listFilter);

  const reelItems = Array(REPEATS).fill(null).flatMap(() => spinDates);

  // ── Reset reel on filter change ────────────────────────────────────────────

  useEffect(() => {
    controls.set({ y: 0 });
    setShowResult(false);
    setSelectedDate(null);
  }, [spinFilter, controls]);

  // ── Spin ───────────────────────────────────────────────────────────────────

  const spin = useCallback(async () => {
    if (spinning || spinDates.length < 2) return;

    setCompleted(false);
    setSpinning(true);
    setShowResult(false);
    setSelectedDate(null);

    const targetIdx = Math.floor(Math.random() * spinDates.length);
    
    // INCREASE LOOPS: 8-10 loops makes it feel much faster
    const loops = 10; 
    const finalGlobalIdx = loops * spinDates.length + targetIdx;
    const finalY = ITEM_H * (1 - finalGlobalIdx);

    // Initial Reset
    await controls.set({ y: 0 });

    // ANIMATION STRATEGY:
    // We use a "backOut" or custom ease to create a heavy spin that settles smoothly
    await controls.start({
      y: finalY,
      transition: {
        duration: 4.5, // Slightly longer to accommodate more loops
        // This ease starts fast and has a slight bounce/overshoot at the end
        ease: [0.45, 0.05, 0.2, 1.15], 
      }
    });

    setSelectedDate(spinDates[targetIdx]);
    setShowResult(true);
    setSpinning(false);
  }, [spinning, spinDates, controls]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAddDate = async () => {
    if (!newDate.title.trim()) return;
    const ok = await addDateItem(newDate);
    if (ok) {
      setNewDate({ title: "", emoji: "", category: dateCategories[0]?.id ?? "romantic", description: "" });
      setShowDateModal(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.label.trim()) return;
    setCatSubmitting(true);
    const ok = await addDateCategory({ label: newCategory.label, color: newCategory.color, emoji: newCategory.emoji});
    if (ok) {
      setNewCategory({ label: "", color: COLOR_PALETTE[0], emoji: "" });
    }
    setCatSubmitting(false);
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteDateCategory(id);
    // Reset active filters if the deleted category was selected
    if (spinFilter === id) setSpinFilter("all");
    if (listFilter === id) setListFilter("all");
    if (newDate.category === id && dateCategories.length > 1) {
      setNewDate((p) => ({
        ...p,
        category: dateCategories.find((c) => c.id !== id)?.id ?? "all",
      }));
    }
  };

  const cancelDateDeletion = async () => {
    setPendingDeleteionDateID("");
    setPendingDeleteionDateName("");
    setShowDeleteDateConfirmDialog(false);
  };
  const confirmDateDeletion = async () => {
    if (pendingDeleteionDateID != "")
    {
      deleteDateItem(pendingDeleteionDateID);
    }
    setShowDeleteDateConfirmDialog(false);
  };

  const cancelCatagoryDeletion = async () => {
    setPendingDeleteionCatagoryID("");
    setPendingDeleteionCatagoryName("");
    setShowDeleteCatagoryConfirmDialog(false);
  };
  const confirmCatagoryDeletion = async () => {
    if (pendingDeleteionCatagoryID != "")
    {
      handleDeleteCategory(pendingDeleteionCatagoryID);
    }
    setShowDeleteCatagoryConfirmDialog(false);
  };


  const setCompletedDate = async () => {
    if (!selectedDate) return;
    await setDateItemCompleted(selectedDate.id, true)
    setCompleted(true);
  };

  // ── CategoryChips (dynamic) ────────────────────────────────────────────────

  const CategoryChips = ({
    value,
    onChange,
    size = "md",
  }: {
    value: string;
    onChange: (key: string) => void;
    size?: "sm" | "md";
  }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {/* Static "all" chip */}
      {[{ id: "all", label: "הכל", color: "#d4a853", emoji: "" }, ...dateCategories].map(({ id, label, color, emoji }) => (
        <motion.button
          key={id}
          onClick={() => onChange(id)}
          whileTap={{ scale: 0.93 }}
          style={{
            padding: size === "sm" ? "4px 11px" : "6px 14px",
            borderRadius: 20,
            border: `1px solid ${value === id ? color : "rgba(255,255,255,0.09)"}`,
            background: value === id ? color + "22" : "transparent",
            color: value === id ? color : "#5a4a72",
            fontSize: size === "sm" ? 12 : 13,
            fontWeight: 500, cursor: "pointer",
            transition: "all 0.18s", fontFamily: "inherit",
          }}
        >
          {emoji} {label}
        </motion.button>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div dir="rtl" className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}>
        <p className="text-lg text-gray-500">טוען...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}>
        <p className="text-lg">יש להתחבר כדי לצפות באתר.</p>
      </div>
    );
  }


  return (
    <main className={`${hebrew_font.className}`}>
      <div
        dir="rtl"
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse 90% 55% at 50% 0%, #1c0e30 0%, #09080f 65%)",
          padding: "0 16px 100px",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* Home button */}
        <motion.button
          onClick={() => router.push("/")}
          className="fixed top-6 right-6 bg-zinc-800 p-4 rounded-2xl"
          whileHover={{ scale: 1.05, filter: "brightness(1.3)" }}
        >
          <Image className="invert" src="/home_icon.svg" width="32" height="32" alt="Back" />
        </motion.button>

        {/* Ambient glow orbs */}
        {[
          { top: "8%",  left: "10%",  size: 360, color: "rgba(180,70,110,0.07)"  },
          { top: "18%", right: "8%",  size: 280, color: "rgba(90,70,200,0.06)"   },
          { top: "55%", left: "30%",  size: 320, color: "rgba(212,140,60,0.04)"  },
        ].map((o, i) => (
          <div key={i} style={{
            position: "fixed", width: o.size, height: o.size, pointerEvents: "none",
            top: o.top, left: "left" in o ? o.left : undefined, right: "right" in o ? o.right : undefined,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
          }} />
        ))}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
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
            fontSize: "clamp(38px, 9vw, 64px)", fontWeight: 300,
            letterSpacing: "0.05em", color: "#f0e8d8", lineHeight: 1.05,
          }}>
            מציאון הדייטים
          </h1>
          <p style={{
            marginTop: 10, fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic", fontSize: 18,
            color: "#6a5a7a", letterSpacing: "0.02em",
          }}>
            סובב את הגלגל או תבחר מהרשימה
          </p>
        </motion.div>

        {/* Tab Bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
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
              key={id} onClick={() => setTab(id)} whileTap={{ scale: 0.96 }}
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

        {/* Loading overlay */}
        {datesLoading && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#4a3a5a", fontSize: 14 }}>
            טוען...
          </div>
        )}

        {/* Tab Content */}
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <AnimatePresence mode="wait">

            {/* ════════════ SPIN TAB ════════════ */}
            {tab === "spin" && (
              <motion.div
                key="spin"
                initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }} transition={{ duration: 0.28 }}
              >
                <div style={{ marginBottom: 28 }}>
                  <CategoryChips value={spinFilter} onChange={setSpinFilter} />
                </div>

                {/* Slot-machine reel */}
                <div style={{
                  background: "linear-gradient(180deg, #16101f 0%, #100c1a 100%)",
                  border: "1px solid rgba(212,168,83,0.22)",
                  borderRadius: 22, overflow: "hidden", position: "relative",
                  marginBottom: 28,
                  boxShadow: "0 0 48px rgba(212,168,83,0.05), inset 0 1px 0 rgba(212,168,83,0.1)",
                }}>
                  {["left", "right"].map((side) => (
                    <div key={side} style={{
                      position: "absolute", [side]: 0, top: 0, bottom: 0,
                      width: 44, pointerEvents: "none",
                      background: `linear-gradient(${side === "left" ? "90deg" : "270deg"}, rgba(212,168,83,0.06) 0%, transparent 100%)`,
                    }} />
                  ))}

                  <div style={{ height: ITEM_H * 3, overflow: "hidden", position: "relative" }}>
                    {/* Centre highlight band */}
                    <div style={{
                      position: "absolute", top: ITEM_H, left: 0, right: 0,
                      height: ITEM_H, zIndex: 2,
                      background: "rgba(212,168,83,0.055)",
                      borderTop: "1px solid rgba(212,168,83,0.22)",
                      borderBottom: "1px solid rgba(212,168,83,0.22)",
                      pointerEvents: "none",
                    }} />
                    {/* Top / bottom fades */}
                    {["top", "bottom"].map((pos) => (
                      <div key={pos} style={{
                        position: "absolute", [pos]: 0, left: 0, right: 0,
                        height: ITEM_H * 1.25, zIndex: 3, pointerEvents: "none",
                        background: `linear-gradient(${pos === "top" ? "180deg" : "0deg"}, #100c1a 0%, transparent 100%)`,
                      }} />
                    ))}

                    {spinDates.length === 0 ? (
                      <div style={{
                        height: ITEM_H * 3, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 18, color: "#4a3a5a", fontWeight: 500,
                      }}>
                        אין דייטים בקטגוריה זו
                      </div>
                    ) : (
                      <motion.div animate={controls}>
                        {reelItems.map((date, i) => (
                          <div key={i} style={{
                            height: ITEM_H, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            gap: 14, padding: "0 52px",
                          }}>
                            <span style={{ fontSize: 26, flexShrink: 0 }}>{date.emoji}</span>
                            <span style={{
                              fontStyle: "normal",
                              fontSize: 22, fontWeight: 500,
                              letterSpacing: "0.01em", color: "#f0e8d8",
                              textAlign: "center", lineHeight: 1.2,
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
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 30 }}>
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
                      padding: "16px 52px", borderRadius: 50,
                      fontSize: 15, fontWeight: 500,
                      letterSpacing: "0.07em", textTransform: "uppercase",
                      cursor: spinning ? "not-allowed" : "pointer",
                      boxShadow: spinning ? "none" : "0 4px 28px rgba(212,168,83,0.28)",
                      transition: "all 0.3s",
                    }}
                  >
                    {spinning ? "מסתובב..." : "🎲  סובב את הגלגל"}
                  </motion.button>
                </div>

                {/* Result card */}
                <AnimatePresence>
                  {showResult && selectedDate && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.86, y: 22 }}
                      animate={{ opacity: 1, scale: 1,    y: 0  }}
                      exit={{   opacity: 0, scale: 0.9,   y: -10 }}
                      transition={{ type: "spring", stiffness: 210, damping: 22 }}
                      style={{
                        background: "linear-gradient(135deg, rgba(212,168,83,0.09) 0%, rgba(200,98,122,0.07) 100%)",
                        border: "1px solid rgba(212,168,83,0.28)",
                        borderRadius: 22, padding: "30px 26px", textAlign: "center",
                        boxShadow: "0 8px 44px rgba(212,168,83,0.07)",
                      }}
                    >
                      <div style={{ fontSize: 46, marginBottom: 14 }}>{selectedDate.emoji}</div>
                      <div style={{
                        fontSize: 11, letterSpacing: "0.18em",
                        textTransform: "uppercase", color: "#d4a853",
                        marginBottom: 8, fontWeight: 500,
                      }}>
                        הדייט הנבחר!
                      </div>
                      <h3 style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 28, fontWeight: 400,
                        color: "#f0e8d8", marginBottom: 10, lineHeight: 1.2,
                      }}>
                        {selectedDate.title}
                      </h3>
                      <p style={{ color: "#7a6a8a", fontSize: 15, lineHeight: 1.55, marginBottom: 18 }}>
                        {selectedDate.description}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{
                          padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                          background: getCategoryById(selectedDate.category).color + "22",
                          color: getCategoryById(selectedDate.category).color,
                          border: `1px solid ${getCategoryById(selectedDate.category).color}44`,
                        }}>
                          {getCategoryById(selectedDate.category).label}
                        </span>

                        <motion.button
                          onClick={setCompletedDate}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          style={{
                            padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: completed ? "rgba(96,200,150,0.15)" : "rgba(255,255,255,0.05)",
                            color: completed ? "#60c896" : "#7a6a8a",
                            cursor: "pointer", transition: "all 0.2s",
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

            {/* ════════════ DATES TAB ════════════ */}
            {tab === "dates" && (
              <motion.div
                key="dates"
                initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.28 }}
              >
                {/* Controls row */}
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 20, gap: 10,
                }}>
                  <span style={{ color: "#4a3a5a", fontSize: 14 }}>
                    {listDates.length} דייטים
                  </span>

                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Manage categories */}
                    <motion.button
                      onClick={() => setShowCatModal(true)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "#9a8aaa", padding: "9px 16px",
                        borderRadius: 50, fontSize: 13,
                        fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      🏷️ קטגוריות
                    </motion.button>

                    {/* Add date */}
                    <motion.button
                      onClick={() => setShowDateModal(true)}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
                      style={{
                        background: "linear-gradient(135deg, #d4a853, #c8627a)",
                        border: "none", color: "#09080f",
                        padding: "9px 20px", borderRadius: 50,
                        fontSize: 14, fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      + הוסף דייט
                    </motion.button>
                  </div>
                </div>

                {/* List category filter */}
                <div style={{ marginBottom: 24 }}>
                  <CategoryChips value={listFilter} onChange={setListFilter} size="sm" />
                </div>

                {/* Date cards */}
                <motion.div style={{ display: "flex", flexDirection: "column", gap: 10 }} layout>
                  <AnimatePresence>
                    {listDates.length === 0 && !datesLoading && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{
                          textAlign: "center", padding: "40px 0",
                          fontStyle: "italic", fontSize: 18, color: "#4a3a5a", fontWeight: 500,
                        }}
                      >
                        אין דייטים עדיין — הוסיפו אחד!
                      </motion.div>
                    )}
                    {listDates.map((date, i) => (
                      <motion.div
                        key={date.id} layout
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40, height: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.24 }}
                        style={{
                          background: "rgba(255,255,255,0.028)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 14, padding: "13px 15px",
                          display: "flex", alignItems: "center", gap: 13,
                        }}
                      >
                        <span style={{ fontSize: 26, flexShrink: 0 }}>{date.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 18, color: "#f0e8d8", lineHeight: 1.2, marginBottom: 3, fontWeight: 500,
                          }}>
                            {date.title}
                          </div>
                          <div style={{ fontSize: 13, color: "#5a4a6a", lineHeight: 1.35 }}>
                            {date.description}
                          </div>
                        </div>
                        <div style={{
                          display: "flex", flexDirection: "column",
                          alignItems: "flex-end", gap: 8, flexShrink: 0,
                        }}>
                          <span style={{
                            fontSize: 11, padding: "3px 10px",
                            borderRadius: 12, fontWeight: 500, whiteSpace: "nowrap",
                            background: getCategoryById(date.category).color + "22",
                            color: getCategoryById(date.category).color,
                          }}>
                            {getCategoryById(date.category).label}
                          </span>

                          <div style={{ display: "flex", gap: 6, fontWeight: 500, }}>
                            <span className="self-center" style={{ color: "#7a6a7a", fontSize: 14 }}>
                              בוצע :
                            </span>
                            <motion.button
                              onClick={() => setDateItemCompleted(date.id, !date.completed)}
                              whileHover={{ scale: 1.15, color: "#64ffb4" }} 
                              whileTap={{ scale: 0.9 }}
                              style={{
                                background: date.completed ? "rgba(100, 255, 180, 0.1)" : "rgba(255,255,255,0.04)",
                                border: "1px solid",
                                borderColor: date.completed ? "rgba(100, 255, 180, 0.3)" : "rgba(255,255,255,0.08)",
                                color: date.completed ? "#64ffb4" : "#4a3a5a",
                                borderRadius: 8,
                                width: 28, height: 28,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", fontSize: 14,
                                transition: "all 0.2s",
                              }}
                            >
                              {date.completed ? "✓" : "O"}
                            </motion.button>
                            <span className="self-center" style={{ color: "#7a6a7a", fontSize: 14 }}>
                              מחק :
                            </span>
                            <motion.button
                              onClick={() => {
                                setShowDeleteDateConfirmDialog(true); 
                                setPendingDeleteionDateID(date.id);
                                setPendingDeleteionDateName(date.title)
                              }}
                              whileHover={{ scale: 1.15, color: "#e87080" }}
                              whileTap={{ scale: 0.9 }}
                              style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                color: "#4a3a5a", borderRadius: 8,
                                width: 28, height: 28,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", fontSize: 17, lineHeight: 1,
                                transition: "color 0.18s",
                              }}
                            >
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

        {/* ═══ Add Date Modal ═══ */}
        <ConfirmDialog
          isOpen={showDeleteDateConfirmDialog}
          title={"האם ברצונך למחוק את הדייט?"}
          message={
            `האם ברצונך למחוק את הדייט : ${pendingDeleteionDateName}`
          }
          confirmText="אישור"
          cancelText="ביטול"
          onConfirm={confirmDateDeletion}
          onCancel={cancelDateDeletion}
          isDangerous={true}
        />
        <AnimatePresence>
          {showDateModal && (
            <Modal onClose={() => setShowDateModal(false)}>
              <ModalTitle>הוספת דייט חדש</ModalTitle>

              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <EmojiPicker
                  value={newDate.emoji}
                  onChange={(emoji) => setNewDate((p) => ({ ...p, emoji }))}
                />
                <div style={{ flex: 1 }}>
                  <Label>כותרת</Label>
                  <Input
                    placeholder="לדוגמא - ערב קוקטיילים"
                    value={newDate.title}
                    onChange={(e) => setNewDate((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <Label>תיאור</Label>
                <Input
                  placeholder="תיאור קצר ומובן…"
                  value={newDate.description}
                  onChange={(e) => setNewDate((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <Label>קטגוריה</Label>
                <select
                  value={newDate.category}
                  onChange={(e) => setNewDate((p) => ({ ...p, category: e.target.value }))}
                  style={{
                    width: "100%", background: "#1c1630",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, padding: "11px 14px",
                    color: "#f0e8d8", fontSize: 15, cursor: "pointer",
                  }}
                >
                  {dateCategories.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>

              <ModalActions
                onCancel={() => setShowDateModal(false)}
                onConfirm={handleAddDate}
                confirmLabel="הוסף דייט ✨"
              />
            </Modal>
          )}
        </AnimatePresence>

        {/* ═══ Manage Categories Modal ═══ */}
        <ConfirmDialog
          isOpen={showDeleteCatagoryConfirmDialog}
          title={"האם ברצונך למחוק את הקטגוריה?"}
          message={
            `האם ברצונך למחוק את הקטגוריה : ${pendingDeleteionCatagoryName}.       הדייטים ישמרו, אבל יהיו חסרי צבע ואמוג'ים`
          }
          confirmText="אישור"
          cancelText="ביטול"
          onConfirm={confirmCatagoryDeletion}
          onCancel={cancelCatagoryDeletion}
          isDangerous={true}
        />
        <AnimatePresence>
          {showCatModal && (
            <Modal onClose={() => setShowCatModal(false)}>
              <ModalTitle>ניהול קטגוריות</ModalTitle>

              {/* Existing categories */}
              {dateCategories.length > 0 && (
                <div style={{ marginBottom: 22 }}>
                  <Label>קטגוריות קיימות</Label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {dateCategories.map((cat) => (
                      <div key={cat.id} style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10, padding: "8px 12px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 12, height: 12, borderRadius: "50%",
                            background: cat.color, flexShrink: 0,
                          }} />
                          <span style={{ color: "#d0c8e0", fontSize: 14 }}>
                            {cat.emoji && <span style={{ marginLeft: 6 }}>{cat.emoji}</span>}
                            {cat.label}
                          </span>
                        </div>
                        <motion.button
                          onClick={() => {
                            setShowDeleteCatagoryConfirmDialog(true); 
                            setPendingDeleteionCatagoryID(cat.id);
                            setPendingDeleteionCatagoryName(cat.label)
                          }}
                          whileHover={{ scale: 1.1, color: "#e87080" }}
                          transition={{ duration: 0.1 }}
                          whileTap={{ scale: 0.9 }}
                          style={{
                            background: "transparent", border: "none",
                            color: "#4a3a5a", cursor: "pointer",
                            fontSize: 18, lineHeight: 1, padding: "0 4px",
                            transition: "color 0.18s",
                          }}
                        >
                          ×
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.07)",
                marginBottom: 18, paddingTop: 18,
              }}>
                <Label>הוסף קטגוריה חדשה</Label>
              </div>

              {/* Name + Emoji */}
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 52 }}>
                  <EmojiPicker
                    value={newCategory.emoji}
                    onChange={(emoji) => setNewCategory((p) => ({ ...p, emoji }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>שם קטגוריה</Label>
                  <Input
                    placeholder="לדוגמא: ספורט"
                    value={newCategory.label}
                    onChange={(e) => setNewCategory((p) => ({ ...p, label: e.target.value }))}
                  />
                </div>
              </div>

              {/* Color palette */}
              <div style={{ marginBottom: 22 }}>
                <Label>צבע</Label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {COLOR_PALETTE.map((color) => (
                    <motion.button
                      key={color}
                      onClick={() => setNewCategory((p) => ({ ...p, color }))}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: color, border: "none", cursor: "pointer",
                        outline: newCategory.color === color
                          ? `3px solid ${color}`
                          : "3px solid transparent",
                        outlineOffset: 2,
                        transition: "outline 0.15s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <ModalActions
                onCancel={() => setShowCatModal(false)}
                onConfirm={handleAddCategory}
                confirmLabel={catSubmitting ? "...מוסיף" : "הוסף קטגוריה"}
                disabled={catSubmitting}
              />
            </Modal>
          )}
        </AnimatePresence>

      </div>
      <IsraelTime />
    </main>
  );
}

// ─── Shared modal primitives ──────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity:0 }}
      animate={{ opacity:1 }}
      exit={{ opacity:0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
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
        {children}
      </motion.div>
    </motion.div>
  );
}


function ModalTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: 26, fontWeight: 400,
      color: "#f0e8d8", marginBottom: 22, textAlign: "center",
    }}>
      {children}
    </h3>
  );
}

function ModalActions({
  onCancel, onConfirm, confirmLabel, disabled = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <motion.button
        whileHover={{ scale: 1.05, color: "#e87080" }} whileTap={{ scale: 0.96 }}
        onClick={onCancel}
        style={{
          flex: 1, padding: "12px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "transparent", color: "#5a4a6a",
          fontSize: 15, cursor: "pointer",
        }}
      >
        ביטול
      </motion.button>
      <motion.button
        onClick={onConfirm}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.03, color: "#feb2da" } : {}}
        transition={{ duration: 0.1 }}
        whileTap={!disabled ? { scale: 0.97 } : {}}
        style={{
          flex: 2, padding: "12px", borderRadius: 12, border: "none",
          background: disabled
            ? "rgba(212,168,83,0.2)"
            : "linear-gradient(135deg, #d4a853, #c8627a)",
          color: disabled ? "#7a6030" : "#09080f",
          fontSize: 15, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {confirmLabel}
      </motion.button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase",
      color: "#5a4a6a", marginBottom: 6, fontWeight: 500,
    }}>
      {children}
    </div>
  );
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={{
        width: "100%", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10, padding: "11px 14px",
        color: "#f0e8d8", fontSize: 15,
        transition: "border-color 0.2s",
        ...style,
      }}
      {...props}
    />
  );
}
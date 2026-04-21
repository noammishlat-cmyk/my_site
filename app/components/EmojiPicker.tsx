"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Emoji data ────────────────────────────────────────────────────────────────

const EMOJI_CATEGORIES = {
  "❤️": {
    label: "רומנטי",
    emojis: ["", "❤️","💕","💖","💗","💘","💝","💞","🌹","🌷","💐","✨","💫","🌟","⭐","🕯️","💍","🥂","🫦","🎻","🎶","🌙","🌌","🌠","💌","🫀"],
  },
  "🍽️": {
    label: "אוכל",
    emojis: ["", "🍽️","🥂","🍷","🍸","🍹","🧆","🥗","🍣","🍜","🍕","🥩","🧁","🍰","🫕","🥘","🫙","🧇","🥞","🍳","🥐","🧀","🍫","🍬","🍦","🧃"],
  },
  "🏕️": {
    label: "הרפתקה",
    emojis: ["", "🏕️","🧗","🚣","🏄","🤿","🪂","🏇","🚵","🎯","🧭","⛺","🗺️","🌋","🏔️","🏞️","🌊","🛶","🎣","🏹","🥾","🪓","🔦","⛵","🛻","🚴"],
  },
  "🎭": {
    label: "תרבות",
    emojis: ["", "🎭","🎨","🖼️","🎬","🎤","🎸","🎹","🎺","🥁","📚","🖋️","🏛️","🎡","🎢","🎪","🎠","🃏","🎲","♟️","🎯","📸","🎥","🎞️","🎤","🎧"],
  },
  "🛋️": {
    label: "נוח",
    emojis: ["", "🛋️","🛁","🧸","🕯️","☕","🍵","🫖","📖","🎮","🧩","🎲","🍿","🧦","🪴","🌿","🧘","💆","🛌","🧴","🕯️","🌙","⭐","🌛","🪵","🔥"],
  },
  "🌍": {
    label: "טיול",
    emojis: ["", "🌍","✈️","🚂","🛳️","🚡","🗼","🗽","🏰","🎡","🏖️","🏝️","⛩️","🕌","🌁","🌄","🌅","🌃","🌆","🌉","🎑","🏟️","🎆","🎇","🛺","🚁"],
  },
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flatMap(c => c.emojis);

// ── Component ─────────────────────────────────────────────────────────────────

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ value, onChange } : EmojiPickerProps) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const [tab,    setTab]    = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const searchRef           = useRef<HTMLInputElement>(null);
  const wrapRef             = useRef<HTMLInputElement>(null);

  const isMobile = typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);


  // Focus search when panel opens
  useEffect(() => {
  if (open) {
      // Only auto-focus if we are NOT on mobile
      if (!isMobile) {
        const timer = setTimeout(() => searchRef.current?.focus(), 80);
        return () => clearTimeout(timer);
      }
    }
  }, [open, isMobile]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayEmojis = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return ALL_EMOJIS.filter(e => {
        // Cast EMOJI_NAMES as a Record to allow string indexing
        const nameMap = EMOJI_NAMES as Record<string, string>;
        return nameMap[e]?.includes(q);
      });
    }
    
    // Cast EMOJI_CATEGORIES to any or a specific record type
    const categories = EMOJI_CATEGORIES as Record<string, { label: string; emojis: string[] }>;
    return categories[tab]?.emojis ?? [];
  }, [search, tab]);

  const pick = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* ── Trigger button ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase",
          color: "#5a4a6a", marginBottom: 6, fontWeight: 500,
        }}>
          אמוג&#39;י
        </div>
        <motion.button
          onClick={() => setOpen(o => !o)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          style={{
            width: 60, height: 60, borderRadius: 14, fontSize: 28,
            background: open ? "rgba(212,168,83,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${open ? "rgba(212,168,83,0.5)" : "rgba(255,255,255,0.1)"}`,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all 0.18s",
          }}
        >
          {value}
        </motion.button>
      </div>

      {/* ── Picker panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -8,  scale: 0.96 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute",
              top: "calc(100% - 8px)",
              right: isMobile ? 0 : "auto",
              left: isMobile ? "auto" : 0,
              zIndex: 200,
              width: "90vw",
              maxWidth: 320,
              background: "#16101f",
              border: "1px solid rgba(212,168,83,0.22)",
              borderRadius: 18,
              boxShadow: "0 16px 60px rgba(0,0,0,0.7)",
              overflow: "hidden",
            }}
          >
            {/* Search */}
            <div style={{ padding: "12px 12px 8px" }}>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  fontSize: 14, pointerEvents: "none", opacity: 0.45,
                }}>🔍</span>
                <input
                  ref={searchRef}
                  placeholder="חפש אמוג'י..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 10, padding: "8px 34px 8px 10px",
                    color: "#f0e8d8", fontSize: 14,
                    outline: "none", fontFamily: "inherit",
                    direction: "rtl",
                  }}
                />
              </div>
            </div>

            {/* Category tabs — only shown when not searching */}
            {!search.trim() && (
              <div style={{
                display: "flex", gap: 2, padding: "0 10px 8px",
                overflowX: "auto",
              }}>
                {Object.entries(EMOJI_CATEGORIES).map(([key, { label }]) => (
                  <motion.button
                    key={key}
                    onClick={() => setTab(key)}
                    whileTap={{ scale: 0.9 }}
                    title={label}
                    style={{
                      flexShrink: 0, padding: "5px 7px", borderRadius: 8, fontSize: 17,
                      border: "none", cursor: "pointer",
                      background: tab === key ? "rgba(212,168,83,0.18)" : "transparent",
                      outline: tab === key ? "1px solid rgba(212,168,83,0.35)" : "none",
                      transition: "background 0.15s",
                    }}
                  >
                    {key}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2, padding: "0 10px 12px",
              maxHeight: 200, overflowY: "auto",
            }}>
              {displayEmojis.length === 0 ? (
                <div style={{
                  gridColumn: "1 / -1", textAlign: "center",
                  padding: "20px 0", color: "#4a3a5a", fontSize: 13,
                  fontStyle: "italic",
                }}>
                  לא נמצאו תוצאות
                </div>
              ) : (
                displayEmojis.map((emoji, i) => (
                  <motion.button
                    key={emoji + i}
                    onClick={() => pick(emoji)}
                    whileHover={{ scale: 1.1, background: "rgba(212,168,83,0.15)" }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      fontSize: emoji === "" ? 14 : 22, // Smaller font if it's text
                      padding: "5px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: value === emoji ? "rgba(212,168,83,0.2)" : "transparent",
                      outline: value === emoji ? "1px solid rgba(212,168,83,0.4)" : "none",
                      transition: "background 0.12s",
                      lineHeight: 1,
                      color: "#f0e8d8", // Ensure text color for the "None" label
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 40
                    }}
                  >
                    {emoji === "" ? "  " : emoji} 
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Emoji name map for search ─────────────────────────────────────────────────
// Maps emoji → space-separated Hebrew + English keywords

const EMOJI_NAMES = {
  "": "ריק empty",
  "❤️": "heart love לב אהבה romantic",
  "💕": "hearts love לב אהבה",
  "💖": "heart sparkle לב",
  "💗": "heart growing לב",
  "💘": "heart arrow cupid לב חץ",
  "💝": "heart ribbon gift לב מתנה",
  "💞": "revolving hearts לב",
  "🌹": "rose flower פרח ורד",
  "🌷": "tulip flower פרח",
  "💐": "bouquet flowers זר פרחים",
  "✨": "sparkles stars ניצוצות כוכבים",
  "💫": "dizzy star כוכב",
  "🌟": "star כוכב",
  "⭐": "star כוכב",
  "🕯️": "candle נר",
  "💍": "ring טבעת",
  "🥂": "champagne wine יין שמפניה",
  "🫦": "lips שפתיים",
  "🎻": "violin כינור",
  "🎶": "music notes מוזיקה",
  "🌙": "moon ירח לילה",
  "🌌": "galaxy milky way גלקסיה",
  "🌠": "shooting star כוכב נופל",
  "💌": "love letter מכתב אהבה",
  "🫀": "heart organ לב",
  "🍽️": "plate food צלחת אוכל",
  "🍷": "wine יין",
  "🍸": "cocktail קוקטייל",
  "🍹": "tropical cocktail קוקטייל",
  "🧆": "falafel פלאפל",
  "🥗": "salad סלט",
  "🍣": "sushi סושי",
  "🍜": "noodles נודלס",
  "🍕": "pizza פיצה",
  "🥩": "steak meat בשר",
  "🧁": "cupcake עוגה",
  "🍰": "cake עוגה",
  "🫕": "pot food סיר אוכל",
  "🥘": "paella food מחבת",
  "🍫": "chocolate שוקולד",
  "🍦": "ice cream גלידה",
  "🏕️": "camping מחנאות",
  "🧗": "climbing טיפוס",
  "🚣": "kayak rowing קיאקים",
  "🏄": "surf גלישה",
  "🤿": "diving צלילה",
  "🪂": "parachute מצנח",
  "🚵": "mountain bike אופניים",
  "🧭": "compass מצפן",
  "⛺": "tent אוהל",
  "🗺️": "map מפה",
  "🌋": "volcano הר געש",
  "🏔️": "mountain הר",
  "🏞️": "park טבע",
  "🌊": "wave ocean גלים ים",
  "🎭": "theater תיאטרון",
  "🎨": "art ציור",
  "🖼️": "painting ציור",
  "🎬": "cinema סרט",
  "🎤": "microphone מיקרופון",
  "🎸": "guitar גיטרה",
  "🎹": "piano פסנתר",
  "📚": "books ספרים",
  "🏛️": "museum מוזאון",
  "🃏": "cards קלפים",
  "🎲": "dice משחק",
  "🛋️": "couch ספה",
  "🛁": "bath אמבט",
  "🧸": "teddy bear דובי",
  "☕": "coffee קפה",
  "🍵": "tea תה",
  "📖": "book ספר",
  "🎮": "games משחק",
  "🧩": "puzzle פאזל",
  "🍿": "popcorn פופקורן",
  "🪴": "plant plant צמח",
  "🌿": "leaf plant עלה צמח",
  "🧘": "yoga meditation מדיטציה",
  "🔥": "fire אש",
  "🌍": "world globe עולם",
  "✈️": "airplane flight טיסה",
  "🚂": "train רכבת",
  "🛳️": "ship ספינה",
  "🏖️": "beach חוף",
  "🏝️": "island אי",
  "🌄": "sunrise שחר",
  "🌅": "sunset שקיעה",
  "🌃": "night city לילה עיר",
  "🎆": "fireworks זיקוקים",
};
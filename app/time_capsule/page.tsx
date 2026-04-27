"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { Plus, Calendar, MapPin, Award, X, Navigation, ChevronRight, ArrowUp, ChevronLeft, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { uploadBytes } from 'firebase/storage';
import { useFirebaseLogic } from "../components/FirebaseLogic";
import { useOptions } from "../options";
import ConfirmDialog from "../components/ConfirmDialog";


// --- Types ---
interface Memory {
  id: string;
  title: string;
  location: string;
  date: Date | any;
  description: string;
  image: string;
  createdBy: string;
}

// --- Background Components ---

const GrainOverlay = () => (
  <div
    className="fixed inset-0 z-[5] pointer-events-none opacity-[0.04]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
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
    let particles: { x: number; y: number; size: number; speed: number; drift: number; phase: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.4 + 0.1,
        drift: Math.random() * 0.4 - 0.2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += Math.sin(p.phase) * p.drift;
        p.phase += 0.01;
        if (p.y < 0) p.y = canvas.height;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        const opacity = (Math.sin(p.phase) + 1) / 2 * 0.7 + 0.3;
        ctx.fillStyle = `rgba(255, 191, 0, ${opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    resize(); draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

const Orbs = () => {
  const colors = ["bg-amber-600/10", "bg-orange-900/20", "bg-yellow-700/10", "bg-stone-800/40"];
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {colors.map((color, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-[100px] ${color}`}
          style={{ width: '80vw', height: '80vw', maxWidth: '600px' }}
          animate={{
            x: [Math.random() * 50, Math.random() * -50, Math.random() * 50],
            y: [Math.random() * 50, Math.random() * -50, Math.random() * 50],
          }}
          transition={{ duration: 10 + i * 5, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
};

// --- Logic Components ---

const StaggeredTitle = ({ text }: { text: string }) => {
  const letters = text.split("");
  return (
    <h1 className="text-5xl md:text-8xl font-serif font-black text-amber-50 flex flex-wrap justify-center overflow-hidden leading-tight">
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: 100, rotateX: -90, opacity: 0 }}
          animate={{ y: 0, rotateX: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 100, delay: i * 0.04 }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </h1>
  );
};

const AnniversaryTracker = ({ startDate }: { startDate: Date | string }) => {
  const LABELS: Record<string, string> = {
    days: "ימים",
    hours: "שעות",
    minutes: "דקות",
    seconds: "שניות",
  };

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // 1. Set the initial time immediately on mount
    setNow(new Date());

    // 2. Start the interval
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = useMemo(() => {
    // 3. If 'now' is null, we are still on the server or haven't mounted yet.
    // We return zeros to match the server's initial HTML.
    if (!now) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

    // 4. Force startDate to be a Date object in case it was passed as a string
    const start = new Date(startDate);
    const delta = now.getTime() - start.getTime();
    
    return {
      days: Math.floor(delta / 86400000),
      hours: Math.floor((delta / 3600000) % 24),
      minutes: Math.floor((delta / 60000) % 60),
      seconds: Math.floor((delta / 1000) % 60),
    };
  }, [now, startDate]);

  // Don't render the numbers until 'now' is set (Client-side)
  // This prevents the flickering and the hydration error.
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 backdrop-blur-xl border border-amber-500/20 p-5 rounded-2xl text-center w-full max-w-[340px] shadow-2xl"
    >
      <p className="text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-4">
        הזמן המשותף שלנו
      </p>
      <div className="grid grid-cols-4 gap-2 text-amber-50" dir="ltr">
        {Object.entries(diff).map(([key, val]) => (
          <div key={key} className="flex flex-col items-center">
            <AnimatePresence mode="popLayout">
              {/* Only show the motion.p if now is not null, 
                  otherwise show a static 0 to match server HTML */}
              {now ? (
                <motion.p
                  key={val}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-2xl font-black"
                >
                  {val}
                </motion.p>
              ) : (
                <p className="text-2xl font-black">0</p>
              )}
            </AnimatePresence>
            <p className="text-[9px] uppercase opacity-60 font-medium">
              {LABELS[key]}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// --- Page Content ---

export default function MobileAchievementBlog() {
 const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { amount: 0.5, once: false });
  const router = useRouter();
  const { uploadMemory, fetchMemories, authLoading, currentUser, deleteMemory, updateMemory } = useFirebaseLogic();
  const { hebrew_font } = useOptions();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isEditNavOpen, setIsEditNavOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<{id: string, title: string} | null>(null)

  const [pendingEditItem, setPendingEditItem] = useState<Memory | null>(null)

  const CancleDelete = () => { 
    setPendingItem(null);
    setShowDeleteModal(false);
  };
  const ConfirmDelete = () => {
    if (pendingItem) {
      deleteMemory(pendingItem.id);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = fetchMemories((fetchedMemories) => {
      setMemories(fetchedMemories);
    });
    return () => unsubscribe();
  }, [fetchMemories, currentUser]);

  // 2. FUNCTIONS SECOND (Defined before early returns)
  const handleAddNewMemory = async (newMemory: Memory) => {
    setMemories((prevMemories) => [newMemory, ...prevMemories]);
  };

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsNavOpen(false);
    }
  };

  const scrollToTop = () => {
    const element = document.getElementById('hero');
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main 
      ref={containerRef}
      style={{
        msOverflowStyle: 'none',  // IE and Edge
        scrollbarWidth: 'none',   // Firefox
      }}
      className="relative bg-[#0a0a09] text-white overflow-y-auto h-screen snap-y snap-mandatory scroll-smooth"
      dir="rtl"
    >
      {/* AUTH OVERLAYS */}
      {authLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#040d08]">
           <motion.p 
             animate={{ opacity: [0.3, 1, 0.3] }} 
             transition={{ duration: 1.8, repeat: Infinity }}
             className="text-[#916541] text-[18px]">
             טוען...
           </motion.p>
        </div>
      )}

      {!authLoading && !currentUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#040d08]">
           <p className="text-[#f0e8d8] text-[18px]">יש להתחבר כדי לצפות במנהרת הזמן שלנו.</p>
        </div>
      )}

      {/* ACTUAL CONTENT */}
      <div className={(authLoading || !currentUser) ? "invisible" : "visible"}>
        <StarField />
        <Orbs />
        <GrainOverlay />

        {/* ── Confirm deletion dialog ── */}
        <ConfirmDialog
          isOpen={showDeleteModal}
          title={"למחוק זיכרון?"}
          message={`האם למחוק את הזיכרון : '${pendingItem?.title}'?`}
          confirmText="מחק" cancelText="בטל"
          onConfirm={ConfirmDelete}
          onCancel={() => { setShowDeleteModal(false); CancleDelete; }}
          isDangerous
        />

        {/* Fixed Home Button */}
        <motion.button
          onClick={() => router.push('/')}
          className="fixed top-6 right-6 z-50"
          // 2. Animate based on the HERO section's visibility
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isHeroInView ? 1 : 0,
            pointerEvents: isHeroInView ? 'auto' : 'none' 
          }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'rgba(255,255,255,0.06)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: 16, 
            padding: 14,
          }}
        >
          <Image className="invert" src="/home_icon.svg" width="26" height="26" alt="Back" />
        </motion.button>
        {/* Fixed Edit Events Button */}
        <motion.button
          onClick={() => setIsEditNavOpen(true)}
          className="fixed top-6 left-6 z-50"
          // 2. Animate based on the HERO section's visibility
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isHeroInView ? 1 : 0,
            pointerEvents: isHeroInView ? 'auto' : 'none' 
          }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'rgba(255,255,255,0.06)', 
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: 16, 
            padding: 14,
          }}
        >
          <Image className="invert" src="/pencil.svg" width="26" height="26" alt="Back" />
        </motion.button>
        {/* Scroll to Top Button */}
        <AnimatePresence>
          {!isHeroInView && ( // Only show when HERO is gone
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToTop}
              className="fixed top-6 left-6 z-50 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl text-amber-500"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <section 
          ref={heroRef}
          id="hero" 
          className="h-screen snap-start snap-always flex flex-col items-center justify-center p-6 text-center relative z-10"
        >
          <StaggeredTitle text="הרגעים שלנו" />
          <div className="mt-12">
            <AnniversaryTracker startDate={new Date("2024-04-18")} />
          </div>
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-12">
            <p className="text-amber-500/40 uppercase text-[10px] tracking-[0.4em]">החלק למעלה</p>
          </motion.div>
        </section>

        {/* Achievement Sections */}
        {memories.map((memory, index) => (
          <section 
            id={memory.id} 
            key={memory.id} 
            className="h-screen snap-start snap-always flex items-center justify-center p-4 md:p-12 relative z-10"
          >
            <FullscreenLog log={memory} index={index} />
          </section>
        ))}

        <section className="h-screen snap-start snap-always flex items-center justify-center relative z-10">
          <TheStoryContinues />
        </section>

        {/* Controls */}
        <AnimatePresence>
          {isHeroInView && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50"
            >
              <button 
                onClick={() => setIsNavOpen(true)}
                className="bg-black/60 backdrop-blur-lg border border-white/10 text-amber-500 px-5 py-3 rounded-full flex items-center gap-2 shadow-2xl active:scale-90 transition-transform"
              >
                <Navigation size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">קפוץ ל..</span>
              </button>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-amber-500 text-black p-4 rounded-full shadow-2xl active:scale-90 transition-transform"
              >
                <Plus size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Nav Drawer */}
        <AnimatePresence>
          {isNavOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl p-8 flex flex-col justify-center"
            >
              <button onClick={() => setIsNavOpen(false)} className="absolute top-8 right-8 text-amber-500"><X size={32}/></button>
              <p className="text-amber-500/50 text-xs font-bold uppercase tracking-widest mb-8">קפוץ לזיכרון</p>
              <nav className="flex flex-col gap-6 ">
                <button onClick={() => scrollTo('hero')} className="text-center text-2xl font-serif text-white/80 hover:text-amber-500 transition-colors">♥ הרגעים שלנו ♥</button>
                {memories.map((memory, i) => (
                  <button 
                    key={memory.id} 
                    onClick={() => scrollTo(memory.id)}
                    className="text-right group flex items-center justify-between"
                  >
                    <span className="text-2xl md:text-5xl font-serif font-bold text-amber-50/70 group-hover:text-amber-500 transition-colors">
                      {String(i + 1).padStart(2, '0')}. {memory.title}
                    </span>
                    <ChevronRight className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Nav Drawer */}
        <AnimatePresence>
          {isEditNavOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl p-8 flex flex-col justify-center"
              dir="rtl"
            >
              {/* Close Button - Positioned top-left in RTL */}
              <button onClick={() => setIsEditNavOpen(false)} className="absolute top-8 left-8 text-amber-500 hover:rotate-90 transition-transform">
                <X size={32}/>
              </button>
              
              <p className="text-amber-500/50 text-xs text-center font-bold uppercase tracking-widest mb-12">ערוך זכרונות</p>
              
              <nav className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
                {memories.map((memory, i) => (
                  <div 
                    key={memory.id} 
                    className="group flex items-center justify-between border-b border-white/10 pb-6 hover:border-amber-500/30 transition-colors cursor-pointer"
                    onClick={() => {
                      setPendingEditItem(memory);
                      setIsEditModalOpen(true);
                      setIsEditNavOpen(false);
                    }}
                  >
                    {/* 1. Right Side (Start of RTL): Title & Index */}
                    <div className="flex items-center gap-6">
                      <span className="text-3xl md:text-6xl font-serif font-bold text-amber-50/70 group-hover:text-amber-500 transition-colors">
                        {String(i + 1).padStart(2, '0')}. {memory.title}
                      </span>
                      <ChevronLeft className="text-amber-500 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                    </div>

                    {/* 2. Left Side (End of RTL): Buttons */}
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingItem(memory);
                          setShowDeleteModal(true);
                        }}
                        className="p-3 rounded-full hover:bg-red-500/20 text-red-500 transition-all active:scale-90"
                      >
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {isModalOpen &&
            <AddMemoryModal 
              onClose={() => setIsModalOpen(false)} 
              onAdd={handleAddNewMemory}
              uploadMemory={uploadMemory}
          />}
          {isEditModalOpen &&
            <EditModal 
              EditedMemory={pendingEditItem as any} 
              updateMemory={updateMemory} 
              onClose={() => setIsEditModalOpen(false)}
          />}
        </AnimatePresence>
      </div>
    </main>
  );
}

function FullscreenLog({ log, index }: { log: Memory; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-lg md:max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-16 items-center"
    >
      <div className="relative aspect-[4/5] md:aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl order-1 md:order-none">
        <img src={log.image} alt={log.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
      </div>

      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2 text-amber-500 mb-2">
          <Award size={16} />
          <span className="tracking-[0.3em] font-bold text-[10px]">זיכרון #{index + 1}</span>
        </div>
        <h2 className="text-3xl md:text-6xl font-serif font-bold mb-4 text-amber-50">{log.title}</h2>
        <div className="flex gap-4 mb-6 text-white/40 text-[10px] md:text-xs uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1"><Calendar size={12} /> {log.date.toLocaleDateString('en-GB')}</span>
          <span className="flex items-center gap-1"><MapPin size={12} /> {log.location}</span>
        </div>
        <p className="text-sm md:text-lg text-amber-50/70 leading-relaxed font-light">
          {log.description}
        </p>
      </div>
    </motion.div>
  );
}

function AddMemoryModal({ onClose, onAdd, uploadMemory }: { 
  onClose: () => void; 
  onAdd: (log: Memory) => void;
  uploadMemory: any; // You can change 'any' to your specific function type later
}) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({ title: "", date: today, description: "", location: "", image: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : null;
  useEffect(() => { // Clean up memory
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}, [imageFile]);

  const handleSave = async () => {
    if (!imageFile || !formData.title) return alert("חייב לצרף לפחות את הכותרת והתמונה");
    setLoading(true);
    try {
      const createdLog = await uploadMemory(
        formData.title,
        formData.date,
        formData.location,
        formData.description,
        imageFile
      );

      onAdd(createdLog);
      onClose();
    } catch (err) {
      console.error("Failed to save memory:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-[#141311] border-t md:border border-amber-500/30 p-8 rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
      >
        <div className="w-12 h-1 bg-white/10 mx-auto mb-8 rounded-full md:hidden" />
        <h3 className="text-xl font-serif font-bold mb-6 text-amber-500">זיכרון חדש</h3>
        <div className="space-y-4">
          <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-amber-500/50" placeholder="כותרת" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            {previewUrl ? (
              <div className="relative flex flex-col items-center w-full bg-white/5 border border-white/10 rounded-xl p-2">
                <div className="relative flex items-start justify-center">
                  <div className="w-32 aspect-[4/5] md:aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  {/* 2. The Close Button (Now outside the overflow-hidden container) */}
                  <button 
                    onClick={() => setImageFile(null)}
                    className="absolute -top-1 -right-10 bg-white/10 hover:bg-red-500/40 p-2 rounded-full backdrop-blur-md text-white transition-all border border-white/10"
                    title="הסר תמונה"
                  >
                    <X size={16} /> {/* Using Lucide icon for a cleaner look */}
                  </button>
                </div>
              </div>
            ) : (
            <div className="relative w-full bg-white/5 border border-white/10 rounded-2xl p-4">
              <label className="text-white/50 text-sm block mb-2">בחר תמונה מהגלריה</label>
              <input 
                type="file" 
                accept="image/*"
                className="text-xs text-amber-500"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>
            )}
          <div className="grid grid-cols-2 gap-4">
          <input 
            type="date" 
            className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white/50" 
            value={formData.date} // This expects "YYYY-MM-DD"
            onChange={e => setFormData({...formData, date: e.target.value})} 
          />
          <input className="bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-amber-500/50" placeholder="מיקום" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>
          <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px]" placeholder="מה קרה..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-amber-500 text-black font-black py-5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? "מעלה תמונה..." : "שמור זיכרון"}
          </button>
          <button onClick={onClose} className="w-full text-white/30 text-xs uppercase font-bold tracking-widest py-2">ביטול</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditModal({ onClose, EditedMemory, updateMemory }: { 
  onClose: () => void; 
  updateMemory: (
    id: string, 
    fields: { title?: string; date?: Date; location?: string; description?: string }, 
    file?: File | null
  ) => Promise<any>;
  EditedMemory: Memory
}) {
  // 2. Format the date so the <input type="date"> can read it
  const initialDate = EditedMemory.date instanceof Date 
    ? EditedMemory.date.toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({ 
    title: EditedMemory.title, 
    date: initialDate, 
    description: EditedMemory.description, 
    location: EditedMemory.location 
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const displayImage = imageFile ? URL.createObjectURL(imageFile) : EditedMemory.image;

  const handleUpdate = async () => {
    if (!formData.title) return alert("צריך כותרת!");
    setLoading(true);
    try {
      await updateMemory(
        EditedMemory.id,
        { 
          title: formData.title, 
          location: formData.location, 
          description: formData.description, // Fixed typo
          date: new Date(formData.date) // Convert string back to Date for Firebase
        },
        imageFile
      );
      onClose();
    } catch (err) {
      alert("העדכון נכשל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        className="bg-[#141311] border-t md:border border-amber-500/30 p-8 rounded-t-[2.5rem] md:rounded-[2.5rem] w-full max-w-lg shadow-2xl"
      >
        <h3 className="text-xl font-serif font-bold mb-6 text-amber-500 text-right">ערוך זיכרון</h3>
        
        <div className="space-y-4" dir="rtl">
          <input 
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500/50" 
            placeholder="כותרת" 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
          />

          {imageFile ? (
            <div className="relative flex flex-col items-center w-full bg-white/5 border border-white/10 rounded-2xl p-2">
              <div className="relative flex items-start justify-center">
                <div className="w-32 aspect-[4/5] md:aspect-square rounded-2xl overflow-hidden border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <img 
                    src={URL.createObjectURL(imageFile)} 
                    alt="New Preview" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                </div>

                <button 
                  onClick={() => setImageFile(null)}
                  className="absolute -top-1 -right-10 bg-white/10 hover:bg-red-500/40 p-2 rounded-full backdrop-blur-md text-white transition-all border border-white/10"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full bg-white/5 border border-white/10 rounded-2xl p-4">
              {/* Current Image Preview - Small & Subtle */}
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 opacity-60">
                  <img src={EditedMemory.image} className="w-full h-full object-cover" alt="Current" />
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  className="text-xs text-amber-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-500 hover:file:bg-amber-500/20 transition-all"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <input 
              type="date" 
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
            <input 
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500/50" 
              placeholder="מיקום" 
              value={formData.location} 
              onChange={e => setFormData({...formData, location: e.target.value})} 
            />
          </div>

          <textarea 
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px] text-white outline-none" 
            placeholder="מה קרה..." 
            value={formData.description} 
            onChange={e => setFormData({...formData, description: e.target.value})} 
          />

          <button 
            onClick={handleUpdate} // Fixed: was handleSave
            disabled={loading}
            className="w-full bg-amber-500 text-black font-black py-5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? "מעדכן..." : "שמור שינויים"}
          </button>
          
          <button onClick={onClose} className="w-full text-white/30 text-xs uppercase font-bold tracking-widest py-2">ביטול</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const TheStoryContinues = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="flex flex-col items-center justify-center text-center px-6"
    >
      {/* Floating Heart Icon */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0] 
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="mb-8 text-amber-500/50"
      >
        <Image src="/heart.svg" alt="alt" width={48} height={48}
        style={{ 
          filter: 'invert(68%) sepia(90%) saturate(3000%) hue-rotate(1deg) brightness(102%) contrast(93%)',
          opacity: 1 // This achieves the /50 effect
        }}
        />
      </motion.div>

      <h2 className="text-4xl md:text-6xl font-light italic text-amber-50 mb-6">
        והסיפור ממשיך...
      </h2>
      
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mb-8" />
      
      <p className="max-w-xs text-amber-50/40 text-sm md:text-base leading-relaxed tracking-wide font-light">
        ♥ כל רגע הוא דף חדש בספר שאנחנו כותבים יחד ♥<br />
        ♥ מחכה ליצור עוד זיכרונות איתך ♥
      </p>

      <motion.div 
        initial={{ width: 0 }}
        whileInView={{ width: "60px" }}
        transition={{ delay: 0.5, duration: 1 }}
        className="mt-12 h-[1px] bg-amber-500/20"
      />
    </motion.div>
  );
};
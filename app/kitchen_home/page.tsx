'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useOptions } from '../options';
import IsraelTime from '../components/IsraelTime';
import { useFirebaseLogic } from '../components/FirebaseLogic';
import ConfirmDialog from '../components/ConfirmDialog';

// ─── Star field canvas ────────────────────────────────────────────────────────

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.2 + 0.05,
      drift: (Math.random() - 0.5) * 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    let frame = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      for (const p of particles) {
        // Sinusoidal twinkling
        const twinkle = Math.sin(frame * 0.02 + p.pulse) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, p.alpha + twinkle)})`;
        ctx.fill();
        
        // Upward and lateral drift
        p.y -= p.speed;
        p.x += p.drift;
        
        // Loop around
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
        if (p.x < -5) p.x = W + 5;
        if (p.x > W + 5) p.x = -5;
      }
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}
    />
  );
}

// ─── Animated orbs ────────────────────────────────────────────────────────────

const ORBS = [
  { size: 600, x: '-10%', y: '-10%', color: 'rgba(6, 182, 212, 0.12)', dur: 22 }, // Cyan
  { size: 500, x: '60%',  y: '5%',   color: 'rgba(245, 158, 11, 0.08)', dur: 28 }, // Amber
  { size: 450, x: '15%',  y: '55%',  color: 'rgba(59, 130, 246, 0.10)',  dur: 20 }, // Blue
  { size: 550, x: '65%',  y: '60%',  color: 'rgba(16, 185, 129, 0.08)',  dur: 30 }, // Emerald
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
            scale: [1, 1.08, 0.95, 1.05, 1]
          }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
          style={{
            position: 'fixed', width: o.size, height: o.size,
            left: o.x, top: o.y, borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            pointerEvents: 'none', zIndex: 0, filter: 'blur(3px)',
          }}
        />
      ))}
    </>
  );
}

// ─── Reusable Components ──────────────────────────────────────────────────────

function GlassCard({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.035)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 22,
      ...style,
    }}>
      {children}
    </div>
  );
}

function DarkInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%', background: 'rgba(255,255,255,0.055)',
        border: '1px solid rgba(255,255,255,0.11)',
        borderRadius: 11, padding: '11px 14px',
        color: '#f0e8d8', fontSize: 15, outline: 'none',
        transition: 'border-color 0.2s', fontFamily: 'inherit',
        ...props.style,
      }}
      onFocus={e => (e.target.style.borderColor = 'rgba(6, 182, 212, 0.55)')} // Cyan focus
      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
    />
  );
}


export interface PendingItem {
  id: string;
  name: string;
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function KitchenHomePage() {
  const router = useRouter();
  const { hebrew_font } = useOptions();

  const { 
    addGroceryItem, 
    currentUser, 
    fetchGroceryItems, 
    grocerysItems,
    grocerysLoading,
    toggleGroceryAmountMode,
    setGroceryAmount,
    deleteGroceryItem,
    toggleGroceryItemDone,
    recipeItems,
    recipesLoading,
    fetchRecipeItems,
    addRecipeItem,
    deleteRecipeItem,
    movieItems,
    addMovieItem,
    deleteMovieItem,
    fetchMovieItems,
    moviesLoading,
    movieSitesLoading,
    movieSiteItems,
    fetchMovieSiteItems,
    addMovieSiteItem,
    deleteMovieSiteItem,
    authLoading,
  } = useFirebaseLogic();
  
  const [activeTab, setActiveTab] = useState<'groceries' | 'recipes' | 'movies'>('groceries');

  const [showDeleteGroceryConfirmDialog, setShowDeleteGroceryConfirmDialog] = useState<boolean>(false);
  const [pendingGroceryItem, setPendingGroceryItem] = useState<PendingItem | null>(null)

  const cancelGroceryItemDeletion      = () => { setPendingGroceryItem(null); setShowDeleteGroceryConfirmDialog(false); };
  const confirmGroceryItemDeletion     = () => { if (pendingGroceryItem) deleteGroceryItem(pendingGroceryItem.id); setShowDeleteGroceryConfirmDialog(false); };

  // Local State Mocks (Replace with useFirebaseLogic later)
  const [groceryInput, setGroceryInput] = useState('');
  useEffect(() => {
    if (currentUser) fetchGroceryItems();
  }, [currentUser, fetchGroceryItems]);

  const [isLinkMode, setIsLinkMode] = useState(true);
  const [recipeInput, setRecipeInput] = useState({ name: '', link: '', description: '', ingredients: '' });
  const [recipeSearch, setRecipeSearch] = useState('');
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [ingredientQuery, setIngredientQuery] = useState('');
  useEffect(() => {
    if (currentUser) fetchRecipeItems();
  }, [currentUser, fetchRecipeItems]);

  const [showDeleteRecipeConfirmDialog, setShowDeleteRecipeConfirmDialog] = useState<boolean>(false);
  const [pendingRecipeItem, setPendingRecipeItem] = useState<PendingItem | null>(null)

  const cancelRecipeItemDeletion      = () => { setPendingRecipeItem(null); setShowDeleteRecipeConfirmDialog(false); };
  const confirmRecipeItemDeletion     = () => { if (pendingRecipeItem) deleteRecipeItem(pendingRecipeItem.id); setShowDeleteRecipeConfirmDialog(false); };

  const [movieInput, setMovieInput] = useState({name: ''});
  const [randomMovie, setRandomMovie] = useState<string | null>(null);
  useEffect(() => {
    if (currentUser) fetchMovieItems();
  }, [currentUser, fetchMovieItems]);

  const [showDeleteMovieConfirmDialog, setShowDeleteMovieConfirmDialog] = useState<boolean>(false);
  const [pendingMovieItem, setPendingMovieItem] = useState<PendingItem | null>(null)

  const cancelMovieItemDeletion      = () => { setPendingMovieItem(null); setShowDeleteMovieConfirmDialog(false); };
  const confirmMovieItemDeletion     = () => { if (pendingMovieItem) deleteMovieItem(pendingMovieItem.id); setShowDeleteMovieConfirmDialog(false); };

  // ── Handlers ──
  const addGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groceryInput.trim() || !currentUser) return;

    // Call the firebase hook
    const success = await addGroceryItem({
      name: groceryInput,
      category: 'General', // Or add a category selector in your UI
      amount: 0,
    });

    if (success) {
      setGroceryInput('');
      fetchGroceryItems(); // Refresh the list
    }
  };
  
  const handleAddRecepie = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!recipeInput.name.trim()) return;
      const ok = await addRecipeItem(recipeInput);
      if (ok) {
        setRecipeInput({ name:"", link:"", description:"", ingredients: '' });
      }
    };

    const filteredRecipes = recipeItems.filter(r =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );

  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedRecipe, setSelectedRecipe] = useState<typeof recipeItems[0] | null>(null);


  const handleCopy = (recipe: any) => {
    const content = recipe.link || recipe.description || '';
    const text = `${recipe.name}\n${recipe.ingredients ? 'מצרכים: ' + recipe.ingredients : ''}\n${content}`;
    
    navigator.clipboard.writeText(text);
    
    // Trigger the "Copied" state
    setCopiedId(recipe.id);
    
    // Reset it after 2 seconds
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedRecipes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const ingredientResults = ingredientQuery.trim()
    ? recipeItems.filter(r =>
        ingredientQuery.split(',').map(s => s.trim().toLowerCase()).every(ing =>
          (r.ingredients ?? '').toLowerCase().includes(ing) ||
          (r.description ?? '').toLowerCase().includes(ing)
        )
      )
    : [];

  const addMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieInput.name.trim()) return;
    const ok = await addMovieItem(movieInput);
    if (ok) {
      setMovieInput({name:''});
    }
  };

  const pickRandomMovie = () => {
    if (movieItems.length === 0) return;
      const random = movieItems[Math.floor(Math.random() * movieItems.length)].name;
      setRandomMovie(random);
  };

  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [movieSiteInput, setMovieSiteInput] = useState({ name: '', url: '' });

  const [showDeleteMovieSiteConfirmDialog, setShowDeleteMovieSiteConfirmDialog] = useState<boolean>(false);
  const [pendingMovieSiteItem, setPendingMovieSiteItem] = useState<PendingItem | null>(null)

  const cancelMovieSiteItemDeletion      = () => { setPendingMovieSiteItem(null); setShowDeleteMovieSiteConfirmDialog(false); };
  const confirmMovieSiteItemDeletion     = () => { if (pendingMovieSiteItem) deleteMovieSiteItem(pendingMovieSiteItem.id); setShowDeleteMovieSiteConfirmDialog(false); };

  const addMovieSite = async (e: React.FormEvent) => {
    if (!movieSiteInput.name.trim() || !movieSiteInput.url) return;
    const ok = await addMovieSiteItem(movieSiteInput)
    if (ok) {
      setMovieSiteInput({ name: '', url: '' });
    }
  };

  useEffect(() => {
    if (currentUser) fetchMovieSiteItems();
  }, [currentUser, fetchMovieSiteItems]);

  const TABS = [
    { id: 'groceries', label: 'רשימת קניות', icon: '🛒' },
    { id: 'recipes', label: 'כספת המתכונים', icon: '🍲' },
    { id: 'movies', label: 'סרטים לצפייה', icon: '🍿' },
  ] as const;

  if (authLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{ background: '#040d08' }}
        dir="rtl">
        <motion.p
          animate={{ opacity: [0.3,1,0.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ color: '#06b6d4', fontSize: 18, letterSpacing: '0.12em' }}
        >
          טוען...
        </motion.p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{ background: '#040d08' }}>
        <p style={{ color: '#f0e8d8', fontSize: 18 }}>יש להתחבר כדי לצפות ולנהל הוצאות.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        body { background: #03060a !important; color: #f0e8d8; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #162f45; border-radius: 2px; }
      `}</style>

      {/* ── Background layers ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 110% 55% at 50% 0%, #081b29 0%, #03060a 65%)' }} />
      <StarField />
      <Orbs />
      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
        opacity: 0.6,
      }} />

      {/* ── Nav ── */}
      <motion.button
        onClick={() => router.push('/')}
        className="fixed top-6 right-6 z-50"
        style={{
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 14,
        }}
        whileHover={{ scale: 1.08, filter: 'brightness(1.4)' }}
        whileTap={{ scale: 0.95 }}
      >
        <Image className="invert" src="/home_icon.svg" width="26" height="26" alt="Back" />
      </motion.button>

      {/* ── Content ── */}
      <div dir="rtl" className={hebrew_font.className} style={{ position: 'relative', zIndex: 10, minHeight: '100vh', padding: '0 16px 100px' }}>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ textAlign: 'center', paddingTop: 60, paddingBottom: 36 }}
        >
          <motion.div
            animate={{ rotate: [0,-6,6,-3,0] }}
            transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, repeatDelay: 6 }}
            style={{ fontSize: 40, marginBottom: 12, display: 'inline-block' }}
          >
            🏡
          </motion.div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(36px,8vw,58px)', fontWeight: 300,
            letterSpacing: '0.04em', color: '#f0e8d8', lineHeight: 1.05, margin: 0,
          }}>
            בית ומטבח
          </h1>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            style={{
              margin: '16px auto 0', width: 160, height: 1,
              background: 'linear-gradient(90deg, transparent, #06b6d4, #f59e0b, transparent)',
            }}
          />
        </motion.div>

        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          
          {/* ── Tabs ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
            style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 50, padding: 4, marginBottom: 36 }}
          >
            {TABS.map(({ id, label, icon }) => (
              <motion.button
                key={id} onClick={() => setActiveTab(id)} whileTap={{ scale: 0.96 }}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 46, border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.3s',
                  background: activeTab === id ? 'linear-gradient(135deg, #0284c7, #06b6d4)' : 'transparent',
                  color: activeTab === id ? '#f0fff8' : '#7dd3fc',
                }}
              >
                {icon} {label}
              </motion.button>
            ))}
          </motion.div>

          {/* --- MODALS --- */}
          <ConfirmDialog isOpen={showDeleteGroceryConfirmDialog} title="האם ברצונך למחוק את הפריט?"
            message={`האם למחוק את הפריט : '${pendingGroceryItem?.name}'?`}
            confirmText="מחק" cancelText="ביטול"
            onConfirm={confirmGroceryItemDeletion}
            onCancel={cancelGroceryItemDeletion}
            isDangerous />

          <ConfirmDialog isOpen={showDeleteRecipeConfirmDialog} title="האם ברצונך למחוק את המתכון?"
            message={`האם למחוק את המתכון : '${pendingRecipeItem?.name}'?`}
            confirmText="מחק" cancelText="ביטול"
            onConfirm={confirmRecipeItemDeletion}
            onCancel={cancelRecipeItemDeletion}
            isDangerous />

          <ConfirmDialog isOpen={showDeleteMovieConfirmDialog} title="האם ברצונך למחוק את הסרט מהרשימה?"
            message={`האם למחוק את הסרט : '${pendingMovieItem?.name}' מהרשימה?`}
            confirmText="מחק" cancelText="ביטול"
            onConfirm={confirmMovieItemDeletion}
            onCancel={cancelMovieItemDeletion}
            isDangerous />

          <ConfirmDialog isOpen={showDeleteMovieSiteConfirmDialog} title="האם ברצונך למחוק את האתר מהרשימה?"
            message={`האם למחוק את האתר : '${pendingMovieSiteItem?.name}' מהרשימה?`}
            confirmText="מחק" cancelText="ביטול"
            onConfirm={confirmMovieSiteItemDeletion}
            onCancel={cancelMovieSiteItemDeletion}
            isDangerous />

          {/* ── Tab Content ── */}
          <AnimatePresence mode="wait">
            
            {/* GROCERIES TAB */}
            {activeTab === 'groceries' && (
              <motion.div key="groceries" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
                <GlassCard style={{ padding: '24px', marginBottom: 20 }}>
                  <form onSubmit={addGrocery} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    <DarkInput value={groceryInput} onChange={e => setGroceryInput(e.target.value)} placeholder="מה חסר בבית?" />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 11,
                      padding: '0 20px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      הוסף
                    </motion.button>
                  </form>
                  {grocerysLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={`skeleton-${i}`}
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: [0.4, 0.7, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          style={{
                            height: '54px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 14,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '14px 18px',
                            gap: 12
                          }}
                        >
                          {/* Skeleton Layout */}
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ width: '40%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
                          <div style={{ marginLeft: 'auto', width: 45, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grocerysItems.map(item => (
                      <motion.div
                        key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        onClick={() => toggleGroceryItemDone(item.id, !item.done)}
                        whileHover={{ background: 'rgba(255,255,255,0.08)' }}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: 14, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {/* 1. CHECKBOX */}
                        <div 
                          style={{ width: 22, height: 22, borderRadius: 6,
                          border: `2px solid ${item.done ? '#06b6d4' : '#555'}`, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', background: item.done ? '#06b6d4' : 'transparent', transition: 'all 0.2s' }}>
                          {item.done && <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</span>}
                        </div>

                        {/* 2. ITEM NAME */}
                        <span style={{ fontSize: 16, color: item.done ? '#64748b' : '#f0e8d8', textDecoration: item.done ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                          {item.name}
                        </span>

                        {/* 3. NEW: AMOUNT SECTION */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
                          <AnimatePresence mode="wait">
                            {item.amount > 0 ? (
                              <motion.input
                                key="amount-input"
                                initial={{ opacity: 0, x: 10, width: 0 }}
                                animate={{ opacity: 1, x: 0, width: 50 }}
                                exit={{ opacity: 0, x: 10, width: 0 }}
                                type="number"
                                placeholder="1"
                                value={item.amount}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setGroceryAmount(item.id, val);
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 6,
                                  color: '#fff',
                                  padding: '4px 8px',
                                  fontSize: 14,
                                  outline: 'none'
                                }}
                              />
                            ) : null}
                          </AnimatePresence>

                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroceryAmountMode(item.id); 
                            }}
                            whileHover={{ background: 'rgba(14, 165, 233, 0.2)' }}
                            style={{
                              background: item.amount > 0 ? '#0ea5e9' : 'rgba(255,255,255,0.05)',
                              border: 'none',
                              borderRadius: 8,
                              color: item.amount > 0 ? '#fff' : '#7a6a7a',
                              padding: '4px 10px',
                              fontSize: 12,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {item.amount > 0 ? 'כמות' : '#'}
                          </motion.button>
                        </div>

                        {/* 4. DELETE BUTTON */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation(); 
                              setPendingGroceryItem(item)
                              setShowDeleteGroceryConfirmDialog(true)
                            }}
                            whileHover={{ scale: 1.15, color: "#e87080" }}
                            whileTap={{ scale: 0.9 }}
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              color: "#4a3a5a", 
                              borderRadius: 8,
                              width: 28, height: 28,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", fontSize: 17, lineHeight: 1,
                              transition: "color 0.18s",
                            }}
                          >
                            X
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {/* RECIPES TAB */}
            {activeTab === 'recipes' && (
              <motion.div key="recipes" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                <GlassCard style={{ padding: '24px', marginBottom: 20 }}>

                  <form onSubmit={handleAddRecepie} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    <DarkInput
                      value={recipeInput.name}
                      onChange={e => setRecipeInput({ ...recipeInput, name: e.target.value })}
                      placeholder="שם המתכון (לדוגמה: פסטה רוזה)"
                    />

                    {/* --- TOGGLE HEADER --- */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>סוג מתכון:</span>
                      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
                        <button
                          type="button"
                          onClick={() => {setIsLinkMode(true); setRecipeInput({...recipeInput, link: "", description: "", ingredients: ""})}}
                          style={{
                            border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            background: isLinkMode ? '#0ea5e9' : 'transparent',
                            color: isLinkMode ? '#fff' : '#94a3b8',
                            transition: '0.2s'
                          }}
                        >קישור חיצוני</button>
                        <button
                          type="button"
                          onClick={() => {setIsLinkMode(false); setRecipeInput({...recipeInput, link: "", description: "", ingredients: ""})}}
                          style={{
                            border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                            background: !isLinkMode ? '#0ea5e9' : 'transparent',
                            color: !isLinkMode ? '#fff' : '#94a3b8',
                            transition: '0.2s'
                          }}
                        >תיאור טקסט</button>
                      </div>
                    </div>

                    {/* --- ANIMATED INPUT SWAP --- */}
                    <AnimatePresence mode="wait">
                      {isLinkMode ? (
                        <motion.div
                          key="link-input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <DarkInput
                            value={recipeInput.link}
                            onChange={e => setRecipeInput({ ...recipeInput, link: e.target.value })}
                            placeholder="הדבק לינק (TikTok, Instagram, אתר)"
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="desc-input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <textarea
                            value={recipeInput.description}
                            onChange={e => setRecipeInput({ ...recipeInput, description: e.target.value })}
                            placeholder="כתוב את הוראות ההכנה כאן..."
                            style={{
                              width: '100%', minHeight: 100, background: 'rgba(0,0,0,0.2)',
                              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11,
                              padding: 12, color: '#f0e8d8', fontFamily: 'inherit', outline: 'none'
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* --- OPTIONAL INGREDIENTS FIELD --- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b', paddingRight: 4 }}>
                        רכיבים <span style={{ color: '#334155' }}>(אופציונלי — לחיפוש לפי מה שיש בבית)</span>
                      </span>
                      <DarkInput
                        value={recipeInput.ingredients}
                        onChange={e => setRecipeInput({ ...recipeInput, ingredients: e.target.value })}
                        placeholder="לדוגמה: עגבניות, גבינה, פסטה..."
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                        color: '#fff', border: 'none', borderRadius: 11, padding: '12px', fontWeight: 600, cursor: 'pointer'
                      }}
                      type="submit">
                      שמור לכספת המתכונים
                    </motion.button>
                  </form>

                  {/* --- SEARCH BAR + INGREDIENT MODAL TRIGGER --- */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <DarkInput
                      value={recipeSearch}
                      onChange={e => setRecipeSearch(e.target.value)}
                      placeholder="🔍 חפש מתכון לפי שם..."
                    />
                    <motion.button
                      onClick={() => { setShowIngredientModal(true); setIngredientQuery(''); }}
                      whileHover={{ scale: 1.05, boxShadow: '0 0 16px rgba(16,185,129,0.3)' }}
                      whileTap={{ scale: 0.95 }}
                      title="חפש לפי רכיבים שיש בבית"
                      style={{
                        flexShrink: 0,
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        color: '#fff', border: 'none', borderRadius: 11,
                        padding: '0 16px', fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 20, whiteSpace: 'nowrap'
                      }}
                    >
                      🧺
                    </motion.button>
                  </div>

                  {/* --- RECIPE LIST --- */}
                  <div style={{ display: 'grid', gap: 12 }}>
                    {filteredRecipes.map(recipe => {
                      const isExpanded = expandedRecipes[recipe.id];

                      const descriptionLength = recipe.description?.length || 0;
                      const isLongText = descriptionLength > 80;
                      const hasExpandableContent = !recipe.link && isLongText;

                      return (
                        <motion.div
                          key={recipe.id}
                          onClick={() => setSelectedRecipe(recipe)}
                          whileTap={{ scale: 0.98 }}
                          layout // Smooth height transitions
                          whileHover={{ scale: 1.02, backgroundColor: 'rgba(6, 182, 212, 0.1)' }}
                          style={{
                            position: 'relative',
                            background: 'rgba(6, 182, 212, 0.06)',
                            border: '1px solid rgba(6, 182, 212, 0.15)',
                            padding: '16px 20px',
                            borderRadius: 14,
                            overflow: 'hidden',
                          }}
                        >
                          {/* Delete Button (Top Left) */}
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingRecipeItem(recipe);
                              setShowDeleteRecipeConfirmDialog(true);
                            }}
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(232, 112, 128, 0.2)', color: '#e87080' }}
                            whileTap={{ scale: 0.9 }}
                            style={{
                              position: 'absolute', top: 12, left: 12,
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#64748b', borderRadius: 8,
                              width: 26, height: 26,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: 14, zIndex: 10
                            }}
                          >✕</motion.button>

                          {/* Title */}
                          <div style={{ fontSize: 17, fontWeight: 600, color: '#f0e8d8', paddingLeft: 30, marginBottom: 4 }}>
                            {recipe.name}
                          </div>

                          {/* Collapsible Content Area */}
                          <div style={{ 
                              maxHeight: isExpanded ? '1000px' : '120px', 
                              overflow: 'hidden', 
                              transition: 'max-height 0.4s ease-in-out',
                              position: 'relative',
                              // This is the magic part:
                              WebkitMaskImage: !isExpanded && hasExpandableContent 
                                ? 'linear-gradient(to bottom, black 60%, transparent 100%)' 
                                : 'none',
                              maskImage: !isExpanded && hasExpandableContent 
                                ? 'linear-gradient(to bottom, black 60%, transparent 100%)' 
                                : 'none'
                            }}>
                            {recipe.ingredients && (
                              <div style={{ fontSize: 12, color: '#34d399', marginTop: 4 }}>
                                🧺 {recipe.ingredients}
                              </div>
                            )}

                            {recipe.link ? (
                              <a
                                href={recipe.link.startsWith('http') ? recipe.link : `https://${recipe.link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 13, color: '#38bdf8', textDecoration: 'none', display: 'inline-block', marginTop: 8 }}
                              >
                                🔗 {recipe.link}
                              </a>
                            ) : (
                              <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                {recipe.description}
                              </div>
                            )}
                            
                            {/* Fade effect when collapsed */}
                            {hasExpandableContent && !isExpanded && (
                              <div style={{
                                position: 'absolute', bottom: 0, left: 0, right: 0,
                                height: 30, background: 'linear-gradient(to top, rgba(6, 182, 212, 0.06), transparent)',
                                pointerEvents: 'none'
                              }} />
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div style={{ 
                            display: 'flex', 
                            // If there is an arrow, space them out. If not, push the Copy button to the left.
                            justifyContent: hasExpandableContent ? 'space-between' : 'flex-end', 
                            alignItems: 'center', 
                            marginTop: 12 
                          }}>
                            {/* 1. Arrow (Right side in RTL) */}
                            {hasExpandableContent && (
                              <motion.button
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(recipe.id);
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: 'none', color: '#06b6d4',
                                  width: 28, height: 28, borderRadius: '50%',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                ▼
                              </motion.button>
                            )}

                            {/* 2. Copy Button (Left side in RTL) */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(recipe);
                              }}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: copiedId === recipe.id ? '#34d399' : '#64748b', // Switch to green when copied
                                fontSize: 13, 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6,
                                transition: 'color 0.3s ease'
                              }}
                            >
                              <AnimatePresence mode="wait">
                                {copiedId === recipe.id ? (
                                  <motion.div
                                    key="copied"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <span>הועתק ✓</span>
                                  </motion.div>
                                ) : (
                                  <motion.div
                                    key="copy"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <span>📋</span>
                                    <span>העתק</span>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </GlassCard>

                <AnimatePresence mode="wait">
                  {selectedRecipe && (
                    <RecipeDetailModal 
                      recipe={selectedRecipe} 
                      onClose={() => setSelectedRecipe(null)}
                      handleCopy={handleCopy}
                      copiedId={copiedId}
                    />
                  )}
                </AnimatePresence>

                {/* --- INGREDIENT SEARCH MODAL --- */}
                <AnimatePresence>
                  {showIngredientModal && (
                    <motion.div
                      key="ingredient-modal-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowIngredientModal(false)}
                      style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                      }}
                    >
                      <motion.div
                        key="ingredient-modal"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          background: 'linear-gradient(145deg, #0d1f2d, #0a1a27)',
                          border: '1px solid rgba(16,185,129,0.25)',
                          borderRadius: 24, padding: 28, width: '100%', maxWidth: 500,
                          boxShadow: '0 0 60px rgba(16,185,129,0.1)'
                        }}
                      >
                        {/* Modal Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                          <div>
                            <div style={{ fontSize: 22, fontWeight: 600, color: '#f0e8d8' }}>🧺 מה יש לי בבית?</div>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                              הכנס רכיבים מופרדים בפסיקים ונמצא מתכונים מתאימים
                            </div>
                          </div>
                          <motion.button
                            onClick={() => setShowIngredientModal(false)}
                            whileHover={{ scale: 1.1, color: '#e87080' }}
                            style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                          >✕</motion.button>
                        </div>

                        {/* Search Input */}
                        <DarkInput
                          value={ingredientQuery}
                          onChange={e => setIngredientQuery(e.target.value)}
                          placeholder="לדוגמה: ביצים, גבינה, עגבנייה"
                          style={{ marginBottom: 20 }}
                        />

                        {/* Results */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
                          {ingredientQuery.trim() === '' ? (
                            <div style={{ textAlign: 'center', color: '#334155', padding: '24px 0', fontSize: 14 }}>
                              התחל להקליד רכיבים כדי לחפש מתכונים...
                            </div>
                          ) : ingredientResults.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              style={{ textAlign: 'center', color: '#475569', padding: '24px 0', fontSize: 14 }}
                            >
                              😕 לא נמצאו מתכונים עם הרכיבים האלה
                            </motion.div>
                          ) : (
                            ingredientResults.map(recipe => (
                              <motion.div
                                key={recipe.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                  background: 'rgba(16,185,129,0.08)',
                                  border: '1px solid rgba(16,185,129,0.2)',
                                  borderRadius: 14, padding: '14px 18px'
                                }}
                              >
                                <div style={{ fontSize: 16, fontWeight: 500, color: '#f0e8d8', marginBottom: 4 }}>
                                  {recipe.name}
                                </div>
                                {recipe.ingredients && (
                                  <div style={{ fontSize: 12, color: '#34d399' }}>🧺 {recipe.ingredients}</div>
                                )}
                                {recipe.link ? (
                                  <a
                                    href={`https://${recipe.link}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: 12, color: '#38bdf8', textDecoration: 'none', display: 'inline-block', marginTop: 4 }}
                                  >
                                    לחץ לצפייה במתכון 🔗
                                  </a>
                                ) : recipe.description ? (
                                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                                    {recipe.description}
                                  </div>
                                ) : null}
                              </motion.div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* MOVIES TAB */}
            {activeTab === 'movies' && (
              <motion.div key="movies" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10, 
                  marginBottom: 16, 
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.05)',
                  overflowX: 'auto' 
                }}>
                  <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                    {movieSiteItems.map(site => (
                      <motion.a
                        key={site.id}
                        href={`https://${site.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.08)' }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#7dd3fc',
                          fontSize: 13,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <span>🌐</span> {site.name}
                      </motion.a>
                    ))}
                  </div>
                  
                  {/* Settings Gear to open the Modal */}
                  <motion.button
                    onClick={() => setIsSiteModalOpen(true)}
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 18,
                      cursor: 'pointer',
                      padding: 8,
                      opacity: 0.6
                    }}
                  >
                    ⚙️
                  </motion.button>
                </div>

                <GlassCard style={{ padding: '24px', marginBottom: 20, textAlign: 'center' }}>
                  <motion.button
                    onClick={pickRandomMovie}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }} whileTap={{ scale: 0.95 }}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 30px', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24, width: '100%' }}
                  >
                    🎲 מה רואים היום?
                  </motion.button>

                  <AnimatePresence>
                    {randomMovie && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 16, padding: '20px', marginBottom: 24 }}
                      >
                        <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 8 }}>הסרט שנבחר הוא:</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#fff'}}>{randomMovie}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={addMovie} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    <DarkInput value={movieInput.name} onChange={e => setMovieInput({name:e.target.value})} placeholder="שם סרט / סדרה להוספה..." />
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 11, padding: '0 20px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      הוסף
                    </motion.button>
                  </form>

                  <div dir="ltr" style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'right' }}>
                    {movieItems.map(movie => (
                      <motion.div 
                        key={movie.id} 
                        layout 
                        initial={{ opacity: 0, x: 20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between', // Pushes delete to one side, text to the other
                          background: 'rgba(255,255,255,0.03)', 
                          padding: '12px 18px', 
                          borderRadius: 12, 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          color: '#e2e8f0', 
                          fontSize: 16 
                        }}
                      >
                        {/* Delete Button (Left side) */}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingMovieItem(movie);
                            setShowDeleteMovieConfirmDialog(true);
                          }}
                          whileHover={{ scale: 1.1, color: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}
                          whileTap={{ scale: 0.9 }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: 18,
                            padding: '4px 8px',
                            borderRadius: 8,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ✕
                        </motion.button>

                        {/* Movie Info (Right side) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span>{movie.name}</span>
                          <span>🎬</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
                <AnimatePresence>
                  {isSiteModalOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#03060a]/80 backdrop-blur-md z-40"
                        onClick={() => setIsSiteModalOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-full max-w-md"
                        dir="rtl"
                      >
                        <GlassCard style={{ padding: 24 }}>
                          <h2 style={{ fontSize: 20, color: '#f0e8d8', marginBottom: 20 }}>ניהול אתרי צפייה</h2>
                          
                          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                            <DarkInput 
                              placeholder="שם האתר" 
                              value={movieSiteInput.name} 
                              onChange={e => setMovieSiteInput({...movieSiteInput, name: e.target.value})} 
                            />
                            <DarkInput 
                              placeholder="לינק (URL)" 
                              value={movieSiteInput.url} 
                              onChange={e => setMovieSiteInput({...movieSiteInput, url: e.target.value})} 
                            />
                            <button 
                              onClick={addMovieSite}
                              style={{ padding: '0 16px', background: '#06b6d4', border: 'none', borderRadius: 11, color: '#fff', cursor: 'pointer' }}
                            >
                              הוסף
                            </button>
                          </div>

                          <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {movieSiteItems.map(site => (
                              <div key={site.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 12 }}>
                                <span style={{ color: '#e2e8f0' }}>{site.name}</span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation(); 
                                    setPendingMovieSiteItem(site)
                                    setShowDeleteMovieSiteConfirmDialog(true)
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                                >
                                  מחק
                                </button>
                              </div>
                            ))}
                          </div>

                          <button 
                            onClick={() => setIsSiteModalOpen(false)}
                            style={{ width: '100%', marginTop: 24, padding: 12, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, color: '#f0e8d8', cursor: 'pointer' }}
                          >
                            סגור
                          </button>
                        </GlassCard>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

          </AnimatePresence>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.6 }} style={{ marginTop: 40, textAlign: 'center' }} dir="ltr">
            <IsraelTime />
          </motion.div>

        </div>
      </div>
    </>
  );
}


const RecipeDetailModal = ({ 
  recipe, 
  onClose, 
  handleCopy, 
  copiedId 
}: { 
  recipe: any, 
  onClose: () => void, 
  handleCopy: (r: any) => void, 
  copiedId: string | null 
}) => {
  const isCopied = copiedId === recipe.id;

    return (
      <motion.div
        key="recipe-modal-backdrop" // Stable key
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
      >
        <motion.div
          key="recipe-modal-content" // Stable key: prevents re-triggering spring on state change
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(145deg, #0d1f2d, #081521)',
            border: '1px solid rgba(6, 182, 212, 0.22)',
            borderRadius: 26, padding: 28,
            width: '100%', maxWidth: 520,
            maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 0 80px rgba(6, 182, 212, 0.08)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <h2 style={{
              fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 600,
              color: '#f0e8d8', margin: 0, lineHeight: 1.25, paddingLeft: 36,
            }}>
              {recipe.name}
            </h2>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, color: '#e87080' }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#64748b', fontSize: 18,
                width: 32, height: 32, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >✕</motion.button>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(6,182,212,0.4), transparent)', marginBottom: 20 }} />

          {/* Ingredients */}
          {recipe.ingredients && (
            <div style={{
              background: 'rgba(52, 211, 153, 0.07)',
              border: '1px solid rgba(52, 211, 153, 0.18)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 18,
            }}>
              <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                מצרכים
              </div>
              <div style={{ fontSize: 15, color: '#d1fae5', lineHeight: 1.7 }}>
                {recipe.ingredients}
              </div>
            </div>
          )}

          {/* Link or Description */}
          {recipe.link ? (
            <div style={{
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 18,
            }}>
              <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                קישור למתכון
              </div>
              <a
                href={recipe.link.startsWith('http') ? recipe.link : `https://${recipe.link}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 14, color: '#7dd3fc', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  wordBreak: 'break-all',
                }}
              >
                🔗 {recipe.link}
              </a>
            </div>
          ) : recipe.description ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '14px 18px', marginBottom: 18,
            }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                הוראות הכנה
              </div>
              <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {recipe.description}
              </div>
            </div>
          ) : null}


          {/* Footer - FIXED JUMPING */}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <motion.button
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCopy(recipe)}
              style={{
                flex: 1, 
                height: 46, // Fixed height prevents vertical jumping
                padding: '0 12px',
                background: isCopied ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isCopied ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 13, 
                color: isCopied ? '#34d399' : '#94a3b8',
                fontSize: 14, 
                cursor: 'pointer', 
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap', // Prevents text wrapping from changing height
                transition: 'background 0.25s, border 0.25s, color 0.25s', // Exclude 'all' to prevent layout-related transitions
              }}
            >
              {isCopied ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  ✓ הועתק
                </motion.span>
              ) : (
                <span>📋 העתק מתכון</span>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{
                flex: 1, 
                height: 46, // Match height of the copy button
                padding: '0 12px',
                background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                border: 'none', 
                borderRadius: 13,
                color: '#f0fff8', 
                fontSize: 14, 
                cursor: 'pointer', 
                fontFamily: 'inherit', 
                fontWeight: 600,
              }}
            >
              סגור
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  };
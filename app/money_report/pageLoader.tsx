'use client';

import { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useOptions } from '../options';
import IsraelTime from '../components/IsraelTime';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFirebaseLogic } from '../components/FirebaseLogic';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ─── Floating particle canvas ──────────────────────────────────────────────

function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width  = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const particles = Array.from({ length: 80 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 1.8 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.15 + 0.03,
      drift: (Math.random() - 0.5) * 0.08,
      pulse: Math.random() * Math.PI * 2,
      gold:  Math.random() > 0.5,
    }));

    let frame = 0;
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      for (const p of particles) {
        const twinkle = Math.sin(frame * 0.02 + p.pulse) * 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(212,168,83,${p.alpha + twinkle})`
          : `rgba(52,211,153,${p.alpha + twinkle})`;
        ctx.fill();
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -4)    { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4)      p.x = W + 4;
        if (p.x > W + 4)   p.x = -4;
      }
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', inset: 0, zIndex: 0,
      pointerEvents: 'none', opacity: 0.55,
    }} />
  );
}

// ─── Animated orbs ─────────────────────────────────────────────────────────

const ORBS = [
  { size: 650, x: '-12%', y: '-10%', color: 'rgba(6,78,59,0.40)',    dur: 20 },
  { size: 500, x: '58%',  y: '5%',   color: 'rgba(52,211,153,0.10)', dur: 26 },
  { size: 420, x: '15%',  y: '52%',  color: 'rgba(212,168,83,0.08)', dur: 22 },
  { size: 380, x: '70%',  y: '58%',  color: 'rgba(4,120,87,0.14)',   dur: 30 },
];

function Orbs() {
  return (
    <>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          animate={{ x: [0,25,-18,12,0], y: [0,-20,18,-8,0], scale: [1,1.06,0.97,1.03,1] }}
          transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 2 }}
          style={{
            position: 'fixed', width: o.size, height: o.size,
            left: o.x, top: o.y, borderRadius: '50%',
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            pointerEvents: 'none', zIndex: 0, filter: 'blur(1px)',
          }}
        />
      ))}
    </>
  );
}

// ─── Glass card ─────────────────────────────────────────────────────────────

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

// ─── Field label ─────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'rgba(52,211,153,0.65)', marginBottom: 7, fontWeight: 600, fontFamily: 'inherit',
    }}>
      {children}
    </div>
  );
}

// ─── Dark input ───────────────────────────────────────────────────────────────

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
      onFocus={e => (e.target.style.borderColor = 'rgba(52,211,153,0.55)')}
      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
    />
  );
}

// ─── Primary button ────────────────────────────────────────────────────────

function PrimaryBtn({ children, disabled, onClick, type = 'button' }: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.02, boxShadow: '0 6px 28px rgba(52,211,153,0.28)' } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      style={{
        background: disabled
          ? 'rgba(52,211,153,0.12)'
          : 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
        border: 'none', borderRadius: 12, padding: '13px 20px',
        color: disabled ? '#34d399' : '#f0fff8',
        fontSize: 15, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.03em', width: '100%',
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(52,211,153,0.18)',
        transition: 'all 0.25s',
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ConfirmActionType =
  | { type: 'delete-product'; id: string }
  | { type: 'delete-fixed';   id: string };

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MoneyReportPage() {
  const router = useRouter();
  const { hebrew_font } = useOptions();

  const {
    products, pastProducts, fixedExpenses,
    loading, error, setError,
    currentUser, authLoading, submitting,
    activeTab, setActiveTab,
    selectedMonth, setSelectedMonth, availableMonths,
    addProduct, deleteProduct,
    addFixedExpense, deleteFixedExpense,
    getUsername, getCombinedProducts, calculateUserTotals,
  } = useFirebaseLogic();

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [productName,        setProductName]        = useState('');
  const [price,              setPrice]              = useState('');
  const [fixedExpenseName,   setFixedExpenseName]   = useState('');
  const [fixedExpenseAmount, setFixedExpenseAmount] = useState('');
  const [showFixedForm,      setShowFixedForm]      = useState(false);
  const [showConfirmDialog,  setShowConfirmDialog]  = useState(false);
  const [confirmAction,      setConfirmAction]      = useState<ConfirmActionType | null>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function hebrewDateFormat(ts?: Timestamp | Date | string): string {
    if (!ts) return 'N/A';
    const d = ts instanceof Date ? ts : typeof ts === 'string' ? new Date(ts) : new Date(ts.toMillis());
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const hh = String(d.getHours()).padStart(2,'0');
    const mi = String(d.getMinutes()).padStart(2,'0');
    return `${dd}.${mm} — ${hh}:${mi}`;
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await addProduct(productName, price)) { setProductName(''); setPrice(''); }
  };

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await addFixedExpense(fixedExpenseName, fixedExpenseAmount)) {
      setFixedExpenseName(''); setFixedExpenseAmount(''); setShowFixedForm(false);
    }
  };

  const handleDeleteProduct      = (id: string) => { setConfirmAction({ type: 'delete-product', id }); setShowConfirmDialog(true); };
  const handleDeleteFixedExpense = (id: string) => { setConfirmAction({ type: 'delete-fixed',   id }); setShowConfirmDialog(true); };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete-product') await deleteProduct(confirmAction.id);
    else await deleteFixedExpense(confirmAction.id);
    setShowConfirmDialog(false); setConfirmAction(null);
  };

  // ─── Variants ─────────────────────────────────────────────────────────────

  const sectionV = {
    hidden:  { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.42 } },
    exit:    { opacity: 0, y: -14, transition: { duration: 0.26 } },
  };
  const rowV = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.055 } },
  };
  const cellV = {
    hidden:  { opacity: 0, x: 10 },
    visible: { opacity: 1, x: 0  },
  };

  // ─── Tab config ───────────────────────────────────────────────────────────

  const TABS = [
    { key: 'current',         label: 'חודש נוכחי',    icon: '📅' },
    { key: 'past',            label: 'חודשים קודמים', icon: '🗂️' },
    { key: 'fixed_spendings', label: 'הוצאות קבועות', icon: '📌' },
  ] as const;

  // ─── Auth guards ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{ background: '#040d08' }}
        dir="rtl">
        <motion.p
          animate={{ opacity: [0.3,1,0.3] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{ color: '#34d399', fontSize: 18, letterSpacing: '0.12em' }}
        >
          טוען...
        </motion.p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}
        style={{ background: '#040d08' }}>
        <p style={{ color: '#f0e8d8', fontSize: 18 }}>יש להתחבר כדי לצפות ולנהל הוצאות.</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #040d08 !important; }
        select option { background: #0a2218; color: #f0e8d8; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.35; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #1a4030; border-radius: 2px; }
      `}</style>

      {/* ── Background layers ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 110% 55% at 50% 0%, #052918 0%, #040d08 65%)',
      }} />
      <FloatingParticles />
      <Orbs />
      {/* Grain overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: 0.5,
      }} />

      {/* ── Confirm dialog ── */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={confirmAction?.type === 'delete-product' ? 'למחוק הוצאה?' : 'למחוק הוצאה קבועה?'}
        message={confirmAction?.type === 'delete-product' ? 'האם למחוק את ההוצאה הזאת?' : 'האם למחוק את ההוצאה הקבועה הזאת?'}
        confirmText="אישור" cancelText="ביטול"
        onConfirm={handleConfirm}
        onCancel={() => { setShowConfirmDialog(false); setConfirmAction(null); }}
        isDangerous
      />

      {/* ── Home button ── */}
      <motion.button
        onClick={() => router.push('/')}
        className="fixed top-6 right-6 z-80"
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
      <div
        dir="rtl"
        className={hebrew_font.className}
        style={{ position: 'relative', zIndex: 10, minHeight: '100vh', padding: '0 16px 100px' }}
      >
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
            💰
          </motion.div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(36px,8vw,58px)', fontWeight: 300,
            letterSpacing: '0.04em', color: '#f0e8d8', lineHeight: 1.05, margin: 0,
          }}>
            דוח הוצאות
          </h1>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            style={{
              margin: '16px auto 0', width: 160, height: 1,
              background: 'linear-gradient(90deg, transparent, #d4a853, #34d399, transparent)',
            }}
          />
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                maxWidth: 680, margin: '0 auto 20px',
                background: 'rgba(220,38,38,0.13)', border: '1px solid rgba(220,38,38,0.28)',
                borderRadius: 12, padding: '12px 18px',
                color: '#fca5a5', fontSize: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}
                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ maxWidth: 680, margin: '0 auto' }}>

          {/* ── Tab bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              display: 'flex', gap: 4,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 50, padding: 4, marginBottom: 36,
            }}
          >
            {TABS.map(({ key, label, icon }) => {
              const active = activeTab === key;
              return (
                <motion.button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 46,
                    border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                    letterSpacing: '0.02em', transition: 'color 0.2s',
                    background: active
                      ? 'linear-gradient(135deg, #064e3b, #34d399)'
                      : 'transparent',
                    color: active ? '#f0fff8' : '#4a6a5a',
                  }}
                >
                  {icon} {label}
                </motion.button>
              );
            })}
          </motion.div>

          {/* ── Tab content ── */}
          <AnimatePresence mode="wait">

            {/* ══ Current month ══ */}
            {activeTab === 'current' && (
              <motion.div key="current" variants={sectionV} initial="hidden" animate="visible" exit="exit">

                {/* Add product form */}
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.05 }}>
                  <GlassCard style={{ padding: '26px 24px', marginBottom: 22 }}>
                    <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 400, color: '#f0e8d8', margin: '0 0 22px' }}>
                      הוסף הוצאה חדשה
                    </h2>
                    <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      <div>
                        <FieldLabel>שם הוצאה</FieldLabel>
                        <DarkInput type="text" value={productName}
                          onChange={e => setProductName(e.target.value)}
                          placeholder="הכנס שם הוצאה" disabled={submitting} />
                      </div>
                      <div>
                        <FieldLabel>מחיר (₪)</FieldLabel>
                        <DarkInput type="number" step="0.01" value={price}
                          onChange={e => setPrice(e.target.value)}
                          placeholder="0.00" disabled={submitting} />
                      </div>
                      <PrimaryBtn type="submit" disabled={submitting}>
                        {submitting ? '...מוסיף' : '+ הוסף הוצאה'}
                      </PrimaryBtn>
                    </form>
                  </GlassCard>
                </motion.div>

                {/* User totals */}
                {(products.length > 0 || fixedExpenses.length > 0) && (
                  <motion.div
                    initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.12 }}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}
                  >
                    {Object.entries(calculateUserTotals(products, true)).map(([user, total], i) => (
                      <motion.div
                        key={user} whileHover={{ scale: 1.03, y: -2 }}
                        style={{
                          background: i === 0
                            ? 'linear-gradient(135deg,rgba(52,211,153,0.11),rgba(6,78,59,0.18))'
                            : 'linear-gradient(135deg,rgba(212,168,83,0.11),rgba(120,80,20,0.18))',
                          border: `1px solid ${i===0?'rgba(52,211,153,0.22)':'rgba(212,168,83,0.22)'}`,
                          borderRadius: 18, padding: '18px 20px',
                          boxShadow: `0 4px 20px ${i===0?'rgba(52,211,153,0.07)':'rgba(212,168,83,0.07)'}`,
                        }}
                      >
                        <div style={{ fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color: i===0?'#34d399':'#d4a853', marginBottom:6, fontWeight:600 }}>
                          סה״כ הוצאות
                        </div>
                        <div style={{ fontSize:22, fontFamily:"'Cormorant Garamond',serif", color:'#f0e8d8', fontWeight:400, marginBottom:4 }}>
                          {user}
                        </div>
                        <div style={{ fontSize:20, fontWeight:600, color: i===0?'#34d399':'#d4a853' }}>
                          ₪{total.toFixed(2)}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Products table */}
                <GlassCard style={{ overflow: 'hidden', marginBottom: 24 }}>
                  <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, color:'#f0e8d8', margin:0 }}>
                      רשימת הוצאות
                    </h2>
                  </div>

                  {loading ? (
                    <div style={{ padding:40, textAlign:'center', color:'#4a6a5a' }}>טוען הוצאות...</div>
                  ) : products.length === 0 && fixedExpenses.length === 0 ? (
                    <div style={{ padding:44, textAlign:'center' }}>
                      <div style={{ fontSize:34, marginBottom:10 }}>🌱</div>
                      <div style={{ color:'#4a6a5a', fontSize:15 }}>אין הוצאות עדיין</div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', direction: 'rtl' }} dir="rtl">
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            {/* Reversed headers: Name first, Action last */}
                            {['שם הוצאה', 'מחיר', 'מי', 'תאריך', 'פעולה'].map((col) => (
                              <th
                                key={col}
                                style={{
                                  padding: '11px 14px',
                                  textAlign: 'center',
                                  fontSize: 11,
                                  minWidth: col === 'שם הוצאה' ? '180px' : 'auto',
                                  letterSpacing: '0.1em',
                                  textTransform: 'uppercase',
                                  color: 'rgba(52,211,153,0.55)',
                                  fontWeight: 600,
                                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                                  background: 'rgba(0,0,0,0.14)',
                                }}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <motion.tbody variants={rowV} initial="hidden" animate="visible">
                          {getCombinedProducts().map((product) => (
                            <motion.tr
                              key={product.id}
                              variants={cellV}
                              whileHover={{ background: 'rgba(52,211,153,0.04)' }}
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                transition: 'background 0.18s',
                              }}
                            >
                              {/* Column 1: Product Name */}
                              <td style={{ padding: '13px 14px', textAlign: 'center', fontSize: 14, color: '#ccc0ac' }}>
                                {product.product}
                              </td>

                              {/* Column 2: Price */}
                              <td style={{ padding: '13px 14px', textAlign: 'center', fontSize: 14, color: '#34d399', fontWeight: 600 }}>
                                ₪{product.price.toFixed(2)}
                              </td>

                              {/* Column 3: Who */}
                              <td style={{ padding: '13px 14px', textAlign: 'center', fontSize: 14, color: '#f0e8d8', fontWeight: 500 }}>
                                {getUsername(product.createdBy)}
                              </td>

                              {/* Column 4: Date */}
                              <td style={{ padding: '13px 14px', textAlign: 'center', fontSize: 12, color: '#5a8a70', whiteSpace: 'nowrap' }}>
                                {product.isFixedExpense ? 'קבועה' : hebrewDateFormat(product.timestamp)}
                              </td>

                              {/* Column 5: Action (Delete) */}
                              <td style={{ padding: '13px 14px', textAlign: 'center' }}>
                                {!product.isFixedExpense ? (
                                  <motion.button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.92 }}
                                    style={{
                                      background: 'rgba(239,68,68,0.08)',
                                      border: '1px solid rgba(239,68,68,0.2)',
                                      borderRadius: 8,
                                      padding: '4px 10px',
                                      color: '#f87171',
                                      fontSize: 12,
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                      fontFamily: 'inherit',
                                    }}
                                  >
                                    מחק
                                  </motion.button>
                                ) : (
                                  <span style={{ fontSize: 15 }}>📌</span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </motion.tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {/* ══ Past months ══ */}
            {activeTab === 'past' && (
              <motion.div key="past" variants={sectionV} initial="hidden" animate="visible" exit="exit">

                <GlassCard style={{ padding:'24px', marginBottom:22 }}>
                  <FieldLabel>בחר חודש</FieldLabel>
                  {availableMonths.length > 0 ? (
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      style={{
                        width:'100%', background:'rgba(5,40,26,0.7)',
                        border:'1px solid rgba(255,255,255,0.11)',
                        borderRadius:11, padding:'11px 14px',
                        color:'#f0e8d8', fontSize:15, outline:'none',
                        cursor:'pointer', fontFamily:'inherit',
                      }}
                    >
                      {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <div style={{ color:'#4a6a5a', paddingTop:10, fontSize:14 }}>לא נמצאו חודשים קודמים.</div>
                  )}
                </GlassCard>

                <GlassCard style={{ overflow:'hidden' }}>
                  <div style={{ padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                    <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:400, color:'#f0e8d8', margin:0 }}>
                      הוצאות עבר — {selectedMonth}
                    </h2>
                  </div>

                  {loading ? (
                    <div style={{ padding:40, textAlign:'center', color:'#4a6a5a' }}>טוען הוצאות...</div>
                  ) : !selectedMonth || pastProducts.length === 0 ? (
                    <div style={{ padding:44, textAlign:'center' }}>
                      <div style={{ fontSize:34, marginBottom:10 }}>📭</div>
                      <div style={{ color:'#4a6a5a', fontSize:15 }}>עדיין אין הוצאות קודמות.</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                        {Object.entries(calculateUserTotals(pastProducts)).map(([user, total], i) => (
                          <motion.div
                            key={user} whileHover={{ scale:1.02 }}
                            style={{
                              background: i===0
                                ? 'linear-gradient(135deg,rgba(52,211,153,0.09),rgba(6,78,59,0.14))'
                                : 'linear-gradient(135deg,rgba(212,168,83,0.09),rgba(120,80,20,0.14))',
                              border:`1px solid ${i===0?'rgba(52,211,153,0.18)':'rgba(212,168,83,0.18)'}`,
                              borderRadius:14, padding:'15px 18px',
                            }}
                          >
                            <div style={{ fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:i===0?'#34d399':'#d4a853', marginBottom:4, fontWeight:600 }}>סה״כ</div>
                            <div style={{ fontSize:20, fontFamily:"'Cormorant Garamond',serif", color:'#f0e8d8', marginBottom:2 }}>{user}</div>
                            <div style={{ fontSize:18, fontWeight:600, color:i===0?'#34d399':'#d4a853' }}>₪{total.toFixed(2)}</div>
                          </motion.div>
                        ))}
                      </div>

                      <div style={{ overflowX:'auto' }} dir="ltr">
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                          <thead>
                            <tr>
                              {['תאריך','משתמש','מחיר','שם הוצאה'].map(col => (
                                <th key={col} style={{
                                  padding:'11px 14px', textAlign:'center',
                                  fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase',
                                  color:'rgba(52,211,153,0.55)', fontWeight:600,
                                  borderBottom:'1px solid rgba(255,255,255,0.07)',
                                  background:'rgba(0,0,0,0.14)',
                                }}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pastProducts.map(product => (
                              <tr key={product.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding:'13px 14px', textAlign:'center', fontSize:12, color:'#5a8a70', whiteSpace:'nowrap' }}>
                                  {product.isFixedExpense ? 'קבועה' : hebrewDateFormat(product.timestamp)}
                                </td>
                                <td style={{ padding:'13px 14px', textAlign:'center', fontSize:14, color:'#f0e8d8', fontWeight:500 }}>
                                  {getUsername(product.createdBy)}
                                </td>
                                <td style={{ padding:'13px 14px', textAlign:'center', fontSize:14, color:'#34d399', fontWeight:600 }}>
                                  ₪{product.price.toFixed(2)}
                                </td>
                                <td style={{ padding:'13px 14px', textAlign:'center', fontSize:14, color:'#ccc0ac' }}>
                                  {product.product}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {/* ══ Fixed expenses ══ */}
            {activeTab === 'fixed_spendings' && (
              <motion.div key="fixed" variants={sectionV} initial="hidden" animate="visible" exit="exit">
                <GlassCard style={{ padding:'26px 24px' }}>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                    <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:400, color:'#f0e8d8', margin:0 }}>
                      הוצאות קבועות
                    </h2>
                    <motion.button
                      onClick={() => setShowFixedForm(!showFixedForm)}
                      whileHover={{ scale:1.05 }} whileTap={{ scale:0.96 }}
                      style={{
                        background: showFixedForm
                          ? 'rgba(255,255,255,0.05)'
                          : 'linear-gradient(135deg,#064e3b,#34d399)',
                        border: showFixedForm ? '1px solid rgba(255,255,255,0.1)' : 'none',
                        borderRadius:50, padding:'9px 20px',
                        color: showFixedForm ? '#5a8a70' : '#f0fff8',
                        fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                        boxShadow: showFixedForm ? 'none' : '0 4px 18px rgba(52,211,153,0.2)',
                        transition:'all 0.2s',
                      }}
                    >
                      {showFixedForm ? 'ביטול' : '+ הוסף הוצאה קבועה'}
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {showFixedForm && (
                      <motion.form
                        onSubmit={handleAddFixedExpense}
                        initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                        transition={{ duration:0.3 }}
                        style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:24, paddingBottom:24, borderBottom:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' }}
                      >
                        <div>
                          <FieldLabel>שם ההוצאה הקבועה</FieldLabel>
                          <DarkInput type="text" value={fixedExpenseName}
                            onChange={e => setFixedExpenseName(e.target.value)}
                            placeholder="שכירות, חשמל, אינטרנט..." disabled={submitting} />
                        </div>
                        <div>
                          <FieldLabel>סכום חודשי (₪)</FieldLabel>
                          <DarkInput type="number" step="0.01" value={fixedExpenseAmount}
                            onChange={e => setFixedExpenseAmount(e.target.value)}
                            placeholder="0.00" disabled={submitting} />
                        </div>
                        <PrimaryBtn type="submit" disabled={submitting}>
                          {submitting ? '...מוסיף' : 'הוסף הוצאה קבועה'}
                        </PrimaryBtn>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {fixedExpenses.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'32px 0' }}>
                      <div style={{ fontSize:34, marginBottom:10 }}>📌</div>
                      <div style={{ color:'#4a6a5a', fontSize:14 }}>אין הוצאות קבועות מוגדרות עדיין</div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {fixedExpenses.map(expense => (
                        <motion.div
                          key={expense.id} layout
                          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                          exit={{ opacity:0, x:-30 }}
                          whileHover={{ scale:1.01, x:-2 }}
                          style={{
                            display:'flex', justifyContent:'space-between', alignItems:'center',
                            background:'rgba(52,211,153,0.04)',
                            border:'1px solid rgba(52,211,153,0.14)',
                            borderRadius:14, padding:'14px 18px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize:15, color:'#f0e8d8', fontWeight:500, marginBottom:3 }}>
                              {expense.name}
                            </div>
                            <div style={{ fontSize:12, color:'#4a6a5a', letterSpacing:'0.04em' }}>
                              {getUsername(expense.createdBy)}
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                            <span style={{ fontSize:17, fontWeight:600, color:'#34d399' }}>
                              ₪{expense.amount.toFixed(2)}
                            </span>
                            <motion.button
                              onClick={() => handleDeleteFixedExpense(expense.id)}
                              whileHover={{ scale:1.1 }} whileTap={{ scale:0.9 }}
                              style={{
                                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                                borderRadius:8, padding:'4px 10px', color:'#f87171',
                                fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                              }}
                            >
                              מחק
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1, duration:0.6 }}
            style={{ marginTop:40, textAlign:'center' }} dir="ltr"
          >
            <IsraelTime />
          </motion.div>
        </div>
      </div>
    </>
  );
}
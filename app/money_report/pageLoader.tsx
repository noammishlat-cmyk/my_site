'use client';

import { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useOptions } from '../options';
import IsraelTime from '../components/IsraelTime';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFirebaseLogic } from '../components/FirebaseLogic';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'דוח הוצאות',
  description: 'מציג את ההוצאות החודשיות',
};

type ConfirmActionType =
  | { type: 'delete-product'; id: string }
  | { type: 'delete-fixed'; id: string };

export default function MoneyReportPage() {
  const router = useRouter();
  const { hebrew_font } = useOptions();

  const {
    products,
    pastProducts,
    fixedExpenses,
    loading,
    error,
    setError,
    currentUser,
    authLoading,
    submitting,
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    addProduct,
    deleteProduct,
    addFixedExpense,
    deleteFixedExpense,
    getUsername,
    getCombinedProducts,
    calculateUserTotals,
  } = useFirebaseLogic();

  // ─── UI-only state ─────────────────────────────────────────────────────────

  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [fixedExpenseName, setFixedExpenseName] = useState('');
  const [fixedExpenseAmount, setFixedExpenseAmount] = useState('');
  const [showFixedExpenseForm, setShowFixedExpenseForm] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(null);

  // ─── Background gradient ───────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--background',
      'linear-gradient(135deg, #064e3b, #34d399)'
    );
    document.documentElement.style.setProperty('--foreground', '#ffffff');
  }, []);

  // ─── Animation variants ────────────────────────────────────────────────────

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20, },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.97 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function hebrewDateFormat(timestamp?: Timestamp | Date | string): string {
    if (!timestamp) return 'N/A';

    const date =
      timestamp instanceof Date
        ? timestamp
        : typeof timestamp === 'string'
        ? new Date(timestamp)
        : new Date(timestamp.toMillis());

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month} - ${hours}:${minutes}`;
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addProduct(productName, price);
    if (ok) {
      setProductName('');
      setPrice('');
    }
  };

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addFixedExpense(fixedExpenseName, fixedExpenseAmount);
    if (ok) {
      setFixedExpenseName('');
      setFixedExpenseAmount('');
      setShowFixedExpenseForm(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setConfirmAction({ type: 'delete-product', id });
    setShowConfirmDialog(true);
  };

  const handleDeleteFixedExpense = (id: string) => {
    setConfirmAction({ type: 'delete-fixed', id });
    setShowConfirmDialog(true);
  };

  const handleConfirmDialogConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete-product') {
      await deleteProduct(confirmAction.id);
    } else {
      await deleteFixedExpense(confirmAction.id);
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const handleConfirmDialogCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // ─── Auth guards ───────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}>
        <p className="text-lg text-gray-500">טוען...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${hebrew_font.className}`}>
        <p className="text-lg">יש להתחבר כדי לצפות ולנהל מוצרים.</p>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={confirmAction?.type === 'delete-product' ? 'למחוק הוצאה?' : 'למחוק הוצאה קבועה?'}
        message={
          confirmAction?.type === 'delete-product'
            ? 'האם למחוק את ההוצאה הזאת?'
            : 'האם למחוק את ההוצאה הקבועה הזאת?'
        }
        confirmText="אישור"
        cancelText="ביטול"
        onConfirm={handleConfirmDialogConfirm}
        onCancel={handleConfirmDialogCancel}
        isDangerous={true}
      />

      <motion.button
        onClick={() => router.push('/')}
        className="fixed top-6 right-6 bg-zinc-800 p-4 rounded-2xl"
        whileHover={{ scale: 1.05, filter: 'brightness(1.3)' }}
      >
        <Image className="invert" src="/home_icon.svg" width="32" height="32" alt="Back" />
      </motion.button>

      <div className="p-8" />

      <div className={hebrew_font.className}>
        <motion.main
          dir="rtl"
          className="container mx-auto px-4 py-8 rounded-4xl bg-gradient-to-b from-zinc-700 to-zinc-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.h1
            className="text-3xl font-bold mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            דוח הוצאות
          </motion.h1>

          {error && (
            <motion.div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.div>
          )}

          {/* Tabs */}
          <motion.div
            className="flex gap-2 mb-8 border-b"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {(
              [
                { key: 'current', label: 'חודש נוכחי' },
                { key: 'past', label: 'חודשים קודמים' },
                { key: 'fixed_spendings', label: 'הוצאות קבועות' },
              ] as const
            ).map((tab) => (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-semibold transition ${
                  activeTab === tab.key
                    ? 'text-blue-200 border-b-2 border-blue-600'
                    : 'text-gray-400 hover:text-blue-300'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.label}
              </motion.button>
            ))}
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait">

            {/* ── Current month ─────────────────────────────────────────── */}
            {activeTab === 'current' && (
              <motion.div
                key="current"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Add product form */}
                <motion.div
                  className="bg-zinc-100 shadow rounded-lg p-6 mb-8"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <h2 className="text-2xl text-zinc-700 font-semibold mb-4">הוסף הוצאה חדשה</h2>
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        שם מוצר
                      </label>
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="text-zinc-700 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="הכנס שם הוצאה"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        מחיר
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="text-zinc-700 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="הכנס מחיר"
                        disabled={submitting}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 transition"
                    >
                      {submitting ? '...מוסיף' : 'הוסף הוצאה'}
                    </button>
                  </form>
                </motion.div>

                {/* User totals */}
                {(products.length > 0 || fixedExpenses.length > 0) && (
                  <motion.div
                    className="grid grid-cols-2 gap-4 mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    {Object.entries(calculateUserTotals(products, true)).map(([user, total]) => (
                      <motion.div
                        key={user}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-sm text-gray-600">סה&quot;כ הוצאות</p>
                        <p className="text-2xl font-bold text-blue-600">{user}</p>
                        <p className="text-lg text-blue-700">&#x20AA;{total.toFixed(2)}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Products list */}
                <motion.div
                  dir="ltr"
                  className="bg-zinc-200 shadow rounded-lg overflow-hidden mb-8"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.35, delay: 0.15 }}
                >
                  <div dir="rtl" className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-2xl text-zinc-700 font-semibold">רשימת הוצאות</h2>
                  </div>

                  {loading ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">טוען הוצאות...</p>
                    </div>
                  ) : products.length === 0 && fixedExpenses.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">אין הוצאות עדיין.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            {['פעולה', 'תאריך הוצאה', 'בוצע על ידי', 'מחיר', 'שם הוצאה'].map(
                              (col) => (
                                <th
                                  key={col}
                                  className="px-6 py-3 text-center text-sm font-semibold text-gray-700"
                                >
                                  {col}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <motion.tbody
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {getCombinedProducts().map((product) => (
                            <motion.tr
                              key={product.id}
                              className="border-b hover:bg-gray-50 transition"
                              variants={itemVariants}
                            >
                              <td className="px-6 py-4 text-sm text-center">
                                {!product.isFixedExpense && (
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="text-red-600 hover:text-red-800 font-semibold transition"
                                  >
                                    מחק
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 text-center">
                                {product.isFixedExpense
                                  ? 'הוצאה קבועה'
                                  : hebrewDateFormat(product.timestamp)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 font-semibold text-center">
                                {getUsername(product.createdBy)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 text-center">
                                &#x20AA;{product.price.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 text-center">
                                {product.product}
                              </td>
                            </motion.tr>
                          ))}
                        </motion.tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ── Past months ───────────────────────────────────────────── */}
            {activeTab === 'past' && (
              <motion.div
                key="past"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div
                  className="bg-zinc-100 shadow rounded-lg p-6 mb-8"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    בחר חודש
                  </label>
                  {availableMonths.length > 0 ? (
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 text-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableMonths.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-500">לא נמצאו חודשים קודמים.</p>
                  )}
                </motion.div>

                <motion.div
                  className="bg-zinc-100 shadow rounded-lg overflow-hidden"
                  variants={cardVariants}>
                  <h2 className="text-2xl font-semibold p-6 border-b text-zinc-600">
                    הוצאות עבר - {selectedMonth}
                  </h2>

                  {loading ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">טוען הוצאות...</p>
                    </div>
                  ) : !selectedMonth || pastProducts.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">עדיין אין הוצאות קודמות.</p>
                    </div>
                  ) : (
                    <>
                      {/* User totals for past */}
                      <div className="grid grid-cols-2 gap-4 p-6 border-b bg-gray-50">
                        {Object.entries(calculateUserTotals(pastProducts)).map(
                          ([user, total]) => (
                            <motion.div
                              key={user}
                              className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                              variants={cardVariants}
                              initial="hidden"
                              animate="visible"
                              whileHover={{ scale: 1.02 }}
                            >
                              <p className="text-sm text-gray-600">סה&quot;כ הוצאות</p>
                              <p className="text-2xl font-bold text-blue-600">{user}</p>
                              <p className="text-lg text-blue-700">&#x20AA;{total.toFixed(2)}</p>
                            </motion.div>
                          )
                        )}
                      </div>

                      <div className="overflow-x-auto" dir="ltr">
                        <table className="w-full">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              {['תאריך הוצאה', 'בוצע על ידי', 'מחיר', 'שם הוצאה'].map((col) => (
                                <th
                                  key={col}
                                  className="px-6 py-3 text-center text-sm font-semibold text-gray-700"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {pastProducts.map((product) => (
                              <tr
                                key={product.id}
                                className="border-b hover:bg-gray-50 transition"
                              >
                                <td className="px-6 py-4 text-sm text-gray-900 text-center">
                                  {product.isFixedExpense
                                    ? 'הוצאה קבועה'
                                    : hebrewDateFormat(product.timestamp)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-center">
                                  {getUsername(product.createdBy)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 font-semibold text-center">
                                  &#x20AA;{product.price.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 text-center">
                                  {product.product}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ── Fixed expenses ────────────────────────────────────────── */}
            {activeTab === 'fixed_spendings' && (
              <motion.div
                key="fixed"
                variants={sectionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div
                  className="bg-zinc-100 shadow rounded-lg p-6 mb-8"
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl text-zinc-700 font-semibold">
                      הוצאות קבועות חודשיות
                    </h2>
                    <button
                      onClick={() => setShowFixedExpenseForm(!showFixedExpenseForm)}
                      className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
                    >
                      {showFixedExpenseForm ? 'ביטול' : 'הוסף הוצאה קבועה'}
                    </button>
                  </div>

                  {showFixedExpenseForm && (
                    <form
                      onSubmit={handleAddFixedExpense}
                      className="space-y-4 mb-6 pb-6 border-b"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          שם ההוצאה הקבועה
                        </label>
                        <input
                          type="text"
                          value={fixedExpenseName}
                          onChange={(e) => setFixedExpenseName(e.target.value)}
                          className="text-zinc-700 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="למשתמש: שכירות, חשמל וכו'"
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          סכום חודשי
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={fixedExpenseAmount}
                          onChange={(e) => setFixedExpenseAmount(e.target.value)}
                          className="text-zinc-700 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="הכנס סכום"
                          disabled={submitting}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400 transition"
                      >
                        {submitting ? '...מוסיף' : 'הוסף הוצאה קבועה'}
                      </button>
                    </form>
                  )}

                  {fixedExpenses.length === 0 ? (
                    <p className="text-gray-500">אין הוצאות קבועות מוגדרות עדיין</p>
                  ) : (
                    <div className="space-y-2">
                      {fixedExpenses.map((expense) => (
                        <motion.div
                          key={expense.id}
                          className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-md"
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ scale: 1.01 }}
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{expense.name}</p>
                            <p className="text-sm text-gray-600">
                              {getUsername(expense.createdBy)}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-semibold text-green-600">
                              &#x20AA;{expense.amount.toFixed(2)}
                            </p>
                            <button
                              onClick={() => handleDeleteFixedExpense(expense.id)}
                              className="text-red-600 hover:text-red-800 font-semibold transition"
                            >
                              מחק
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div dir="ltr">
            <IsraelTime />
          </div>
        </motion.main>
      </div>
    </>
  );
}
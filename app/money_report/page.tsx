'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '@/app/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  doc,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useOptions } from '../options';
import IsraelTime from '../components/IsraelTime';
import ConfirmDialog from '../components/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import Image from "next/image"
import { useRouter } from "next/navigation";


interface Product {
  id: string;
  product: string;
  price: number;
  createdBy: string;
  timestamp?: Timestamp;
  isFixedExpense?: boolean;
}

interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  createdBy: string;
  isActive: boolean;
  createdAt?: Timestamp;
}

type TabType = 'current' | 'past' | 'fixed_spendings';

export default function MoneyReportPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [pastProducts, setPastProducts] = useState<Product[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [showFixedExpenseForm, setShowFixedExpenseForm] = useState(false);
  const [fixedExpensesLoaded, setFixedExpensesLoaded] = useState(false);

  // Form state
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [fixedExpenseName, setFixedExpenseName] = useState('');
  const [fixedExpenseAmount, setFixedExpenseAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { hebrew_font } = useOptions();

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete-product' | 'delete-fixed'; id: string } | null>(null);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.97 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } }
  };

  function hebrewDateFormat(timestamp?: Timestamp | Date | string): string {
    if (!timestamp) return 'N/A';

    const date = timestamp instanceof Date
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

  useEffect(() => {
    // Use a real CSS linear-gradient string, NOT Tailwind classes
    const gradientValue = "linear-gradient(135deg, #064e3b, #34d399)"; 
    
    document.documentElement.style.setProperty('--background', gradientValue);
    
    // Optional: If you want to change the text color to white for the gradient
    document.documentElement.style.setProperty('--foreground', '#ffffff');
  }, []);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setCurrentUser(user.email);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-archive when entering a new month
  useEffect(() => {
    const checkAndArchive = async () => {
      if (!currentUser || !fixedExpensesLoaded) return;

      const today = new Date();
      const currentMonth = today.toLocaleString('he-IL', { year: 'numeric', month: 'long' });

      try {
        // Check last archived month from Firestore
        const settingsDoc = await getDocs(query(collection(db, 'archive_metadata')));
        let lastArchivedMonth = '';

        if (settingsDoc.empty) {
          const metadataRef = doc(collection(db, 'archive_metadata'), 'current');
          await setDoc(metadataRef, { lastArchivedMonth: currentMonth }, { merge: true });
          return;
        }

        lastArchivedMonth = settingsDoc.docs[0].data().lastArchivedMonth || '';

        // Only archive if the month has changed
        if (lastArchivedMonth === currentMonth) {
          return;
        }

        // Fetch all current products
        const q = query(collection(db, 'products'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.size > 0) {
          const batch = writeBatch(db);

          querySnapshot.forEach((productDoc) => {
            const data = productDoc.data();
            const newDocRef = doc(collection(db, 'past_products'));
            batch.set(newDocRef, {
              product: data.product,
              price: data.price,
              createdBy: data.createdBy,
              timestamp: data.timestamp,
              archivedDate: Timestamp.now(),
            });
            batch.delete(doc(db, 'products', productDoc.id));
          });

          // Archive active fixed expenses for this month
          fixedExpenses.forEach((expense) => {
            if (expense.isActive) {
              const newDocRef = doc(collection(db, 'past_products'));
              batch.set(newDocRef, {
                product: `[הוצאה קבועה] ${expense.name}`,
                price: expense.amount,
                createdBy: expense.createdBy,
                timestamp: Timestamp.now(),
                archivedDate: Timestamp.now(),
                isFixedExpense: true,
              });
            }
          });

          // Update archive metadata
          const metadataRef = doc(collection(db, 'archive_metadata'), 'current');
          batch.set(metadataRef, { lastArchivedMonth: currentMonth }, { merge: true });

          await batch.commit();
          // Refresh products after archiving
          setProducts([]);
        }
      } catch (err) {
        console.error('Error auto-archiving products:', err);
      }
    };

    checkAndArchive();
  }, [currentUser, fixedExpenses]);

  // Fetch fixed expenses
  useEffect(() => {
    if (!currentUser) return;

    const fetchFixedExpenses = async () => {
      try {
        const q = query(collection(db, 'fixed_expenses'));
        const querySnapshot = await getDocs(q);
        const expensesData: FixedExpense[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isActive !== false) {
            expensesData.push({
              id: docSnap.id,
              ...data,
            } as FixedExpense);
          }
        });

        setFixedExpenses(expensesData);
        setFixedExpensesLoaded(true);
      } catch (err) {
        console.error('Error fetching fixed expenses:', err);
      }
    };

    fetchFixedExpenses();
  }, [currentUser]);

  // Fetch past products by month
  const fetchPastProductsByMonth = useCallback(async (month: string) => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'past_products'));
      const filtered: Product[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.timestamp) {
          const date = new Date(data.timestamp.toMillis());
          const itemMonth = date.toLocaleString('he-IL', { year: 'numeric', month: 'long' });
          if (itemMonth === month) {
            filtered.push({
              id: docSnap.id,
              ...data,
            } as Product);
          }
        }
      });

      setPastProducts(filtered);
    } catch (err) {
      console.error('Error fetching past products:', err);
      setError('Failed to load past products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch available months from past_products
  const fetchAvailableMonths = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'past_products'));
      const months = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.timestamp) {
          const date = new Date(data.timestamp.toMillis());
          const month = date.toLocaleString('he-IL', { year: 'numeric', month: 'long' });
          months.add(month);
        }
      });

      const sortedMonths = Array.from(months).sort().reverse();
      setAvailableMonths(sortedMonths);

      if (sortedMonths.length > 0 && !selectedMonth) {
        setSelectedMonth(sortedMonths[0]);
        await fetchPastProductsByMonth(sortedMonths[0]);
      }
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  }, [selectedMonth, fetchPastProductsByMonth]);

  // Fetch products based on active tab
  useEffect(() => {
    if (!currentUser) return;

    if (activeTab === 'current') {
      const fetchCurrentProducts = async () => {
        try {
          setLoading(true);
          const q = query(
            collection(db, 'products'),
            orderBy('timestamp', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const productsData: Product[] = [];

          querySnapshot.forEach((docSnap) => {
            productsData.push({
              id: docSnap.id,
              ...docSnap.data(),
            } as Product);
          });

          setProducts(productsData);
          setError(null);
        } catch (err) {
          console.error('Error fetching products:', err);
          setError('Failed to load products');
        } finally {
          setLoading(false);
        }
      };

      fetchCurrentProducts();
    } else {
      const loadPastMonths = async () => {
        setLoading(true);
        await fetchAvailableMonths();
        setLoading(false);
      };
      loadPastMonths();
    }
  }, [activeTab, currentUser, fetchAvailableMonths]);

  // Fetch past products when month changes
  useEffect(() => {
    if (activeTab === 'past' && selectedMonth) {
      fetchPastProductsByMonth(selectedMonth);
    }
  }, [selectedMonth, activeTab, fetchPastProductsByMonth]);

  // Extract username from email
  const getUsername = (email: string): string => {
    return email.split('@')[0];
  };

  const getCombinedProducts = (): Product[] => {
    const combined: Product[] = [...products];
    
    fixedExpenses.forEach((expense) => {
      combined.push({
        id: expense.id,
        product: `[הוצאה קבועה] ${expense.name}`,
        price: expense.amount,
        createdBy: expense.createdBy,
        timestamp: expense.createdAt,
        isFixedExpense: true,
      });
    });
    
    return combined.sort((a, b) => {
      const timeA = a.timestamp?.toMillis() ?? 0;
      const timeB = b.timestamp?.toMillis() ?? 0;
      return timeB - timeA;
    });
  };

  // Calculate total spending per user
  const calculateUserTotals = (items: Product[], includeFixed: boolean = false): { [key: string]: number } => {
    const totals: { [key: string]: number } = {};
    items.forEach((item) => {
      const username = getUsername(item.createdBy);
      totals[username] = (totals[username] || 0) + item.price;
    });

    if (includeFixed) {
      fixedExpenses.forEach((expense) => {
        const username = getUsername(expense.createdBy);
        totals[username] = (totals[username] || 0) + expense.amount;
      });
    }

    return totals;
  };

  // Delete a product
  const handleDeleteProduct = async (productId: string) => {
    setConfirmAction({ type: 'delete-product', id: productId });
    setShowConfirmDialog(true);
  };

  const confirmDeleteProduct = async () => {
    if (!confirmAction || confirmAction.type !== 'delete-product') return;

    try {
      const collectionName = activeTab === 'current' ? 'products' : 'past_products';
      await deleteDoc(doc(db, collectionName, confirmAction.id));

      if (activeTab === 'current') {
        setProducts(products.filter((p) => p.id !== confirmAction.id));
      } else {
        setPastProducts(pastProducts.filter((p) => p.id !== confirmAction.id));
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    } finally {
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  // Add fixed expense
  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fixedExpenseName.trim() || !fixedExpenseAmount.trim() || !currentUser) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await addDoc(collection(db, 'fixed_expenses'), {
        name: fixedExpenseName.trim(),
        amount: parseFloat(fixedExpenseAmount),
        createdBy: currentUser,
        isActive: true,
        createdAt: Timestamp.now(),
      });

      // Reset form
      setFixedExpenseName('');
      setFixedExpenseAmount('');
      setShowFixedExpenseForm(false);

      // Refresh fixed expenses list
      const q = query(collection(db, 'fixed_expenses'));
      const querySnapshot = await getDocs(q);
      const expensesData: FixedExpense[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isActive !== false) {
          expensesData.push({
            id: docSnap.id,
            ...data,
          } as FixedExpense);
        }
      });

      setFixedExpenses(expensesData);
    } catch (err) {
      console.error('Error adding fixed expense:', err);
      setError('Failed to add fixed expense');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete fixed expense
  const handleDeleteFixedExpense = async (expenseId: string) => {
    setConfirmAction({ type: 'delete-fixed', id: expenseId });
    setShowConfirmDialog(true);
  };

  const confirmDeleteFixedExpense = async () => {
    if (!confirmAction || confirmAction.type !== 'delete-fixed') return;

    try {
      await deleteDoc(doc(db, 'fixed_expenses', confirmAction.id));
      setFixedExpenses(fixedExpenses.filter((e) => e.id !== confirmAction.id));
    } catch (err) {
      console.error('Error deleting fixed expense:', err);
      setError('Failed to delete fixed expense');
    } finally {
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const handleConfirmDialogConfirm = () => {
    if (confirmAction?.type === 'delete-product') {
      confirmDeleteProduct();
    } else if (confirmAction?.type === 'delete-fixed') {
      confirmDeleteFixedExpense();
    }
  };

  const handleConfirmDialogCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // Handle form submission
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName.trim() || !price.trim() || !currentUser) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await addDoc(collection(db, 'products'), {
        product: productName.trim(),
        price: parseFloat(price),
        createdBy: currentUser,
        timestamp: Timestamp.now(),
      });

      // Reset form
      setProductName('');
      setPrice('');

      // Refresh products list
      const q = query(
        collection(db, 'products'),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const productsData: Product[] = [];

      querySnapshot.forEach((docSnap) => {
        productsData.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Product);
      });

      setProducts(productsData);
    } catch (err) {
      console.error('Error adding product:', err);
      setError('Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

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
        onClick={() => router.push("/")}
        className="fixed top-6 right-6 bg-zinc-800 p-4 rounded-2xl"
        whileHover={{ scale: 1.05, filter: "brightness(1.3)" }}>
        <Image className="invert" src="/home_icon.svg" width="32" height="32" alt="Back" />
      </motion.button>

      <div className="p-8"></div>
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
          <motion.button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'current'
                ? 'text-blue-200 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-blue-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            חודש נוכחי
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'past'
                ? 'text-blue-200 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-blue-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            חודשים קודמים
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('fixed_spendings')}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === 'fixed_spendings'
                ? 'text-blue-200 border-b-2 border-blue-600'
                : 'text-gray-400 hover:text-blue-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            הוצאות קבועות
          </motion.button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'current' ? (
            <motion.div
              key="current"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Add Product Form */}
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

            {/* User Totals */}
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

            {/* Products List */}
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
                  <table className="w-full" >
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                          פעולה
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                          תאריך הוצאה
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                          בוצע על ידי
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                          מחיר
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                          שם הוצאה
                        </th>
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
                            {!product.isFixedExpense ? (
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-800 font-semibold transition"
                            >
                              מחק
                            </button>
                            ) : 
                            (
                              <></>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-center">
                            {product.isFixedExpense ? 'הוצאה קבועה' : hebrewDateFormat(product.timestamp)}
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
        ) : activeTab === 'past' ? (
            <motion.div
              key="past"
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Past Products */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <motion.div className="bg-zinc-100 shadow rounded-lg overflow-hidden">
              <h2 className="text-2xl font-semibold p-6 border-b text-zinc-600">הוצאות עבר - {selectedMonth}</h2>

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
                  {/* User Totals for Past */}
                  <div className="grid grid-cols-2 gap-4 p-6 border-b bg-gray-50">
                    {Object.entries(calculateUserTotals(pastProducts)).map(([user, total]) => (
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
                  </div>

                  <div className="overflow-x-auto" dir="ltr">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                            תאריך הוצאה
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                            בוצע על ידי
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                            מחיר
                          </th>
                          <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                            שם הוצאה
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastProducts.map((product) => (
                          <tr
                            key={product.id}
                            className="border-b hover:bg-gray-50 transition"
                          >
                            <td className="px-6 py-4 text-sm text-gray-900 text-center">
                              {product.isFixedExpense ? 'הוצאה קבועה' : hebrewDateFormat(product.timestamp)}
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
        ) : (
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
                <h2 className="text-2xl text-zinc-700 font-semibold">הוצאות קבועות חודשיות</h2>
                <button
                  onClick={() => setShowFixedExpenseForm(!showFixedExpenseForm)}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition"
                >
                  {showFixedExpenseForm ? 'ביטול' : 'הוסף הוצאה קבועה'}
                </button>
              </div>

              {showFixedExpenseForm && (
                <form onSubmit={handleAddFixedExpense} className="space-y-4 mb-6 pb-6 border-b">
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

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
  updateDoc,
  where,
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ─── Money Report Types ───────────────────────────────────────────────────────

export interface Product {
  id: string;
  product: string;
  price: number;
  createdBy: string;
  timestamp?: Timestamp;
  isFixedExpense?: boolean;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  createdBy: string;
  isActive: boolean;
  createdAt?: Timestamp;
}

export type TabType = 'current' | 'past' | 'fixed_spendings';

// ─── Dates Page Types ─────────────────────────────────────────────────────────

export interface DateItem {
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  category: string; // references DateCategory.id
  createdBy: string;
  timestamp?: Timestamp;
  completed?: boolean;
}

export interface DateCategory {
  id: string;
  label: string;
  color: string;
  emoji?: string;
  createdBy?: string;
}

// Convenience seed types (no id / createdBy / timestamp needed from callers)
export type SeedDateItem     = Omit<DateItem,     'id' | 'createdBy' | 'timestamp'>;
export type SeedDateCategory = { id: string } & Omit<DateCategory, 'id' | 'createdBy'>;

// ─── Kitchen&Home Page Types ─────────────────────────────────────────────────────────

export interface GroceryItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  createdBy: string;
  timestamp?: Timestamp;
  done?: boolean;
}

export interface RecipeItem {
  id: string;
  name: string;
  link?: string;
  ingredients?: string
  description?: string;
  createdBy: string;
  timestamp?: Timestamp;
}

export interface MovieItem {
  id: string;
  name: string;
  createdBy: string;
  timestamp?: Timestamp;
}

export interface MovieSiteItem {
  id: string;
  name: string;
  url: string;
  createdBy: string;
  timestamp?: Timestamp;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFirebaseLogic() {

  // ── Shared auth ────────────────────────────────────────────────────────────

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user?.email ?? null);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  //  MONEY REPORT
  // ══════════════════════════════════════════════════════════════════════════

  const [products,            setProducts]            = useState<Product[]>([]);
  const [pastProducts,        setPastProducts]        = useState<Product[]>([]);
  const [fixedExpenses,       setFixedExpenses]       = useState<FixedExpense[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [activeTab,           setActiveTab]           = useState<TabType>('current');
  const [selectedMonth,       setSelectedMonth]       = useState<string>('');
  const [availableMonths,     setAvailableMonths]     = useState<string[]>([]);
  const [fixedExpensesLoaded, setFixedExpensesLoaded] = useState(false);

  // ── Fixed expenses ─────────────────────────────────────────────────────────

  const fetchFixedExpenses = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'fixed_expenses')));
      const data: FixedExpense[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (raw.isActive !== false) data.push({ id: d.id, ...raw } as FixedExpense);
      });
      setFixedExpenses(data);
      setFixedExpensesLoaded(true);
    } catch (err) {
      console.error('Error fetching fixed expenses:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) fetchFixedExpenses();
  }, [currentUser, fetchFixedExpenses]);

  // ── Auto-archive ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentUser || !fixedExpensesLoaded) return;

    const checkAndArchive = async () => {
      const currentMonth = new Date().toLocaleString('he-IL', {
        year: 'numeric', month: 'long',
      });
      try {
        const metaSnap = await getDocs(query(collection(db, 'archive_metadata')));

        if (metaSnap.empty) {
          await setDoc(
            doc(collection(db, 'archive_metadata'), 'current'),
            { lastArchivedMonth: currentMonth },
            { merge: true },
          );
          return;
        }

        const lastArchived = metaSnap.docs[0].data().lastArchivedMonth ?? '';
        if (lastArchived === currentMonth) return;

        const snap = await getDocs(
          query(collection(db, 'products'), orderBy('timestamp', 'desc')),
        );

        if (snap.size > 0) {
          const batch = writeBatch(db);
          snap.forEach((pd) => {
            const d = pd.data();
            batch.set(doc(collection(db, 'past_products')), {
              product: d.product, price: d.price,
              createdBy: d.createdBy, timestamp: d.timestamp,
              archivedDate: Timestamp.now(),
            });
            batch.delete(doc(db, 'products', pd.id));
          });
          fixedExpenses.forEach((exp) => {
            if (exp.isActive) {
              batch.set(doc(collection(db, 'past_products')), {
                product: `[הוצאה קבועה] ${exp.name}`,
                price: exp.amount, createdBy: exp.createdBy,
                timestamp: Timestamp.now(), archivedDate: Timestamp.now(),
                isFixedExpense: true,
              });
            }
          });
          batch.set(
            doc(collection(db, 'archive_metadata'), 'current'),
            { lastArchivedMonth: currentMonth },
            { merge: true },
          );
          await batch.commit();
          setProducts([]);
        }
      } catch (err) {
        console.error('Error auto-archiving:', err);
      }
    };

    checkAndArchive();
  }, [currentUser, fixedExpenses, fixedExpensesLoaded]);

  // ── Current products ───────────────────────────────────────────────────────

  const fetchCurrentProducts = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, 'products'), orderBy('timestamp', 'desc')),
      );
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Past products ──────────────────────────────────────────────────────────

  const fetchPastProductsByMonth = useCallback(async (month: string) => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'past_products'));
      const filtered: Product[] = [];
      snap.forEach((d) => {
        const raw = d.data();
        if (raw.timestamp) {
          const itemMonth = new Date(raw.timestamp.toMillis()).toLocaleString('he-IL', {
            year: 'numeric', month: 'long',
          });
          if (itemMonth === month) filtered.push({ id: d.id, ...raw } as Product);
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

  const fetchAvailableMonths = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'past_products'));
      const months = new Set<string>();
      snap.forEach((d) => {
        const raw = d.data();
        if (raw.timestamp) {
          months.add(
            new Date(raw.timestamp.toMillis()).toLocaleString('he-IL', {
              year: 'numeric', month: 'long',
            }),
          );
        }
      });
      const sorted = Array.from(months).sort().reverse();
      setAvailableMonths(sorted);
      if (sorted.length > 0 && !selectedMonth) {
        setSelectedMonth(sorted[0]);
        await fetchPastProductsByMonth(sorted[0]);
      }
    } catch (err) {
      console.error('Error fetching months:', err);
    }
  }, [selectedMonth, fetchPastProductsByMonth]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'current') {
      fetchCurrentProducts();
    } else if (activeTab === 'past') {
      const load = async () => {
        setLoading(true);
        await fetchAvailableMonths();
        setLoading(false);
      };
      load();
    }
  }, [activeTab, currentUser, fetchCurrentProducts, fetchAvailableMonths]);

  useEffect(() => {
    if (activeTab === 'past' && selectedMonth) fetchPastProductsByMonth(selectedMonth);
  }, [selectedMonth, activeTab, fetchPastProductsByMonth]);

  // ── Money mutations ────────────────────────────────────────────────────────

  const addProduct = useCallback(async (
    productName: string, price: string,
  ): Promise<boolean> => {
    if (!productName.trim() || !price.trim() || !currentUser) {
      setError('Please fill in all fields'); return false;
    }
    try {
      setSubmitting(true); setError(null);
      await addDoc(collection(db, 'products'), {
        product: productName.trim(), price: parseFloat(price),
        createdBy: currentUser, timestamp: Timestamp.now(),
      });
      await fetchCurrentProducts();
      return true;
    } catch (err) {
      console.error(err); setError('Failed to add product'); return false;
    } finally { setSubmitting(false); }
  }, [currentUser, fetchCurrentProducts]);

  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, activeTab === 'current' ? 'products' : 'past_products', productId));
      if (activeTab === 'current') setProducts((p) => p.filter((x) => x.id !== productId));
      else setPastProducts((p) => p.filter((x) => x.id !== productId));
      return true;
    } catch (err) {
      console.error(err); setError('Failed to delete product'); return false;
    }
  }, [activeTab]);

  const addFixedExpense = useCallback(async (
    name: string, amount: string,
  ): Promise<boolean> => {
    if (!name.trim() || !amount.trim() || !currentUser) {
      setError('Please fill in all fields'); return false;
    }
    try {
      setSubmitting(true); setError(null);
      await addDoc(collection(db, 'fixed_expenses'), {
        name: name.trim(), amount: parseFloat(amount),
        createdBy: currentUser, isActive: true, createdAt: Timestamp.now(),
      });
      await fetchFixedExpenses();
      return true;
    } catch (err) {
      console.error(err); setError('Failed to add fixed expense'); return false;
    } finally { setSubmitting(false); }
  }, [currentUser, fetchFixedExpenses]);

  const deleteFixedExpense = useCallback(async (expenseId: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'fixed_expenses', expenseId));
      setFixedExpenses((p) => p.filter((e) => e.id !== expenseId));
      return true;
    } catch (err) {
      console.error(err); setError('Failed to delete fixed expense'); return false;
    }
  }, []);

  // ── Derived helpers (money) ────────────────────────────────────────────────

  const getUsername = (email: string) => email.split('@')[0];

  const getCombinedProducts = useCallback((): Product[] =>
    [
      ...products,
      ...fixedExpenses.map((e) => ({
        id: e.id,
        product: `[הוצאה קבועה] ${e.name}`,
        price: e.amount,
        createdBy: e.createdBy,
        timestamp: e.createdAt,
        isFixedExpense: true,
      })),
    ].sort(
      (a, b) => (b.timestamp?.toMillis() ?? 0) - (a.timestamp?.toMillis() ?? 0),
    ),
  [products, fixedExpenses]);

  const calculateUserTotals = useCallback(
    (items: Product[], includeFixed = false): Record<string, number> => {
      const totals: Record<string, number> = {};
      items.forEach((item) => {
        const user = getUsername(item.createdBy);
        totals[user] = (totals[user] ?? 0) + item.price;
      });
      if (includeFixed) {
        fixedExpenses.forEach((e) => {
          const user = getUsername(e.createdBy);
          totals[user] = (totals[user] ?? 0) + e.amount;
        });
      }
      return totals;
    },
    [fixedExpenses],
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  DATES PAGE
  // ══════════════════════════════════════════════════════════════════════════

  const [dateItems,      setDateItems]      = useState<DateItem[]>([]);
  const [activatedDateItems, AetactivatedDateItems] = useState<DateItem[]>([]);
  const [dateCategories, setDateCategories] = useState<DateCategory[]>([]);
  const [datesLoading,   setDatesLoading]   = useState(false);

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchDateItems = useCallback(async () => {
    try {
      setDatesLoading(true);
      const snap = await getDocs(
        query(collection(db, 'dates'), orderBy('timestamp', 'desc')),
      );
      setDateItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DateItem)));
    } catch (err) {
      console.error('Error fetching dates:', err);
    } finally {
      setDatesLoading(false);
    }
  }, []);

  const fetchUncompletedDates = useCallback(async () => {
    try {
      // 1. Add the 'where' constraint to the query
      const completedQuery = query(
        collection(db, 'dates'),
        where('completed', '==', false),
        orderBy('timestamp', 'desc')
      );

      const snap = await getDocs(completedQuery);
      
      // 2. Map the results to your state
      const completedItems = snap.docs.map((d) => ({ 
        id: d.id, 
        ...d.data() 
      } as DateItem));

      AetactivatedDateItems(completedItems);
    } catch (err) {
      console.error('Error fetching completed dates:', err);
    }
  }, []);

  const fetchDateCategories = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'date_categories'));
      setDateCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DateCategory)));
    } catch (err) {
      console.error('Error fetching date categories:', err);
    }
  }, []);

  // ── Seed on first run ──────────────────────────────────────────────────────
  // Called once from DatesPage after auth resolves.
  // Uses doc IDs from defaultCategories so seeded categories are idempotent.
  // Always fetches fresh data at the end whether seeding was needed or not.

  const seedDatesIfEmpty = useCallback(async (
    defaultDates:      SeedDateItem[],
    defaultCategories: SeedDateCategory[],
  ) => {
    setDatesLoading(true);
    try {
      const [datesSnap, catsSnap] = await Promise.all([
        getDocs(collection(db, 'dates')),
        getDocs(collection(db, 'date_categories')),
      ]);

      const batch = writeBatch(db);
      let   dirty = false;

      if (datesSnap.empty) {
        defaultDates.forEach((item) => {
          batch.set(doc(collection(db, 'dates')), {
            ...item, createdBy: 'system', timestamp: Timestamp.now(),
          });
        });
        dirty = true;
      }

      if (catsSnap.empty) {
        defaultCategories.forEach(({ id, ...rest }) => {
          // Use explicit doc ID so re-seeding is idempotent
          batch.set(doc(db, 'date_categories', id), { ...rest, createdBy: 'system' });
        });
        dirty = true;
      }

      if (dirty) await batch.commit();
    } catch (err) {
      console.error('Error seeding dates:', err);
    } finally {
      await Promise.all([fetchDateItems(), fetchDateCategories(), fetchUncompletedDates()]);
    }
  }, [fetchDateItems, fetchDateCategories, fetchUncompletedDates]);

  // ── Date mutations ─────────────────────────────────────────────────────────

  const addDateItem = useCallback(async (
    item: Omit<DateItem, 'id' | 'createdBy' | 'timestamp'>,
  ): Promise<boolean> => {
    if (!item.title.trim() || !currentUser) return false;
    try {
      await addDoc(collection(db, 'dates'), {
        ...item, createdBy: currentUser, timestamp: Timestamp.now(), completed: false,
      });
      await fetchDateItems();
      await fetchUncompletedDates();
      return true;
    } catch (err) {
      console.error('Error adding date:', err); return false;
    }
  }, [currentUser, fetchDateItems, fetchUncompletedDates]);

  const deleteDateItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'dates', id));
      setDateItems((p) => p.filter((d) => d.id !== id));
      fetchDateItems()
      fetchUncompletedDates()
      return true;
    } catch (err) {
      console.error('Error deleting date:', err); return false;
    }
  }, [fetchUncompletedDates, fetchDateItems]);

  // Add 'completed' to the arguments so the function knows what value to set
const setDateItemCompleted = useCallback(async (id: string, completed: boolean): Promise<boolean> => {
  try {
    const docRef = doc(db, 'dates', id);

    await updateDoc(docRef, {
      completed: completed
    });

    setDateItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed } : item
      )
    );
    await fetchUncompletedDates();

    return true;
  } catch (err) {
    console.error('Error updating completion status:', err);
    return false;
  }
}, [fetchUncompletedDates]);

  const updateDateItem = async (id: string, data: Partial<SeedDateItem>) => {
    try {
      const docRef = doc(db, "dates", id); // Replace "dates" with your collection name
      await updateDoc(docRef, data);
      fetchDateItems()
      return true;
    } catch (error) {
      console.error("Error updating document: ", error);
      return false;
    }
  };

  // ── Category mutations ─────────────────────────────────────────────────────

  const addDateCategory = useCallback(async (
    cat: Omit<DateCategory, 'id' | 'createdBy'>,
  ): Promise<boolean> => {
    if (!cat.label.trim() || !currentUser) return false;
    try {
      await addDoc(collection(db, 'date_categories'), { ...cat, createdBy: currentUser });
      await fetchDateCategories();
      return true;
    } catch (err) {
      console.error('Error adding category:', err); return false;
    }
  }, [currentUser, fetchDateCategories]);

  const deleteDateCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'date_categories', id));
      setDateCategories((p) => p.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting category:', err); return false;
    }
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  //  Home&Kitchen PAGE
  // ══════════════════════════════════════════════════════════════════════════

  // ── Shopping List ─────────────────────────────────────────────────────
  const [grocerysLoading,   setGrocerysLoading]   = useState(false);
  const [gorcerieLoadedOnce, setGrocerieLoadedOnce] = useState(false)
  const [grocerysItems,      setGrocerysItems]      = useState<GroceryItem[]>([]);

  const addGroceryItem = useCallback(async (
    item: Omit<GroceryItem, 'id' | 'createdBy' | 'timestamp | done'>,
  ): Promise<boolean> => {
    if (!item.name.trim() || !currentUser) return false;
    try {
      await addDoc(collection(db, 'grocery'), {
        ...item, createdBy: currentUser, timestamp: Timestamp.now(), completed: false,
      });
      return true;
    } catch (err) {
      console.error('Error adding date:', err); return false;
    }
  }, [currentUser]);

  const fetchGroceryItems = useCallback(async () => {
    try {
      if (!gorcerieLoadedOnce)
      {
        setGrocerysLoading(true);
        setGrocerieLoadedOnce(true);
      }
      const snap = await getDocs(
        query(collection(db, 'grocery'), orderBy('timestamp', 'desc')), // Changed from 'dates'
      );
      setGrocerysItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroceryItem)));
    } catch (err) {
      console.error('Error fetching groceries:', err);
    } finally {
      setGrocerysLoading(false);
    }
  }, [gorcerieLoadedOnce]);

  const setGroceryAmount = useCallback(async (id: string, amount: number) => {
    try {
      const docRef = doc(db, 'grocery', id);
      await updateDoc(docRef, { amount });
      await fetchGroceryItems(); // Refresh list after update
    } catch (err) {
      console.error(err);
    }
  }, [fetchGroceryItems]);

  const toggleGroceryAmountMode = useCallback(async (id: string) => {
  try {
    const docRef = doc(db, 'grocery', id);
    
    // 1. Pull the specific document
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const currentAmount = docSnap.data().amount || 0; // Fallback to 0 if undefined
      
      // 2. Check the value and determine the new one
      // Example: If it's 1, set to 0. If it's 0, set to 1.
      const newAmount = currentAmount === 0 ? 1 : 0;

      // 3. Move onwards with the update
      await updateDoc(docRef, { amount: newAmount });
      
      await fetchGroceryItems(); 
    } else {
      console.error("Document does not exist");
    }
  } catch (err) {
    console.error("Error toggling amount:", err);
  }
}, [fetchGroceryItems]);

  const toggleGroceryItemDone = useCallback(async (id: string, done: boolean) => {
    try {
      const docRef = doc(db, 'grocery', id);
      await updateDoc(docRef, { done });
      await fetchGroceryItems(); // Refresh list after update
    } catch (err) {
      console.error(err);
    }
  }, [fetchGroceryItems]);

  const deleteGroceryItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'grocery', id));
      setGrocerysItems((p) => p.filter((d) => d.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting date:', err); return false;
    }
  }, []);

  // ── Recipes ─────────────────────────────────────────────────────

  const [recipesLoading,   setRecipesLoading]   = useState(false);
  const [recipeItems,      setRecipeItems]      = useState<RecipeItem[]>([]);

  const fetchRecipeItems = useCallback(async () => {
    try {
      setRecipesLoading(true);
      const snap = await getDocs(
        query(collection(db, 'recepies'), orderBy('timestamp')),
      );
      setRecipeItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroceryItem)));
    } catch (err) {
      console.error('Error fetching recipes:', err);
    } finally {
      setRecipesLoading(false);
    }
  }, []);

  const addRecipeItem = useCallback(async (
    item: Omit<RecipeItem, 'id' | 'createdBy' | 'timestamp '>,
  ): Promise<boolean> => {
    if (!item.name.trim() || !currentUser) return false;
    try {
      await addDoc(collection(db, 'recepies'), {
        ...item, createdBy: currentUser, timestamp: Timestamp.now(), completed: false,
      });
      fetchRecipeItems();
      return true;
    } catch (err) {
      console.error('Error adding date:', err); return false;
    }
  }, [currentUser, fetchRecipeItems]);

  const deleteRecipeItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'recepies', id));
      setMovieItems((p) => p.filter((d) => d.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting date:', err); return false;
    }
  }, []);
  
  // ── Movies ─────────────────────────────────────────────────────

  const [moviesLoading,   setMoviesLoading]   = useState(false);
  const [movieItems,      setMovieItems]      = useState<MovieItem[]>([]);
  const [movieSitesLoading,   setMoviesSiteLoading]   = useState(false);
  const [movieSiteItems,      setMovieSiteItems]      = useState<MovieSiteItem[]>([]);

  const fetchMovieItems = useCallback(async () => {
    try {
      setMoviesLoading(true);
      const snap = await getDocs(
        query(collection(db, 'movies'), orderBy('timestamp')),
      );
      setMovieItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MovieItem)));
    } catch (err) {
      console.error('Error fetching movies:', err);
    } finally {
      setMoviesLoading(false);
    }
  }, []);

  const addMovieItem = useCallback(async (
    item: Omit<MovieItem, 'id' | 'createdBy' | 'timestamp '>,
  ): Promise<boolean> => {
    if (!item.name.trim() || !currentUser) return false;
    try {
      await addDoc(collection(db, 'movies'), {
        ...item, createdBy: currentUser, timestamp: Timestamp.now()
      });
      fetchMovieItems();
      return true;
    } catch (err) {
      console.error('Error adding date:', err); return false;
    }
  }, [currentUser, fetchMovieItems]);

  const deleteMovieItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'movies', id));
      setMovieItems((p) => p.filter((d) => d.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting date:', err); return false;
    }
  }, []);

  const fetchMovieSiteItems = useCallback(async () => {
    try {
      setMoviesSiteLoading(true);
      const snap = await getDocs(
        query(collection(db, 'movie_sites'), orderBy('timestamp')),
      );
      setMovieSiteItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MovieSiteItem)));
    } catch (err) {
      console.error('Error fetching movie site:', err);
    } finally {
      setMoviesSiteLoading(false);
    }
  }, []);

  const addMovieSiteItem = useCallback(async (
    item: Omit<MovieSiteItem, 'id' | 'createdBy' | 'timestamp '>,
  ): Promise<boolean> => {
    if (!item.name.trim() || !currentUser) return false;
    try {
      await addDoc(collection(db, 'movie_sites'), {
        ...item, createdBy: currentUser, timestamp: Timestamp.now()
      });
      fetchMovieSiteItems();
      return true;
    } catch (err) {
      console.error('Error adding date:', err); return false;
    }
  }, [currentUser, fetchMovieSiteItems]);

  const deleteMovieSiteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, 'movie_sites', id));
      setMovieSiteItems((p) => p.filter((d) => d.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting date:', err); return false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  //  RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // ── Shared ──
    currentUser,
    authLoading,
    submitting,
    error,
    setError,
    getUsername,

    // ── Money report ──
    products,
    pastProducts,
    fixedExpenses,
    loading,
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    addProduct,
    deleteProduct,
    addFixedExpense,
    deleteFixedExpense,
    getCombinedProducts,
    calculateUserTotals,

    // ── Dates page ──
    dateItems,
    activatedDateItems,
    dateCategories,
    datesLoading,
    seedDatesIfEmpty,
    addDateItem,
    deleteDateItem,
    setDateItemCompleted,
    addDateCategory,
    updateDateItem,
    deleteDateCategory,

    // ── Kitchen&Home page ──
    addGroceryItem,
    setGrocerysLoading,
    grocerysLoading,
    fetchGroceryItems,
    grocerysItems,
    setGrocerysItems,
    toggleGroceryAmountMode,
    setGroceryAmount,
    deleteGroceryItem,
    toggleGroceryItemDone,
    recipesLoading,
    recipeItems,
    addRecipeItem,
    deleteRecipeItem,
    fetchRecipeItems,
    fetchMovieItems,
    movieItems,
    addMovieItem,
    deleteMovieItem,
    moviesLoading,
    movieSitesLoading,
    movieSiteItems,
    fetchMovieSiteItems,
    addMovieSiteItem,
    deleteMovieSiteItem,
  };
}
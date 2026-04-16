'use client';

import { useState, useEffect } from 'react';
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
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useOptions } from '../options';

interface Product {
  id: string;
  product: string;
  price: number;
  createdBy: string;
  timestamp?: Timestamp;
}

type TabType = 'current' | 'past';

export default function MoneyReportPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pastProducts, setPastProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [archivedToday, setArchivedToday] = useState(false);

  // Form state
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { bgColor } = useOptions();

  function hebrewDateFormat(date: Date): string {
    return date.toLocaleDateString('he-IL');
  }

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

  // Auto-archive on 1st of month
  useEffect(() => {
    const checkAndArchive = async () => {
      if (!currentUser) return;

      const today = new Date();
      const isFirstOfMonth = today.getDate() === 1;

      if (!isFirstOfMonth || archivedToday) return;

      try {
        // Check last archive date from Firestore
        const settingsDoc = await getDocs(query(collection(db, 'archive_metadata')));
        let lastArchiveDate = '';

        if (!settingsDoc.empty) {
          lastArchiveDate = settingsDoc.docs[0].data().lastArchiveDate || '';
        }

        const todayString = today.toDateString();

        // Only archive if it hasn't been archived today
        if (lastArchiveDate === todayString) {
          setArchivedToday(true);
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

          // Update archive metadata
          const metadataRef = doc(collection(db, 'archive_metadata'), 'current');
          batch.set(metadataRef, { lastArchiveDate: todayString }, { merge: true });

          await batch.commit();
          setArchivedToday(true);
          setProducts([]);
        }
      } catch (err) {
        console.error('Error auto-archiving products:', err);
      }
    };

    checkAndArchive();
  }, [currentUser, archivedToday]);

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
  }, [activeTab, currentUser]);

  // Fetch past products when month changes
  useEffect(() => {
    if (activeTab === 'past' && selectedMonth) {
      fetchPastProductsByMonth(selectedMonth);
    }
  }, [selectedMonth, activeTab]);

  // Extract username from email
  const getUsername = (email: string): string => {
    return email.split('@')[0];
  };

  // Format date for display
  const formatDate = (timestamp?: Timestamp): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toMillis()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate total spending per user
  const calculateUserTotals = (items: Product[]): { [key: string]: number } => {
    const totals: { [key: string]: number } = {};
    items.forEach((item) => {
      const username = getUsername(item.createdBy);
      totals[username] = (totals[username] || 0) + item.price;
    });
    return totals;
  };

  // Delete a product
  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const collectionName = activeTab === 'current' ? 'products' : 'past_products';
      await deleteDoc(doc(db, collectionName, productId));

      if (activeTab === 'current') {
        setProducts(products.filter((p) => p.id !== productId));
      } else {
        setPastProducts(pastProducts.filter((p) => p.id !== productId));
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    }
  };

  // Fetch available months from past_products
  const fetchAvailableMonths = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'past_products'));
      const months = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.timestamp) {
          const date = new Date(data.timestamp.toMillis());
          const month = date.toLocaleString('en-US', { year: 'numeric', month: 'long' });
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
  };

  // Fetch past products by month
  const fetchPastProductsByMonth = async (month: string) => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'past_products'));
      const filtered: Product[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.timestamp) {
          const date = new Date(data.timestamp.toMillis());
          const itemMonth = date.toLocaleString('en-US', { year: 'numeric', month: 'long' });
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">יש להתחבר כדי לצפות ולנהל מוצרים.</p>
      </div>
    );
  }

  return (
    <main dir="rtl" className="container mx-auto px-4 py-8" style={{backgroundColor: bgColor}}>
      <h1 className="text-3xl font-bold mb-8">דוח הוצאות</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'current'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-300'
          }`}
        >
          חודש נוכחי
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 font-semibold transition ${
            activeTab === 'past'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-300'
          }`}
        >
          חודשים קודמים
        </button>
      </div>

      {activeTab === 'current' ? (
        <>
          {/* Add Product Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
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
          </div>

          {/* User Totals */}
          {products.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {Object.entries(calculateUserTotals(products)).map(([user, total]) => (
                <div key={user} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">סה&quot;כ הוצאות</p>
                  <p className="text-2xl font-bold text-blue-600">{user}</p>
                  <p className="text-lg text-blue-700">&#x20AA;{total.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Products List */}
          <div dir="ltr" className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div dir="rtl" className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl text-zinc-700 font-semibold">רשימת הוצאות</h2>
            </div>

            {loading ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">טוען הוצאות...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">!אין הוצאות עדיין. הוסף אחת כדי להתחיל</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        תאריך
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        הוצאה
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        מחיר
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        על ידי
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                        פעולה
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hebrewDateFormat(new Date(formatDate(product.timestamp)))}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {product.product}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                          &#x20AA;{product.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {getUsername(product.createdBy)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-800 font-semibold transition"
                          >
                            מחק
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Past Products */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
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
              <p className="text-gray-500">No archived months available yet.</p>
            )}
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <h2 className="text-2xl font-semibold p-6 border-b">Past Spendings - {selectedMonth}</h2>

            {loading ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Loading spendings...</p>
              </div>
            ) : !selectedMonth || pastProducts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No archived spendings yet.</p>
              </div>
            ) : (
              <>
                {/* User Totals for Past */}
                <div className="grid grid-cols-2 gap-4 p-6 border-b bg-gray-50">
                  {Object.entries(calculateUserTotals(pastProducts)).map(([user, total]) => (
                    <div key={user} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total spending</p>
                      <p className="text-2xl font-bold text-blue-600">{user}</p>
                      <p className="text-lg text-blue-700">${total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Spending
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          By
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="border-b hover:bg-gray-50 transition"
                        >
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {hebrewDateFormat(new Date(formatDate(product.timestamp)))}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {product.product}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                            ${product.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {getUsername(product.createdBy)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-800 font-semibold transition"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}

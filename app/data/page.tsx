"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useOptions } from "../options";

interface DataItem {
  id: string;
  name: string;
  value: string;
}

export default function Data() {
  const [data, setData] = useState<DataItem[]>([]);
  const { user } = useOptions();

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        const querySnapshot = await getDocs(collection(db, "data"));
        const items: DataItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as DataItem);
        });
        setData(items);
      };
      fetchData();
    }
  }, [user]);

  if (!user) {
    return <div>Please login to view data.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Data</h1>
      <ul>
        {data.map((item) => (
          <li key={item.id} className="mb-2">
            {item.name}: {item.value}
          </li>
        ))}
      </ul>
    </div>
  );
}

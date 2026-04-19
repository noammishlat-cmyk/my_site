"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Fredoka } from 'next/font/google'
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';

const hebrew_font = Fredoka({
  subsets: ['latin'],
  display: 'swap',
})

interface OptionsContextType {
  hebrew_font: any;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const OptionsContext = createContext<OptionsContextType | undefined>(undefined);

export function OptionsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <OptionsContext.Provider value={{hebrew_font, user, login, logout }}>
      {children}
    </OptionsContext.Provider>
  );
}

export function useOptions() {
  const context = useContext(OptionsContext);
  if (!context) {
    throw new Error("useOptions must be used within OptionsProvider");
  }
  return context;
}

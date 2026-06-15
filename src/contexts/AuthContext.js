import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  getRedirectResult, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    // Set local persistence explicitly and capture redirect credentials
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        return getRedirectResult(auth);
      })
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((e) => {
        console.warn("Firebase persistence/redirect error:", e);
      });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      if (u) {
        // Write/Update user profile document in Firestore
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || '',
          photoURL: u.photoURL || '',
          lastLogin: new Date().toISOString(),
        }, { merge: true }).catch(err => {
          console.error("Error saving user profile to Firestore:", err);
        });
      }
    });
    return unsub;
  }, []);

  const logout = async () => {
    setUser(null);
    try {
      await signOut(auth);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Check custom claim first (production approach)
          const tokenResult = await user.getIdTokenResult();
          const hasAdminClaim = tokenResult.claims.role === 'admin';

          // Fallback: also allow admin via env variable (works without running setAdminClaim.js)
          const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
          const isAdminEmail = adminEmail && user.email === adminEmail;

          setIsAdmin(hasAdminClaim || isAdminEmail);
        } catch (err) {
          console.error('Failed to get token claims:', err.message);
          // Last resort fallback
          const adminEmail = process.env.REACT_APP_ADMIN_EMAIL;
          setIsAdmin(adminEmail && user.email === adminEmail);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  const value = { currentUser, isAdmin, loading, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
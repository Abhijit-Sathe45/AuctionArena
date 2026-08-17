import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [organizer, setOrganizer] = useState(() => {
    const saved = localStorage.getItem('organizerInfo');
    return saved ? JSON.parse(saved) : null;
  });
  const [superAdmin, setSuperAdmin] = useState(() => {
    const saved = localStorage.getItem('superAdminEmail');
    return saved || null;
  });

  function loginOrganizer(token, info) {
    localStorage.setItem('organizerToken', token);
    localStorage.setItem('organizerInfo', JSON.stringify(info));
    setOrganizer(info);
  }
  function logoutOrganizer() {
    localStorage.removeItem('organizerToken');
    localStorage.removeItem('organizerInfo');
    setOrganizer(null);
  }
  function loginSuperAdmin(token, email) {
    localStorage.setItem('superAdminToken', token);
    localStorage.setItem('superAdminEmail', email);
    setSuperAdmin(email);
  }
  function logoutSuperAdmin() {
    localStorage.removeItem('superAdminToken');
    localStorage.removeItem('superAdminEmail');
    setSuperAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ organizer, superAdmin, loginOrganizer, logoutOrganizer, loginSuperAdmin, logoutSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

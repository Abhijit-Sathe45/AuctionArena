import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ tokenKey, children }) {
  const token = localStorage.getItem(tokenKey);
  if (!token) return <Navigate to={tokenKey === 'superAdminToken' ? '/super-admin/login' : '/organizer/login'} replace />;
  return children;
}

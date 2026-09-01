import React from 'react';

export default function StatusMessage({ type = 'info', message }) {
  if (!message) return null;
  const styles = {
    error: 'bg-rose/15 text-rose border-rose/40 font-medium',
    success: 'bg-mint/15 text-mint-dark border-mint/40 font-semibold',
    info: 'bg-sky/20 text-turf border-sky/40 font-medium',
  };
  return (
    <div className={`border rounded-xl px-4 py-3 text-xs sm:text-sm ${styles[type] || styles.info}`}>
      {message}
    </div>
  );
}

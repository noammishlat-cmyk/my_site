'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useOptions } from '../options';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'אישור',
  cancelText = 'ביטול',
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmDialogProps) {
  const { hebrew_font } = useOptions();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Matching your page depth */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-[#03060a]/70 backdrop-blur-md z-[110]"
            onClick={onCancel}
          />

          {/* Modal Container */}
          <div 
            className={`fixed inset-0 flex items-center justify-center z-[120] pointer-events-none p-4 ${hebrew_font.className}`}
            dir="rtl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="w-full max-w-sm pointer-events-auto overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 24,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Content */}
              <div className="p-8">
                <h2 style={{ 
                  fontSize: 22, 
                  fontWeight: 600, 
                  color: '#f0e8d8', 
                  marginBottom: 12,
                  letterSpacing: '-0.01em'
                }}>
                  {title}
                </h2>
                <p style={{ 
                  fontSize: 15, 
                  color: '#94a3b8', 
                  lineHeight: '1.6',
                  marginBottom: 32 
                }}>
                  {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02, background: 'rgba(255, 255, 255, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onCancel}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 14,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cancelText}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onConfirm}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: 14,
                      border: 'none',
                      background: isDangerous 
                        ? 'linear-gradient(0deg, #693E3E, #C76C58)' 
                        : 'linear-gradient(0deg, #0284c7, #06b6d4)',
                      color: '#ffffff',
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: isDangerous 
                        ? '0 4px 14px rgba(239, 68, 68, 0.3)' 
                        : '0 4px 14px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    {confirmText}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
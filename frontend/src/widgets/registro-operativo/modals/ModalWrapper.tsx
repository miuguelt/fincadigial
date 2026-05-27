import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalWrapperProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ModalWrapper({ open, onClose, title, children }: ModalWrapperProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
            className="bg-card rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card z-10">
              <h2 className="font-bold text-lg">{title}</h2>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

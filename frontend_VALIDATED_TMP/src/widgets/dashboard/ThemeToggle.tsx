import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/shared/ui/cn.ts';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative h-9 w-9 flex items-center justify-center rounded-xl overflow-hidden transition-all duration-300",
        "bg-muted/50 hover:bg-primary/10 group focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
      )}
      aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: 20, rotate: 45, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -20, rotate: -45, opacity: 0 }}
          transition={{ duration: 0.3, ease: "backOut" }}
          className="flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform" />
          ) : (
            <Moon className="h-5 w-5 text-primary fill-primary/10 group-hover:scale-110 transition-transform" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

export default ThemeToggle;
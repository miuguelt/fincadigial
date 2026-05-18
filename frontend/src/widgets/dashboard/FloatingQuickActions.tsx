import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlus,
  IconScale,
  IconDroplet,
  IconSwitchHorizontal,
  IconQrcode,
  IconStethoscope,
  IconX,
} from "@/shared/ui/icons";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/ui/cn"; /** * FloatingQuickActions * * Un componente de tipo FAB (Floating Action Button) que despliega * accesos rápidos a las operaciones más comunes del sistema. * Diseñado con estética premium"Crystal Dock". */
export const FloatingQuickActions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const actions = [
    {
      id: "weight",
      icon: <IconScale size="md" />,
      label: "PESO",
      path: "/quick/control",
      color: "bg-info",
    },
    {
      id: "milk",
      icon: <IconDroplet size="md" />,
      label: "LECHE",
      path: "/quick/milk",
      color: "bg-primary",
    },
    {
      id: "transfer",
      icon: <IconSwitchHorizontal size="md" />,
      label: "MOVER",
      path: "/quick/transfer",
      color: "bg-success",
    },
    {
      id: "health",
      icon: <IconStethoscope size="md" />,
      label: "SALUD",
      path: "/quick/disease",
      color: "bg-danger",
    },
    {
      id: "scanner",
      icon: <IconQrcode size="md" />,
      label: "QR",
      path: "/scanner",
      color: "bg-surface",
    },
  ];
  const handleAction = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };
  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-[100] flex flex-col items-end gap-3 sm:gap-4">
      {" "}
      {/* Overlay cuando está abierto */}{" "}
      <AnimatePresence>
        {" "}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[-1]"
          />
        )}{" "}
      </AnimatePresence>{" "}
      {/* Menú de acciones */}{" "}
      <div className="flex flex-col items-end gap-3 mb-2">
        {" "}
        <AnimatePresence>
          {" "}
          {isOpen &&
            actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0, y: 20 }}
                transition={{
                  delay: (actions.length - index) * 0.05,
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                }}
                className="flex items-center gap-3"
              >
                {" "}
                <span className="bg-card px-3 py-1.5 rounded-xl shadow-[var(--shadow-token-lg)] text-[10px] font-black uppercase tracking-widest border border-border/50 text-foreground">
                  {" "}
                  {action.label}{" "}
                </span>{" "}
                <button
                  onClick={() => handleAction(action.path)}
                  className={cn(
                    "h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-[var(--radius-lg)] flex items-center justify-center text-white shadow-[var(--shadow-token-lg)] transition-transform hover:scale-110 active:scale-95",
                    action.color,
                  )}
                >
                  {" "}
                  {action.icon}{" "}
                </button>{" "}
              </motion.div>
            ))}{" "}
        </AnimatePresence>{" "}
      </div>{" "}
      {/* Botón Principal (FAB) */}{" "}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-12 w-12 sm:h-14 sm:w-14 rounded-[var(--radius-lg)] sm:rounded-[2rem] flex items-center justify-center text-white shadow-[var(--shadow-token-lg)] transition-all duration-500 relative overflow-hidden group",
          isOpen ? "bg-card rotate-90" : "bg-primary",
        )}
      >
        {" "}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />{" "}
        {isOpen ? (
          <IconX size="md" className="relative z-10" />
        ) : (
          <IconPlus size="lg" className="relative z-10" />
        )}{" "}
      </motion.button>{" "}
    </div>
  );
};
export default FloatingQuickActions;

import React, { createContext, useContext, useState, useEffect } from 'react';

interface FieldModeContextType {
  isFieldMode: boolean;
  toggleFieldMode: () => void;
}

const FieldModeContext = createContext<FieldModeContextType | undefined>(undefined);

export const FieldModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Cargar estado inicial desde localStorage para persistencia
  const [isFieldMode, setIsFieldMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('villaruz_field_mode');
    return saved === 'true';
  });

  const toggleFieldMode = () => {
    setIsFieldMode(prev => {
      const newState = !prev;
      localStorage.setItem('villaruz_field_mode', String(newState));
      return newState;
    });
  };

  // Aplicar atributo al body para estilado CSS global
  useEffect(() => {
    if (isFieldMode) {
      document.body.setAttribute('data-field-mode', 'true');
    } else {
      document.body.removeAttribute('data-field-mode');
    }
  }, [isFieldMode]);

  return (
    <FieldModeContext.Provider value={{ isFieldMode, toggleFieldMode }}>
      {children}
    </FieldModeContext.Provider>
  );
};

export const useFieldMode = () => {
  const context = useContext(FieldModeContext);
  if (context === undefined) {
    throw new Error('useFieldMode debe usarse dentro de un FieldModeProvider');
  }
  return context;
};


import React, { useState } from "react";
import { Button } from "../../../shared/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconDroplet,
  IconSearch,
  IconChevronRight,
  IconDeviceFloppy,
} from "../../../shared/ui/icons";

const MilkControl: React.FC = () => {
  const [liters, setLiters] = useState<string>("");
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);

  const [cows, _setCows] = useState<{ id: string; name: string; last: string; status: string }[]>([]);

  return (
    <div className="p-4 md:p-8 bg-muted min-h-screen font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          Control de Pesaje
        </h1>
        <p className="text-muted-foreground font-medium flex items-center gap-2 mt-1">
          <IconDroplet size="md" className="text-info" /> Registro diario
          de producción láctea
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cow Selector (Quick List) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative mb-6">
            <IconSearch
              size="md"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Buscar vaca..."
              className="w-full bg-card border-2 border-border rounded-lg py-4 pl-12 pr-4 font-bold text-foreground outline-none focus:border-info transition-all shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {cows.map((cow) => (
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedAnimal(cow.id)}
                key={cow.id}
                className={`p-5 rounded-[var(--radius-xl)] cursor-pointer border-2 transition-all flex justify-between items-center ${
                  selectedAnimal === cow.id
                    ? "bg-info border-info text-white shadow-md shadow-blue-100"
                    : "bg-card border-white hover:border-info/30 text-foreground shadow-sm"
                }`}
              >
                <div>
                  <h4 className="font-black">{cow.id}</h4>
                  <p
                    className={`text-xs font-bold ${
                      selectedAnimal === cow.id
                        ? "text-blue-100"
                        : "text-muted-foreground"
                    }`}
                  >
                    {cow.name} • Último: {cow.last}
                  </p>
                </div>
                <IconChevronRight
                  size="md"
                  className={
                    selectedAnimal === cow.id ? "text-white" : "text-muted-foreground/70"
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Input Panel (The "Keypad" style) */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedAnimal ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card p-8 md:p-12 rounded-[3.5rem] shadow-md border border-border h-full flex flex-col"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="bg-info/5 text-info px-3 py-1 rounded-[var(--radius-full)] text-[11px] font-semibold text-sm">
                      Registrando
                    </span>
                    <h2 className="text-4xl font-black text-foreground mt-2">
                      {selectedAnimal}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-muted-foreground uppercase">
                      Promedio Mes
                    </p>
                    <p className="text-2xl font-black text-emerald-500">
                      12.8 L
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <div className="relative mb-12">
                    <input
                      type="number"
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      placeholder="00.0"
                      className="text-[8rem] font-black text-foreground bg-transparent border-none outline-none text-center w-full focus:ring-0 placeholder:text-foreground"
                    />
                    <span className="absolute -right-12 bottom-8 text-4xl font-black text-muted-foreground/70">
                      Litros
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, ".", 0].map((n) => (
                      <Button
                        key={n}
                        variant="secondary"
                        onClick={() => setLiters((prev) => prev + n.toString())}
                        className="h-16 rounded-lg font-black text-2xl"
                      >
                        {n}
                      </Button>
                    ))}
                    <Button
                      variant="destructive"
                      onClick={() => setLiters("")}
                      className="h-16 rounded-lg font-black text-lg"
                    >
                      Borrar
                    </Button>
                  </div>
                </div>

                <Button variant="primary" className="w-full p-6 rounded-xl font-black text-xl gap-4 shadow-md h-auto mt-8">
                  <IconDeviceFloppy size="md" /> Guardar Pesaje
                </Button>
              </motion.div>
            ) : (
              <div className="bg-muted/50 border-4 border-dashed border-border rounded-[3.5rem] h-full flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
                <IconDroplet size="md" className="mb-6 opacity-10" />
                <h3 className="text-2xl font-black text-muted-foreground">
                  Seleccione una vaca
                </h3>
                <p className="font-bold max-w-xs mt-2 opacity-60">
                  Toque una vaca de la lista de la izquierda para ingresar su
                  pesaje de hoy.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MilkControl;

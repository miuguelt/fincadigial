import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Search, Check, AlertCircle, TrendingUp } from "lucide-react";
import { controlService } from "@/entities/control/api/control.service";
import { animalService } from "@/entities/animal/api/animal.service";
import {
  HealthAnalyzer,
  HealthInsight,
} from "@/entities/animal/api/HealthAnalyzer";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export const FastWeightEntry: React.FC = () => {
  const [search, setSearch] = useState("");
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [insight, setInsight] = useState<HealthInsight | null>(null);

  // Cargar insight cuando se selecciona un animal
  useEffect(() => {
    if (!selectedAnimal) {
      setInsight(null);
      return;
    }

    const loadInsight = async () => {
      try {
        const res = await controlService.getControls({
          animal_id: selectedAnimal.id,
          limit: 5,
        });
        const analysis = HealthAnalyzer.analyze(
          selectedAnimal,
          res.data || [],
        );
        setInsight(analysis);
      } catch (err) {
        console.warn("No se pudo cargar el historial para IA local");
      }
    };
    loadInsight();
  }, [selectedAnimal]);
  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const res = await animalService.getAnimals({ limit: 5 });
        setAnimals(res || []);
      } catch (err) {
        console.error("Error al cargar animales:", err);
      }
    };
    fetchAnimals();
  }, []);

  const handleSave = async () => {
    if (!selectedAnimal || !weight) return;
    setLoading(true);

    try {
      await controlService.createControl({
        animal_id: selectedAnimal.id,
        checkup_date: new Date().toISOString().split("T")[0],
        health_status: "Bueno" as any,
        weight: parseInt(weight),
        description: "Pesaje rápido en campo",
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedAnimal(null);
        setWeight("");
        setSearch("");
      }, 2000);
    } catch (error) {
      console.error("Error al guardar pesaje:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter(
    (a) =>
      a.record?.toLowerCase().includes(search.toLowerCase()) ||
      a.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-card rounded-xl p-6 border border-border/50 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-info/10 text-info rounded-xl">
          <Scale size={20} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Pesaje Rápido</h3>
      </div>

      <div className="space-y-4">
        {!selectedAnimal ? (
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              placeholder="Buscar por placa o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-lg border-border/50"
            />
            {search && (
              <div className="absolute z-10 w-full mt-2 bg-card border border-border/50 rounded-lg shadow-xl overflow-hidden">
                {filteredAnimals.map((animal) => (
                  <button
                    key={animal.id}
                    onClick={() => setSelectedAnimal(animal)}
                    className="w-full p-4 text-left hover:bg-info/5 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-foreground">
                        #{animal.record}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {animal.breed?.name || "Sin raza"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-info">
                        {animal.weight || "?"} kg
                      </p>
                      <p className="text-[11px] text-muted-foreground">Último peso</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between p-4 bg-info/5 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-card rounded-xl flex items-center justify-center text-info font-bold shadow-sm">
                  {selectedAnimal.record.slice(-2)}
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">
                    Animal #{selectedAnimal.record}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Actual: {selectedAnimal.weight || 0} kg
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnimal(null)}
                className="text-xs text-info font-bold hover:underline"
              >
                Cambiar
              </button>
            </div>

            {/* Local Health Insight (IA en el Borde) */}
            <AnimatePresence>
              {insight && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`p-3 rounded-lg flex items-start gap-3 border ${
                    insight.status === "critical"
                      ? "bg-destructive/5 border-red-100 text-destructive"
                      : insight.status === "warning"
                        ? "bg-warning/5 border-amber-100 text-warning"
                        : "bg-success/5 border-green-100 text-success"
                  }`}
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider mb-1 flex items-center gap-2">
                      Diagnóstico Local IA
                      <span className="opacity-40">•</span>
                      Score: {insight.score}/100
                    </p>
                    <p className="text-xs font-bold leading-tight">
                      {insight.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  placeholder="Nuevo peso (kg)"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="text-xl font-black h-10 rounded-lg border-border focus:ring-blue-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                  kg
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={loading || !weight || success}
                className={`h-10 rounded-lg px-8 transition-all ${success ? "bg-success" : "bg-info hover:bg-blue-700"}`}
              >
                {loading ? "Cargando..." : success ? <Check /> : <TrendingUp />}
              </Button>
            </div>

            {weight && selectedAnimal.weight && (
              <p
                className={`text-xs font-bold text-center ${parseInt(weight) >= selectedAnimal.weight ? "text-success" : "text-destructive"}`}
              >
                {parseInt(weight) >= selectedAnimal.weight ? "+" : ""}
                {parseInt(weight) - selectedAnimal.weight} kg respecto al
                anterior
              </p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

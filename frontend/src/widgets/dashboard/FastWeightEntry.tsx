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
          res.items || [],
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
        setAnimals(res.items || []);
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
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
          <Scale size={20} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Pesaje Rápido</h3>
      </div>

      <div className="space-y-4">
        {!selectedAnimal ? (
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <Input
              placeholder="Buscar por placa o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-2xl border-gray-100"
            />
            {search && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden">
                {filteredAnimals.map((animal) => (
                  <button
                    key={animal.id}
                    onClick={() => setSelectedAnimal(animal)}
                    className="w-full p-4 text-left hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        #{animal.record}
                      </p>
                      <p className="text-xs text-gray-500">
                        {animal.breed?.name || "Sin raza"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-600">
                        {animal.weight || "?"} kg
                      </p>
                      <p className="text-[10px] text-gray-400">Último peso</p>
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
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bold shadow-sm">
                  {selectedAnimal.record.slice(-2)}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">
                    Animal #{selectedAnimal.record}
                  </p>
                  <p className="text-xs text-gray-600">
                    Actual: {selectedAnimal.weight || 0} kg
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAnimal(null)}
                className="text-xs text-blue-600 font-bold hover:underline"
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
                  className={`p-3 rounded-2xl flex items-start gap-3 border ${
                    insight.status === "critical"
                      ? "bg-red-50 border-red-100 text-red-700"
                      : insight.status === "warning"
                        ? "bg-amber-50 border-amber-100 text-amber-700"
                        : "bg-green-50 border-green-100 text-green-700"
                  }`}
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-2">
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
                  className="text-xl font-black h-14 rounded-2xl border-gray-200 focus:ring-blue-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  kg
                </div>
              </div>
              <Button
                onClick={handleSave}
                disabled={loading || !weight || success}
                className={`h-14 rounded-2xl px-8 transition-all ${success ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {loading ? "Cargando..." : success ? <Check /> : <TrendingUp />}
              </Button>
            </div>

            {weight && selectedAnimal.weight && (
              <p
                className={`text-xs font-bold text-center ${parseInt(weight) >= selectedAnimal.weight ? "text-green-600" : "text-red-500"}`}
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

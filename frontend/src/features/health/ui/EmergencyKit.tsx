import React, { useState, useEffect } from "react";
import {
  IconStethoscope,
  IconSearch,
  IconArrowLeft,
  IconBolt,
  IconInfoCircle,
  IconChevronRight,
  IconShield,
  IconSyringe,
  IconPackage,
  IconBook,
} from "@/shared/ui/icons";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
// import { ScrollArea } from "@/shared/ui/scroll-area";
import { useToast } from "@/app/providers/ToastContext";
import { diseaseService } from "@/entities/disease/api/disease.service";
import { inventoryService } from "@/entities/inventory/api/inventory.service";
// import { cn } from "@/shared/ui/cn";
import { motion, AnimatePresence } from "framer-motion";
export const EmergencyKit: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [diseases, setDiseases] = useState<any[]>([]);
  const [selectedDisease, setSelectedDisease] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [disResp, invResp] = await Promise.all([
          diseaseService.getDiseases({ limit: 100 }),
          inventoryService.getLots({ limit: 50 }),
        ]);
        /* Extraer items de la respuesta paginada si es necesario */ const diseaseList =
          (disResp as any).data || (disResp as any).items || disResp;
        setDiseases(Array.isArray(diseaseList) ? diseaseList : []);
        setInventory(invResp || []);
      } catch (err) {
        showToast("Error al cargar protocolos de emergencia", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [showToast]);
  const filteredDiseases = diseases.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.symptoms?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <div className="min-h-screen bg-destructive/5 dark:bg-stone-950 pb-20 font-sans">
      {" "}
      {/* Header de Emergencia */}{" "}
      <header className="sticky top-0 z-50 bg-destructive text-white p-4 shadow-sm">
        {" "}
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          {" "}
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              selectedDisease ? setSelectedDisease(null) : navigate(-1)
            }
            className="rounded-[var(--radius-full)] text-white hover:bg-card/10"
          >
            {" "}
            <IconArrowLeft size="md" />{" "}
          </Button>{" "}
          <div className="flex items-center gap-3">
            {" "}
            <div className="h-10 w-10 rounded-xl bg-card/20 flex items-center justify-center border border-white/30 backdrop-blur-md">
              {" "}
              <IconShield size="md" />{" "}
            </div>{" "}
            <div>
              {" "}
              <h1 className="text-sm font-black uppercase tracking-tight">
                Botiquín de Emergencia
              </h1>{" "}
              <p className="text-[8px] font-bold text-rose-100 uppercase tracking-widest">
                Protocolos de Salud Rural
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </header>{" "}
      <main className="p-4 max-w-lg mx-auto space-y-6 mt-4">
        {" "}
        <AnimatePresence mode="wait">
          {" "}
          {!selectedDisease ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {" "}
              {/* Buscador de Síntomas */}{" "}
              <div className="relative group">
                {" "}
                <Input
                  placeholder="Busca por enfermedad o síntoma..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-12 rounded-lg bg-card border-none shadow-md font-bold text-sm"
                />{" "}
                <IconSearch
                  size="md"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-destructive transition-colors"
                />{" "}
              </div>{" "}
              {/* Lista de Enfermedades */}{" "}
              <div className="grid grid-cols-1 gap-3">
                {" "}
                {filteredDiseases.map((disease) => (
                  <button
                    key={disease.id}
                    onClick={() => setSelectedDisease(disease)}
                    className="flex items-center gap-4 p-5 bg-card rounded-xl shadow-sm border border-border text-left hover:border-destructive/30 transition-all active:scale-95"
                  >
                    {" "}
                    <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive shrink-0">
                      {" "}
                      <IconStethoscope size="lg" />{" "}
                    </div>{" "}
                    <div className="flex-1 min-w-0">
                      {" "}
                      <h3 className="text-sm font-black text-foreground uppercase fit-clamp">
                        {disease.name}
                      </h3>{" "}
                      <p className="text-[10px] font-medium text-muted-foreground line-clamp-1 italic">
                        {disease.symptoms || "Sin descripción de síntomas"}
                      </p>{" "}
                    </div>{" "}
                    <IconChevronRight
                      size="sm"
                      className="text-muted-foreground/70"
                    />{" "}
                  </button>
                ))}{" "}
              </div>{" "}
              {filteredDiseases.length === 0 && !loading && (
                <div className="p-12 text-center space-y-4">
                  {" "}
                  <div className="h-16 w-16 rounded-[var(--radius-full)] bg-destructive/10 mx-auto flex items-center justify-center text-destructive">
                    {" "}
                    <IconInfoCircle className="h-8 w-8" />{" "}
                  </div>{" "}
                  <p className="text-sm font-bold text-muted-foreground">
                    No encontramos protocolos para esa búsqueda.
                  </p>{" "}
                </div>
              )}{" "}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {" "}
              {/* FICHA TÉCNICA */}{" "}
              <Card className="rounded-[2.5rem] border-none shadow-md overflow-hidden bg-card">
                {" "}
                <div className="bg-card p-8 text-white relative">
                  {" "}
                  <Badge className="bg-destructive text-white border-none mb-4 font-black">
                    PROTOCOLO CRÍTICO
                  </Badge>{" "}
                  <h2 className="text-3xl font-black tracking-tighter uppercase">
                    {selectedDisease.name}
                  </h2>{" "}
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    {" "}
                    <IconShield className="h-20 w-20" />{" "}
                  </div>{" "}
                </div>{" "}
                <CardContent className="p-8 space-y-8">
                  {" "}
                  <div className="space-y-3">
                    {" "}
                    <p className="text-[10px] font-semibold text-sm text-muted-foreground">
                      Síntomas comunes
                    </p>{" "}
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground dark:text-muted-foreground">
                      {selectedDisease.symptoms}
                    </p>{" "}
                  </div>{" "}
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-3">
                    {" "}
                    <div className="flex items-center gap-2 text-emerald-700">
                      {" "}
                      <IconBolt size="sm" className="fill-emerald-500" />{" "}
                      <span className="text-[10px] font-semibold text-sm">
                        Tratamiento Recomendado
                      </span>{" "}
                    </div>{" "}
                    <p className="text-sm font-bold text-emerald-950 dark:text-emerald-400 leading-relaxed">
                      {" "}
                      {selectedDisease.treatment_protocol ||
                        "Consultar con el veterinario asignado de inmediato."}{" "}
                    </p>{" "}
                  </div>{" "}
                  {/* Verificación de Medicamentos en Bodega */}{" "}
                  <div className="space-y-4">
                    {" "}
                    <div className="flex items-center justify-between">
                      {" "}
                      <span className="text-[10px] font-semibold text-sm text-muted-foreground">
                        Insumos en Bodega
                      </span>{" "}
                      <Badge
                        variant="outline"
                        className="text-[8px] border-border"
                      >
                        STOCK REAL
                      </Badge>{" "}
                    </div>{" "}
                    <div className="grid grid-cols-1 gap-2">
                      {" "}
                      {inventory.length > 0 ? (
                        inventory.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-xl"
                          >
                            {" "}
                            <div className="flex items-center gap-3">
                              {" "}
                              <IconPackage
                                size="sm"
                                className="text-muted-foreground"
                              />{" "}
                              <span className="text-xs font-bold">
                                {item.product_name}
                              </span>{" "}
                            </div>{" "}
                            <span className="text-[10px] font-black text-emerald-600">
                              {item.quantity} {item.unit}
                            </span>{" "}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          No hay medicamentos registrados en inventario.
                        </p>
                      )}{" "}
                    </div>{" "}
                  </div>{" "}
                  <Button
                    className="w-full h-10 rounded-lg bg-card text-white font-black uppercase text-[10px] tracking-widest gap-2"
                    onClick={() => navigate("?quick=treatment")}
                  >
                    {" "}
                    <IconSyringe size="sm" /> Registrar Aplicación{" "}
                  </Button>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <div className="flex items-center gap-3 p-6 bg-info rounded-xl text-white shadow-sm">
                {" "}
                <IconBook className="h-8 w-8 opacity-50 shrink-0" />{" "}
                <div>
                  {" "}
                  <p className="font-black text-xs uppercase tracking-tight">
                    Manual Técnico SENA
                  </p>{" "}
                  <p className="text-[10px] opacity-80 leading-tight">
                    Este protocolo sigue las guías oficiales de sanidad animal.
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </motion.div>
          )}{" "}
        </AnimatePresence>{" "}
      </main>{" "}
    </div>
  );
};
export default EmergencyKit;

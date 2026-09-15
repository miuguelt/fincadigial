import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

type RuralGuideline = { id: string; title: string; summary: string; tips: string[] };
interface ClimateGuidelinesProps {
  expandedGuide: string | null;
  setExpandedGuide: (id: string | null) => void;
  ruralGuidelines: RuralGuideline[];
}

export function ClimateGuidelines({ expandedGuide, setExpandedGuide, ruralGuidelines }: ClimateGuidelinesProps) {
  return (
    <>
        {/* ── 6. Guía Agronómica Colombiana de Prevención Climática ───────────── */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground">
                Guía Rural: Medidas de Prevención y Protección Ganadera/Agrícola
              </h3>
              <p className="text-xs text-muted-foreground">
                Recomendaciones expertas adaptadas a las condiciones climáticas del campo colombiano
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ruralGuidelines.map((guide) => {
              const isOpen = expandedGuide === guide.id;
              return (
                <div
                  key={guide.id}
                  className="border border-border/60 rounded-xl p-3.5 bg-background/60 hover:bg-background transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedGuide(isOpen ? null : guide.id)}
                    className="w-full flex items-center justify-between text-left gap-2 font-bold text-xs sm:text-sm text-foreground"
                  >
                    <span>{guide.title}</span>
                    <span className="text-xs text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">{guide.summary}</p>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ul className="mt-2.5 pt-2 border-t border-border/40 space-y-1.5 text-xs text-foreground/90 list-disc list-inside">
                          {guide.tips.map((tip, idx) => (
                            <li key={idx} className="leading-relaxed">{tip}</li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
    </>
  );
}

import React, { useState, useEffect } from "react";
import {
  Mic,
  Square,
  Trash2,
  Play,
  Pause,
  CircleCheck,
  Clock,
} from "lucide-react";
import {
  voiceNoteService,
  type VoiceNote,
} from "@/shared/api/offline/VoiceNoteService";
import { motion, AnimatePresence } from "framer-motion";
import { useFieldMode } from "@/app/providers/FieldModeContext";

export const VoiceNoteWidget: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const { isFieldMode } = useFieldMode();

  useEffect(() => {
    loadNotes();
    // Recargar cada 30s para ver cambios de estado de sync
    const interval = setInterval(loadNotes, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotes = async () => {
    const localNotes = await voiceNoteService.getNotes();
    setNotes(localNotes.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleStartRecording = async () => {
    try {
      await voiceNoteService.startRecording();
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono");
    }
  };

  const handleStopRecording = async () => {
    await voiceNoteService.stopRecording();
    setIsRecording(false);
    loadNotes();
  };

  const handlePlay = (note: VoiceNote) => {
    if (playingId === note.id) {
      audioElement?.pause();
      setPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const url = URL.createObjectURL(note.blob);
    const audio = new Audio(url);
    audio.onended = () => {
      setPlayingId(null);
      URL.revokeObjectURL(url);
    };
    audio.play();
    setAudioElement(audio);
    setPlayingId(note.id);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Borrar esta nota de voz?")) {
      await voiceNoteService.deleteNote(id);
      loadNotes();
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm ${isFieldMode ? "border-4 border-white bg-black text-white" : ""}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3
            className={`text-lg font-bold ${isFieldMode ? "text-white uppercase text-2xl" : "text-gray-900"}`}
          >
            Notas de Voz
          </h3>
          <p
            className={`text-sm ${isFieldMode ? "text-gray-300" : "text-gray-500"}`}
          >
            Graba novedades sin escribir
          </p>
        </div>
        <div
          className={`p-2 rounded-full ${isRecording ? "bg-red-500 animate-pulse" : "bg-blue-50"}`}
        >
          <Mic
            size={20}
            className={isRecording ? "text-white" : "text-blue-600"}
          />
        </div>
      </div>

      {/* Botón de Grabación Principal */}
      <div className="flex justify-center mb-8">
        {!isRecording ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartRecording}
            className={`flex flex-col items-center justify-center gap-3 w-40 h-40 rounded-full transition-all shadow-xl ${
              isFieldMode
                ? "bg-green-600 border-4 border-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Mic size={48} />
            <span className="font-bold uppercase tracking-widest text-xs">
              Grabar Ahora
            </span>
          </motion.button>
        ) : (
          <motion.button
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            onClick={handleStopRecording}
            className={`flex flex-col items-center justify-center gap-3 w-40 h-40 rounded-full bg-red-600 text-white shadow-xl shadow-red-500/20 border-4 border-white`}
          >
            <Square size={48} />
            <span className="font-bold uppercase tracking-widest text-xs">
              Terminar
            </span>
          </motion.button>
        )}
      </div>

      {/* Lista de Notas Recientes */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                isFieldMode
                  ? "bg-zinc-900 border-white"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePlay(note)}
                  className={`p-2 rounded-full ${isFieldMode ? "bg-white text-black" : "bg-white shadow-sm text-blue-600"}`}
                >
                  {playingId === note.id ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} />
                  )}
                </button>
                <div>
                  <p
                    className={`text-xs font-bold ${isFieldMode ? "text-white" : "text-gray-700"}`}
                  >
                    {new Date(note.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p
                    className={`text-[10px] ${isFieldMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {note.duration} segundos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {note.status === "completed" ? (
                  <span title="Sincronizado">
                    <CircleCheck size={16} className="text-green-500" />
                  </span>
                ) : (
                  <span title="Pendiente de envío">
                    <Clock size={16} className="text-amber-500 animate-pulse" />
                  </span>
                )}
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {notes.length === 0 && !isRecording && (
          <div className="text-center py-8 opacity-50">
            <p className="text-sm">No tienes notas guardadas</p>
          </div>
        )}
      </div>
    </div>
  );
};

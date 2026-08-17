import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSend,
  IconAlertTriangle,
  IconMessageCircle,
  IconUser,
  IconRadio,
  IconWaveSine,
  IconBell,
  IconX,
} from "@/shared/ui/icons";
import {
  proximitySync,
  type DiscoveredPeer,
} from "@/shared/api/offline/ProximitySyncService";
import { useFieldMode } from "@/app/providers/FieldModeContext";
import { nodeMessagesService } from "@/shared/api/offline/nodeMessages.service";
import { ruralSyncService } from "@/shared/api/offline/ruralSync.service";

interface Message {
  id: string;
  from: string;
  content: string;
  type: "alert" | "chat";
  timestamp: Date;
}

export const NodeCommunicationWidget: React.FC = () => {
  const { isFieldMode } = useFieldMode();
  const [nodes, setNodes] = useState<DiscoveredPeer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showNotification, setShowNotification] = useState<Message | null>(
    null,
  );

  // Cargar nodos iniciales
  useEffect(() => {
    setNodes(proximitySync.getDiscoveredPeers());
    nodeMessagesService
      .list({ limit: 50 })
      .then((items) => {
        if (!Array.isArray(items)) return;
        setMessages(
          items.map((item: any) => ({
            id: item.message_id || String(item.id),
            from: item.sender_device_id || item.sender_user_id || "Nodo",
            content: item.content,
            type: item.message_type === "alert" ? "alert" : "chat",
            timestamp: item.created_at ? new Date(item.created_at) : new Date(),
          })),
        );
      })
      .catch(() => {});

    const unsubDiscovered = proximitySync.onPeerDiscovered((peer) => {
      setNodes((prev) => {
        const filtered = prev.filter((p) => p.id !== peer.id);
        return [...filtered, peer];
      });
    });

    const unsubLost = proximitySync.onPeerLost((peerId) => {
      setNodes((prev) => prev.filter((p) => p.id !== peerId));
      if (selectedNode === peerId) setSelectedNode(null);
    });

    const unsubMsg = proximitySync.onMessageReceived((msg: any) => {
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        from: msg.from,
        content: msg.content,
        type: msg.type,
        timestamp: new Date(),
      };
      setMessages((prev) => [newMsg, ...prev].slice(0, 50));
      setShowNotification(newMsg);
      nodeMessagesService
        .send({
          content: msg.content,
          message_type: msg.type,
          sender_device_id: msg.from,
          recipient_node_id: ruralSyncService.getDeviceId(),
          priority: msg.type === "alert" ? 10 : 100,
        })
        .catch(() => {});

      // Auto-ocultar notificación después de 5 segundos
      setTimeout(() => setShowNotification(null), 5000);
    });

    return () => {
      unsubDiscovered();
      unsubLost();
      unsubMsg();
    };
  }, [selectedNode]);

  const handleSendMessage = async (type: "alert" | "chat") => {
    if (!selectedNode || (!inputText && type === "chat")) return;
    setIsSending(true);
    const content =
      type === "alert" ? "🚨 ¡ATENCIÓN! Revisa el canal de radio." : inputText;
    const success = await proximitySync.sendMessageToPeer(
      selectedNode,
      content,
      type,
    );
    if (success) {
      await nodeMessagesService
        .send({
          content,
          message_type: type,
          sender_device_id: ruralSyncService.getDeviceId(),
          recipient_node_id: selectedNode,
          priority: type === "alert" ? 10 : 100,
        })
        .catch(() => {});
      setInputText("");
      if (type === "alert") setSelectedNode(null);
    }
    setIsSending(false);
  };

  const getStatusColor = (peer: DiscoveredPeer) => {
    if (peer.isConnected) return "bg-success";
    return "bg-info";
  };

  return (
    <div
      className={`rounded-[var(--radius-xl)] p-6 border shadow-md overflow-hidden relative ${isFieldMode ? "bg-black border-white text-white" : "bg-card border-border"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-lg ${isFieldMode ? "bg-zinc-800" : "bg-indigo-50 text-indigo-600"}`}
          >
            <IconRadio
              size="lg"
              className={nodes.length > 0 ? "animate-pulse" : ""}
            />
          </div>
          <div>
            <h3
              className={`font-black uppercase tracking-tighter ${isFieldMode ? "text-2xl" : "text-lg text-foreground"}`}
            >
              Radio Enlace Mesh
            </h3>
            <p
              className={`text-[11px] font-bold uppercase tracking-widest ${isFieldMode ? "text-indigo-400" : "text-muted-foreground"}`}
            >
              {nodes.length} Nodos en Alcance
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
        {/* Node List */}
        <div className="flex flex-col h-full">
          <h4 className="text-[11px] font-semibold text-sm mb-3 opacity-50">
            Compañeros Cercanos
          </h4>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {nodes.length === 0 ? (
              <div
                className={`h-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed ${isFieldMode ? "bg-zinc-900 border-zinc-800 text-zinc-600" : "bg-muted border-border text-muted-foreground"}`}
              >
                <IconWaveSine
                  size="lg"
                  strokeWidth={1}
                  className="mb-2 opacity-20"
                />
                <p className="text-xs font-bold uppercase tracking-tighter">
                  Buscando señales...
                </p>
              </div>
            ) : (
              nodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg transition-all border-2 ${selectedNode === node.id ? (isFieldMode ? "bg-card border-white text-black" : "bg-indigo-600 border-indigo-600 text-white shadow-sm scale-[1.02]") : isFieldMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-muted border-slate-50 hover:border-border"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-[var(--radius-full)] flex items-center justify-center ${selectedNode === node.id ? "bg-black/10" : isFieldMode ? "bg-black" : "bg-card"}`}
                      >
                        <IconUser size="md" />
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-[var(--radius-full)] border-2 ${selectedNode === node.id ? "border-indigo-600" : isFieldMode ? "border-black" : "border-slate-50"} ${getStatusColor(node)}`}
                      />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm uppercase tracking-tighter leading-none mb-1">
                        {node.name}
                      </p>
                      <p
                        className={`text-[11px] font-bold uppercase opacity-60`}
                      >
                        {node.connectionType === "bluetooth"
                          ? "Bluetooth"
                          : "Wi-Fi Direct"}
                      </p>
                    </div>
                  </div>
                  {node.signalStrength !== undefined && (
                    <div className="flex gap-0.5 items-end h-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`w-0.5 rounded-[var(--radius-full)] ${i <= (node.signalStrength || 0) ? "bg-current" : "opacity-20"}`}
                          style={{ height: `${i * 25}%` }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messaging Interface */}
        <div className="flex flex-col h-full">
          <h4 className="text-[11px] font-semibold text-sm mb-3 opacity-50">
            Consola de Comunicación
          </h4>
          <div
            className={`flex-1 rounded-lg p-4 mb-4 flex flex-col ${isFieldMode ? "bg-zinc-900" : "bg-muted"}`}
          >
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar flex flex-col-reverse">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                  <IconMessageCircle size="lg" className="mb-2" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-center">
                    Sin mensajes recientes en la red
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-xl ${msg.type === "alert" ? (isFieldMode ? "bg-destructive text-white" : "bg-destructive/5 text-destructive border border-red-100") : isFieldMode ? "bg-zinc-800 text-white" : "bg-card text-foreground border border-border shadow-sm"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-sm opacity-60">
                        {msg.from}
                      </span>
                      <span className="text-[11px] opacity-40">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-bold">{msg.content}</p>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                disabled={!selectedNode || isSending}
                onClick={() => handleSendMessage("alert")}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-black text-xs uppercase tracking-tighter ${selectedNode ? "bg-destructive text-white hover:bg-red-700 shadow-sm shadow-red-600/20 active:scale-95" : "bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50"}`}
              >
                <IconAlertTriangle size="sm" /> ALERTA NODO
              </button>
              <div className="flex-[2] relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={!selectedNode || isSending}
                  placeholder={
                    selectedNode ? "Escribir mensaje..." : "Selecciona un nodo"
                  }
                  className={`w-full h-full pl-4 pr-12 rounded-xl border-2 transition-all text-sm font-bold ${isFieldMode ? "bg-black border-zinc-800 focus:border-white text-white" : "bg-card border-border focus:border-indigo-600 text-foreground"}`}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSendMessage("chat")
                  }
                />
                <button
                  disabled={!selectedNode || !inputText || isSending}
                  onClick={() => handleSendMessage("chat")}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${inputText && selectedNode ? (isFieldMode ? "bg-card text-black" : "bg-indigo-600 text-white shadow-md") : "bg-zinc-800 text-zinc-600 opacity-20"}`}
                >
                  <IconSend size="sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute bottom-6 left-6 right-6 p-4 rounded-lg shadow-md z-50 border-2 flex items-center gap-4 ${showNotification.type === "alert" ? "bg-destructive border-white text-white" : isFieldMode ? "bg-zinc-900 border-indigo-500 text-white" : "bg-card border-indigo-100 text-foreground"}`}
          >
            <div
              className={`p-3 rounded-xl ${showNotification.type === "alert" ? "bg-card/20" : "bg-indigo-500/10 text-indigo-500"}`}
            >
              {showNotification.type === "alert" ? (
                <IconBell className="animate-bounce" size="lg" />
              ) : (
                <IconMessageCircle size="lg" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-sm opacity-60">
                Mensaje de {showNotification.from}
              </p>
              <p className="text-sm font-black tracking-tight">
                {showNotification.content}
              </p>
            </div>
            <button
              onClick={() => setShowNotification(null)}
              className="opacity-40 hover:opacity-100"
            >
              <IconX size="md" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <style
        dangerouslySetInnerHTML={{
          __html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.4); }`,
        }}
      />
    </div>
  );
};

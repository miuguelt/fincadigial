import { offlineQueue } from './offlineQueue';

export interface VoiceNote {
  id: string;
  timestamp: number;
  blob: Blob;
  duration: number; // en segundos
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  transcript?: string; // Futuro: para transcripción local/remota
}

class VoiceNoteService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private dbName = 'VillaLuzQueue';
  private storeName = 'voiceNotes';

  /**
   * Abre la base de datos de IndexedDB
   */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Inicia la grabación de audio
   */
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log('[VoiceNote] Grabación iniciada');
    } catch (err) {
      console.error('[VoiceNote] Error al acceder al micrófono:', err);
      throw err;
    }
  }

  /**
   * Detiene la grabación y guarda la nota localmente
   */
  async stopRecording(): Promise<VoiceNote> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No hay una grabación en curso'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - this.recordingStartTime) / 1000);

        const note: VoiceNote = {
          id: `vn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          blob: audioBlob,
          duration,
          status: 'pending'
        };

        await this.saveNote(note);

        // Intentar sincronizar inmediatamente si hay red
        if (navigator.onLine) {
          this.syncNote(note).catch(console.error);
        }

        resolve(note);
      };

      this.mediaRecorder.stop();
      // Detener todos los tracks del stream para liberar el micrófono
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      console.log('[VoiceNote] Grabación detenida');
    });
  }

  /**
   * Guarda una nota de voz en IndexedDB
   */
  async saveNote(note: VoiceNote): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const req = tx.objectStore(this.storeName).put(note);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Recupera todas las notas de voz locales
   */
  async getNotes(): Promise<VoiceNote[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).getAll();
      req.onsuccess = () => resolve(req.result as VoiceNote[]);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Elimina una nota de voz
   */
  async deleteNote(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const req = tx.objectStore(this.storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Sincroniza una nota de voz con el servidor
   */
  private async syncNote(note: VoiceNote): Promise<void> {
    if (note.status === 'syncing' || note.status === 'completed') return;

    note.status = 'syncing';
    await this.saveNote(note);

    try {
      // Convertir Blob a Base64 para envío simple en JSON
      // En una app más grande usaríamos FormData, pero para reportes cortos esto es más resiliente en Mesh
      const base64 = await this.blobToBase64(note.blob);

      // Encolar en la cola offline estándar para que herede la lógica de reintentos y tokens
      await offlineQueue.enqueue(
        'POST',
        '/api/v1/voice-notes',
        {
          id: note.id,
          audio: base64,
          duration: note.duration,
          timestamp: note.timestamp
        }
      );

      // Una vez encolado con éxito en offlineQueue, marcamos como completado localmente
      // (offlineQueue se encargará de llevarlo al servidor final)
      note.status = 'completed';
      await this.saveNote(note);
      console.log(`[VoiceNote] Nota ${note.id} encolada para sincronización`);
    } catch (err) {
      note.status = 'failed';
      await this.saveNote(note);
      console.error(`[VoiceNote] Error sincronizando nota ${note.id}:`, err);
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const voiceNoteService = new VoiceNoteService();

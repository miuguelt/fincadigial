import React, { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from './assistance.constants';
import { NewAssistanceDialogView } from './NewAssistanceDialogView';

type FormData = {
  title: string;
  category: string;
  description: string;
  priority: string;
  photo: File | null;
  photoPreview: string | null;
  audio: File | null;
};

const INITIAL: FormData = {
  title: '', category: '', description: '', priority: 'medium',
  photo: null, photoPreview: null, audio: null,
};

interface NewAssistanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { title: string; category: string; description: string; priority: string; attachment?: File }) => Promise<void>;
  recipientCount?: number;
}

export const NewAssistanceDialog = React.memo<NewAssistanceDialogProps>(({ open, onOpenChange, onSave, recipientCount = 0 }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);

  const releaseAudioStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  };

  const reset = () => {
    discardRecordingRef.current = true;
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
    releaseAudioStream();
    setStep(1);
    setForm(INITIAL);
    setMediaError(null);
  };

  useEffect(() => {
    if (!form.audio) {
      setAudioPreview(null);
      return undefined;
    }
    const previewUrl = URL.createObjectURL(form.audio);
    setAudioPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [form.audio]);

  useEffect(() => () => {
    discardRecordingRef.current = true;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
  }, []);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) { reset(); }
    onOpenChange(isOpen);
  };

  const pickCategory = (value: string) => {
    const cat = CATEGORIES.find(c => c.value === value);
    setForm(prev => ({ ...prev, category: value, title: cat ? `Problema en ${cat.label.toLowerCase()}` : '' }));
    setStep(2);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, photo: file, photoPreview: reader.result as string, audio: null }));
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setForm(prev => ({ ...prev, photo: null, photoPreview: null }));
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    setForm(prev => ({ ...prev, audio: file, photo: null, photoPreview: null }));
  };

  const removeAudio = () => {
    setForm(prev => ({ ...prev, audio: null }));
    if (audioFileRef.current) audioFileRef.current.value = '';
  };

  const stopRecording = () => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop();
  };

  const startRecording = async () => {
    setMediaError(null);
    discardRecordingRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      audioFileRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']
        .find((mime) => typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported(mime));
      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setMediaError('No fue posible grabar el audio. Puede elegir un archivo de audio.');
        releaseAudioStream();
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || preferredMime || 'audio/webm';
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const audio = new File(audioChunksRef.current, `audio-asistencia-${Date.now()}.${extension}`, { type });
        if (!discardRecordingRef.current) {
          setForm(prev => ({ ...prev, audio, photo: null, photoPreview: null }));
        }
        discardRecordingRef.current = false;
        releaseAudioStream();
      };
      recorder.start();
      setRecording(true);
    } catch {
      setMediaError('No se pudo acceder al micrófono. Revise el permiso o elija un audio guardado.');
      audioFileRef.current?.click();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        title: form.title || `Solicitud de ${CATEGORIES.find(c => c.value === form.category)?.label || 'ayuda'}`,
        category: form.category,
        description: form.description,
        priority: form.priority,
        attachment: form.photo || form.audio || undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isStep2Valid = form.description.trim().length >= 10;

  return (
    <NewAssistanceDialogView
      open={open}
      step={step}
      setStep={setStep}
      form={form}
      setForm={setForm}
      saving={saving}
      recording={recording}
      audioPreview={audioPreview}
      mediaError={mediaError}
      fileRef={fileRef}
      audioFileRef={audioFileRef}
      recipientCount={recipientCount}
      handleClose={handleClose}
      pickCategory={pickCategory}
      handlePhoto={handlePhoto}
      handleAudioFile={handleAudioFile}
      removePhoto={removePhoto}
      removeAudio={removeAudio}
      stopRecording={stopRecording}
      startRecording={startRecording}
      handleSubmit={handleSubmit}
      isStep2Valid={isStep2Valid}
    />
  );
});

NewAssistanceDialog.displayName = 'NewAssistanceDialog';

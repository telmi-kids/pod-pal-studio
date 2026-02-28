import { useState, useRef } from "react";
import { Mic, Square, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SectionRecorderProps {
  activityId: string;
  sectionKey: string;
  existingRecording?: { id: string; recording_url: string; created_at: string } | null;
  onSaved: (rec: { id: string; recording_url: string; created_at: string; section_key: string }) => void;
}

export default function SectionRecorder({ activityId, sectionKey, existingRecording, onSaved }: SectionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordingBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingBlob(null);
      setRecordingUrl(null);
    } catch {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const saveRecording = async () => {
    if (!recordingBlob) return;
    setIsSaving(true);
    try {
      const fileName = `recording-${activityId}-${sectionKey}-${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("recordings")
        .upload(fileName, recordingBlob);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("recordings")
        .getPublicUrl(fileName);

      const { error: insertErr } = await supabase.from("recordings").insert({
        activity_id: activityId,
        recording_url: urlData.publicUrl,
        section_key: sectionKey,
      } as any);
      if (insertErr) throw insertErr;

      const newRec = {
        id: crypto.randomUUID(),
        recording_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
        section_key: sectionKey,
      };
      onSaved(newRec);
      setRecordingBlob(null);
      setRecordingUrl(null);
      toast.success("Recording saved! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to save recording");
    } finally {
      setIsSaving(false);
    }
  };

  // Show saved recording with re-record option
  if (existingRecording && !isRecording && !recordingBlob) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">✅ Your recording:</p>
        <audio src={existingRecording.recording_url} controls className="w-full rounded-lg" />
        <Button
          onClick={startRecording}
          variant="outline"
          size="sm"
          className="w-full gap-2 font-bold rounded-xl"
        >
          <RotateCcw className="h-4 w-4" />
          Record Again
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {!isRecording && !recordingBlob && (
        <Button
          onClick={startRecording}
          className="w-full h-12 font-bold rounded-xl bg-kid-green hover:bg-kid-green/90 gap-2"
        >
          <Mic className="h-5 w-5" />
          Record Your Answer
        </Button>
      )}

      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-destructive font-bold">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
            Recording...
          </div>
          <Button
            onClick={stopRecording}
            className="w-full h-12 font-bold rounded-xl bg-destructive hover:bg-destructive/90 gap-2"
          >
            <Square className="h-5 w-5" />
            Stop
          </Button>
        </div>
      )}

      {recordingUrl && !isRecording && (
        <div className="space-y-2">
          <audio src={recordingUrl} controls className="w-full rounded-lg" />
          <Button
            onClick={saveRecording}
            disabled={isSaving}
            className="w-full h-12 font-bold rounded-xl bg-kid-green hover:bg-kid-green/90 gap-2"
          >
            <Save className="h-5 w-5" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={startRecording}
            variant="outline"
            size="sm"
            className="w-full gap-2 font-bold rounded-xl"
          >
            <RotateCcw className="h-4 w-4" />
            Record Again
          </Button>
        </div>
      )}
    </div>
  );
}

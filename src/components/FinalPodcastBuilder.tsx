import { useState, useCallback } from "react";
import { Headphones, Loader2, Save, RotateCcw, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Recording {
  id: string;
  recording_url: string;
  created_at: string;
  section_key: string;
}

interface FinalPodcastBuilderProps {
  activityId: string;
  sectionRecordings: Record<string, Recording>;
  allSectionKeys: string[];
  onFinalSaved: (rec: Recording) => void;
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, length - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, buffer.length * numChannels * 2, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([out], { type: "audio/wav" });
}

export default function FinalPodcastBuilder({
  activityId,
  sectionRecordings,
  allSectionKeys,
  onFinalSaved,
}: FinalPodcastBuilderProps) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [finalBlobUrl, setFinalBlobUrl] = useState<string | null>(null);
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);

  const recordedCount = allSectionKeys.filter((k) => sectionRecordings[k]).length;
  const allRecorded = recordedCount === allSectionKeys.length;
  const progress = (recordedCount / allSectionKeys.length) * 100;

  const sectionLabels: Record<string, string> = {
    introduction: "Intro",
    question_1: "Q1",
    question_2: "Q2",
    question_3: "Q3",
    goodbye: "Goodbye",
  };

  const buildPodcast = useCallback(async () => {
    setIsBuilding(true);
    try {
      const audioCtx = new AudioContext();
      const buffers: AudioBuffer[] = [];

      for (const key of allSectionKeys) {
        const url = sectionRecordings[key]?.recording_url;
        if (!url) throw new Error(`Missing recording for ${key}`);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(arrayBuffer);
        buffers.push(decoded);
      }

      // Calculate total length
      const sampleRate = buffers[0].sampleRate;
      const numChannels = Math.max(...buffers.map((b) => b.numberOfChannels));
      const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);

      // Create merged buffer
      const offlineCtx = new OfflineAudioContext(numChannels, totalLength, sampleRate);
      let currentOffset = 0;

      for (const buf of buffers) {
        const source = offlineCtx.createBufferSource();
        source.buffer = buf;
        source.connect(offlineCtx.destination);
        source.start(currentOffset / sampleRate);
        currentOffset += buf.length;
      }

      const rendered = await offlineCtx.startRendering();
      const wavBlob = encodeWav(rendered);
      const blobUrl = URL.createObjectURL(wavBlob);

      setFinalBlob(wavBlob);
      setFinalBlobUrl(blobUrl);
      audioCtx.close();
      toast.success("Podcast built! 🎧 Preview it below.");
    } catch (e: any) {
      console.error("Build error:", e);
      toast.error(e.message || "Failed to build podcast");
    } finally {
      setIsBuilding(false);
    }
  }, [allSectionKeys, sectionRecordings]);

  const saveFinal = useCallback(async () => {
    if (!finalBlob) return;
    setIsSaving(true);
    try {
      const fileName = `final-${activityId}-${Date.now()}.wav`;
      const { error: uploadErr } = await supabase.storage
        .from("recordings")
        .upload(fileName, finalBlob);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("recordings")
        .getPublicUrl(fileName);

      const { error: insertErr } = await supabase.from("recordings").insert({
        activity_id: activityId,
        recording_url: urlData.publicUrl,
        section_key: "final",
      } as any);
      if (insertErr) throw insertErr;

      const newRec: Recording = {
        id: crypto.randomUUID(),
        recording_url: urlData.publicUrl,
        created_at: new Date().toISOString(),
        section_key: "final",
      };
      onFinalSaved(newRec);
      toast.success("Final podcast saved! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }, [finalBlob, activityId, onFinalSaved]);

  return (
    <div className="rounded-2xl border-2 border-primary bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Headphones className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-extrabold text-foreground">Your Final Podcast</h2>
      </div>

      {/* Progress indicators */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {allSectionKeys.map((key) => (
            <span key={key} className="flex items-center gap-1 text-sm font-semibold">
              {sectionRecordings[key] ? (
                <CheckCircle2 className="h-4 w-4 text-kid-green" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              {sectionLabels[key] || key}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-3" />
        <p className="text-sm text-muted-foreground font-semibold">
          {recordedCount}/{allSectionKeys.length} sections recorded
        </p>
      </div>

      {/* Build button */}
      {!finalBlobUrl && (
        <Button
          onClick={buildPodcast}
          disabled={!allRecorded || isBuilding}
          className="w-full h-14 text-lg font-bold rounded-xl gap-3"
        >
          {isBuilding ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              Building...
            </>
          ) : (
            <>
              <Headphones className="h-6 w-6" />
              Build My Podcast
            </>
          )}
        </Button>
      )}

      {/* Preview & save */}
      {finalBlobUrl && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">🎧 Preview your podcast:</p>
          <audio src={finalBlobUrl} controls className="w-full rounded-lg" />
          <div className="flex gap-2">
            <Button
              onClick={saveFinal}
              disabled={isSaving}
              className="flex-1 h-12 font-bold rounded-xl bg-kid-green hover:bg-kid-green/90 gap-2"
            >
              <Save className="h-5 w-5" />
              {isSaving ? "Saving..." : "Save Final Podcast"}
            </Button>
            <Button
              onClick={() => {
                setFinalBlobUrl(null);
                setFinalBlob(null);
              }}
              variant="outline"
              className="h-12 font-bold rounded-xl gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Rebuild
            </Button>
          </div>
        </div>
      )}

      {!allRecorded && (
        <p className="text-sm text-muted-foreground text-center">
          Record all sections above to build your podcast!
        </p>
      )}
    </div>
  );
}

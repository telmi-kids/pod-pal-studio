import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Mic, Square, Save, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

interface Recording {
  id: string;
  recording_url: string;
  created_at: string;
}

export default function ChildPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Tables<"activities"> | null>(null);
  const [loading, setLoading] = useState(true);

  // Audio playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Past recordings
  const [pastRecordings, setPastRecordings] = useState<Recording[]>([]);

  // Section audio playback (TTS)
  const [playingSectionKey, setPlayingSectionKey] = useState<string | null>(null);
  const sectionAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSectionAudio = useCallback((url: string, key: string) => {
    // Stop current if playing same
    if (playingSectionKey === key && sectionAudioRef.current) {
      sectionAudioRef.current.pause();
      sectionAudioRef.current = null;
      setPlayingSectionKey(null);
      return;
    }
    // Stop previous
    if (sectionAudioRef.current) {
      sectionAudioRef.current.pause();
      sectionAudioRef.current = null;
    }
    const audio = new Audio(url);
    audio.onended = () => { setPlayingSectionKey(null); sectionAudioRef.current = null; };
    audio.play();
    sectionAudioRef.current = audio;
    setPlayingSectionKey(key);
  }, [playingSectionKey]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [actRes, recRes] = await Promise.all([
        supabase.from("activities").select("*").eq("id", id).single(),
        supabase
          .from("recordings")
          .select("id, recording_url, created_at")
          .eq("activity_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setActivity(actRes.data);
      setPastRecordings((recRes.data as Recording[]) || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

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
    if (!recordingBlob || !id) return;
    setIsSaving(true);
    try {
      const fileName = `recording-${id}-${Date.now()}.webm`;
      const { error: uploadErr } = await supabase.storage
        .from("recordings")
        .upload(fileName, recordingBlob);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("recordings")
        .getPublicUrl(fileName);

      const { error: insertErr } = await supabase.from("recordings").insert({
        activity_id: id,
        recording_url: urlData.publicUrl,
      });
      if (insertErr) throw insertErr;

      // Add to list and reset
      setPastRecordings((prev) => [
        { id: crypto.randomUUID(), recording_url: urlData.publicUrl, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setRecordingBlob(null);
      setRecordingUrl(null);
      toast.success("Recording saved! 🎉");
    } catch (e: any) {
      toast.error(e.message || "Failed to save recording");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl text-muted-foreground font-bold">Loading...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-xl text-muted-foreground font-bold">Activity not found</p>
      </div>
    );
  }

  const sections = [
    { key: "introduction", label: "🎬 Introduction", text: activity.introduction, color: "bg-kid-blue/10 border-kid-blue", audioUrl: (activity as any).introduction_audio_url },
    { key: "question_1", label: "❓ Question 1", text: activity.question_1, color: "bg-kid-green/10 border-kid-green", audioUrl: (activity as any).question_1_audio_url },
    { key: "question_2", label: "❓ Question 2", text: activity.question_2, color: "bg-kid-pink/10 border-kid-pink", audioUrl: (activity as any).question_2_audio_url },
    { key: "question_3", label: "❓ Question 3", text: activity.question_3, color: "bg-accent/10 border-accent", audioUrl: (activity as any).question_3_audio_url },
    { key: "goodbye", label: "👋 Goodbye", text: activity.goodbye, color: "bg-primary/10 border-primary", audioUrl: (activity as any).goodbye_audio_url },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-kid-blue/10 backdrop-blur border-b border-kid-blue/20 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="rounded-full gap-2 font-bold text-base"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>
        <span className="ml-auto text-sm text-muted-foreground font-semibold">
          Student View
        </span>
      </header>

      <main className="flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-lg space-y-6 animate-bounce-in">
          {/* Topic */}
          <div className="text-center">
            <p className="text-muted-foreground text-sm uppercase tracking-wide font-bold">Your Podcast</p>
            <h1 className="text-3xl font-extrabold text-foreground mt-1">{activity.topic}</h1>
          </div>

          {/* Teacher's voice brief */}
          {activity.voice_url && (
            <div className="rounded-2xl border-2 border-kid-yellow bg-kid-yellow/10 p-5">
              <p className="font-bold text-lg mb-3">🔊 Listen to your teacher's brief</p>
              <audio
                ref={audioRef}
                src={activity.voice_url}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <Button
                onClick={togglePlayback}
                className="w-full h-14 text-lg font-bold rounded-xl bg-kid-yellow hover:bg-kid-yellow/90 text-foreground gap-3"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                {isPlaying ? "Pause" : "Play Brief"}
              </Button>
            </div>
          )}

          {/* Questions */}
          {sections.map(({ label, text, color }, i) => (
            <div key={i} className={`rounded-xl border-2 p-4 ${color}`}>
              <span className="font-bold text-lg">{label}</span>
              <p className="text-base text-foreground/80 leading-relaxed mt-2">{text}</p>
            </div>
          ))}

          {/* Recording section */}
          <div className="rounded-2xl border-2 border-kid-green bg-kid-green/10 p-5 space-y-4">
            <p className="font-bold text-lg">🎙️ Record Your Podcast Episode</p>

            {!isRecording && !recordingBlob && (
              <Button
                onClick={startRecording}
                className="w-full h-16 text-xl font-bold rounded-xl bg-kid-green hover:bg-kid-green/90 gap-3"
              >
                <Mic className="h-7 w-7" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-destructive font-bold text-lg">
                  <span className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                  Recording...
                </div>
                <Button
                  onClick={stopRecording}
                  className="w-full h-16 text-xl font-bold rounded-xl bg-destructive hover:bg-destructive/90 gap-3"
                >
                  <Square className="h-6 w-6" />
                  Stop Recording
                </Button>
              </div>
            )}

            {recordingUrl && !isRecording && (
              <div className="space-y-3">
                <p className="text-kid-green font-bold text-center">✅ Episode recorded!</p>
                <audio src={recordingUrl} controls className="w-full rounded-lg" />
                <Button
                  onClick={saveRecording}
                  disabled={isSaving}
                  className="w-full h-14 text-lg font-bold rounded-xl bg-kid-green hover:bg-kid-green/90 gap-3"
                >
                  <Save className="h-6 w-6" />
                  {isSaving ? "Saving..." : "Save Recording"}
                </Button>
                <Button
                  onClick={startRecording}
                  variant="outline"
                  className="w-full h-12 text-base font-bold rounded-xl gap-2"
                >
                  <Mic className="h-5 w-5" />
                  Record Again
                </Button>
              </div>
            )}
          </div>

          {/* Past recordings */}
          {pastRecordings.length > 0 && (
            <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-4">
              <p className="font-bold text-lg">📼 Past Recordings</p>
              {pastRecordings.map((rec) => (
                <div key={rec.id} className="space-y-1">
                  <p className="text-sm text-muted-foreground font-semibold">
                    {new Date(rec.created_at).toLocaleString()}
                  </p>
                  <audio src={rec.recording_url} controls className="w-full rounded-lg" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

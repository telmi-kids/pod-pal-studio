import { useState, useRef } from "react";
import { Mic, MicOff, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormData {
  topic: string;
  ageGroup: string;
  genre: string;
  voiceBlob: Blob | null;
  documentFile: File | null;
}

interface Props {
  onSubmit: (data: FormData, documentText: string, documentBase64?: string) => void;
  isLoading: boolean;
  initialTopic?: string;
}

export default function StepForm({ onSubmit, isLoading, initialTopic }: Props) {
  const [topic, setTopic] = useState(initialTopic || "");
  const [ageGroup, setAgeGroup] = useState("");
  const [genre, setGenre] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
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
        setVoiceBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const readDocumentText = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });
  };

  const readFileAsBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string || "";
        // Strip the data URL prefix to get raw base64
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!topic || !ageGroup || !genre) {
      toast.error("Please fill in all fields!");
      return;
    }

    const isPdf = documentFile?.type === "application/pdf";
    const documentText = documentFile && !isPdf ? await readDocumentText(documentFile) : "";
    const documentBase64 = documentFile && isPdf ? await readFileAsBase64(documentFile) : undefined;
    onSubmit({ topic, ageGroup, genre, voiceBlob, documentFile }, documentText, documentBase64);
  };

  return (
    <div className="space-y-6 animate-bounce-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-foreground flex items-center justify-center gap-2">
          <Sparkles className="text-accent" /> Create Your Podcast <Sparkles className="text-accent" />
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Fill in the details to get started!</p>
      </div>

      {/* Voice Recording */}
      <div className="space-y-2">
        <Label className="text-lg font-bold">🎙️ Record Your Brief</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`rounded-full h-16 w-16 ${isRecording ? "bg-destructive hover:bg-destructive/90" : "bg-kid-pink hover:bg-kid-pink/90"}`}
          >
            {isRecording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
          </Button>
          <span className="text-muted-foreground text-lg">
            {isRecording ? "Recording... tap to stop" : voiceBlob ? "✅ Voice recorded!" : "Tap to start recording"}
          </span>
        </div>
      </div>

      {/* Topic */}
      <div className="space-y-2">
        <Label className="text-lg font-bold">📝 Podcast Topic</Label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What's your podcast about?"
          className="text-lg h-14 rounded-xl border-2 border-muted focus:border-primary"
        />
      </div>

      {/* Age Group */}
      <div className="space-y-2">
        <Label className="text-lg font-bold">👶 Age Group</Label>
        <Select value={ageGroup} onValueChange={setAgeGroup}>
          <SelectTrigger className="text-lg h-14 rounded-xl border-2 border-muted">
            <SelectValue placeholder="Choose age group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5-7">5–7 years</SelectItem>
            <SelectItem value="8-10">8–10 years</SelectItem>
            <SelectItem value="11-13">11–13 years</SelectItem>
            <SelectItem value="14-16">14–16 years</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Genre */}
      <div className="space-y-2">
        <Label className="text-lg font-bold">🎭 Genre</Label>
        <Select value={genre} onValueChange={setGenre}>
          <SelectTrigger className="text-lg h-14 rounded-xl border-2 border-muted">
            <SelectValue placeholder="Choose a genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="education">📚 Education</SelectItem>
            <SelectItem value="storytelling">📖 Storytelling</SelectItem>
            <SelectItem value="science">🔬 Science</SelectItem>
            <SelectItem value="adventure">🗺️ Adventure</SelectItem>
            <SelectItem value="comedy">😂 Comedy</SelectItem>
            <SelectItem value="music">🎵 Music</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document Upload */}
      <div className="space-y-2">
        <Label className="text-lg font-bold">📄 Upload a Document (optional)</Label>
        <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-muted hover:border-primary cursor-pointer transition-colors">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-muted-foreground text-lg">
            {documentFile ? `✅ ${documentFile.name}` : "Tap to upload a file"}
          </span>
          <input
            type="file"
            accept=".txt,.pdf,.doc,.docx,.md,.csv"
            className="hidden"
            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full h-16 text-xl font-bold rounded-xl bg-primary hover:bg-primary/90"
      >
        {isLoading ? "✨ Creating questions..." : "🚀 Generate Questions!"}
      </Button>
    </div>
  );
}

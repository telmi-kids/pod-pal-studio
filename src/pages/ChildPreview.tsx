import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Pause, Volume2, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import SectionRecorder from "@/components/SectionRecorder";
import FinalPodcastBuilder from "@/components/FinalPodcastBuilder";
import PodcastPlaylist from "@/components/PodcastPlaylist";

interface Recording {
  id: string;
  recording_url: string;
  created_at: string;
  section_key: string;
}

export default function ChildPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Tables<"activities"> | null>(null);
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [sectionRecordings, setSectionRecordings] = useState<Record<string, Recording>>({});

  const [playingSectionKey, setPlayingSectionKey] = useState<string | null>(null);
  const sectionAudioRef = useRef<HTMLAudioElement | null>(null);

  const [sectionsOpen, setSectionsOpen] = useState(true);
  const [playlistKey, setPlaylistKey] = useState(0);

  const playSectionAudio = useCallback((url: string, key: string) => {
    if (playingSectionKey === key && sectionAudioRef.current) {
      sectionAudioRef.current.pause();
      sectionAudioRef.current = null;
      setPlayingSectionKey(null);
      return;
    }
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
          .select("id, recording_url, created_at, section_key")
          .eq("activity_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setActivity(actRes.data);

      const recs = (recRes.data as Recording[]) || [];
      const map: Record<string, Recording> = {};
      for (const r of recs) {
        if (!map[r.section_key]) map[r.section_key] = r;
      }
      setSectionRecordings(map);
      // Collapse if final exists
      if (map["final"]) setSectionsOpen(false);
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

  const handleRecordingSaved = (rec: Recording) => {
    setSectionRecordings((prev) => {
      const updated = { ...prev, [rec.section_key]: rec };
      if (rec.section_key !== "final") delete updated["final"];
      return updated;
    });
    // Collapse sections when final is saved
    if (rec.section_key === "final") setSectionsOpen(false);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/preview/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard! 📋");
  };

  const ALL_SECTION_KEYS = ["introduction", "question_1", "question_2", "question_3", "goodbye"];

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

  const questionSections = [
    { key: "question_1", label: "❓ Question 1", text: activity.question_1, color: "bg-kid-green/10 border-kid-green", audioUrl: activity.question_1_audio_url },
    { key: "question_2", label: "❓ Question 2", text: activity.question_2, color: "bg-kid-pink/10 border-kid-pink", audioUrl: activity.question_2_audio_url },
    { key: "question_3", label: "❓ Question 3", text: activity.question_3, color: "bg-accent/10 border-accent", audioUrl: activity.question_3_audio_url },
  ];

  const otherSections = [
    { key: "introduction", label: "🎬 Introduction", text: activity.introduction, color: "bg-kid-blue/10 border-kid-blue", audioUrl: activity.introduction_audio_url },
    { key: "goodbye", label: "👋 Goodbye", text: activity.goodbye, color: "bg-primary/10 border-primary", audioUrl: activity.goodbye_audio_url },
  ];

  const renderSection = (section: { key: string; label: string; text: string | null; color: string; audioUrl: string | null }) => (
    <div key={section.key} className={`rounded-xl border-2 p-4 ${section.color}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg">{section.label}</span>
        {section.audioUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => playSectionAudio(section.audioUrl!, section.key)}
            className={`rounded-full h-9 w-9 p-0 ${playingSectionKey === section.key ? "text-primary animate-pulse" : "text-muted-foreground"}`}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        )}
      </div>
      <p className="text-base text-foreground/80 leading-relaxed mt-2">{section.text}</p>
      {id && (
        <SectionRecorder
          activityId={id}
          sectionKey={section.key}
          existingRecording={sectionRecordings[section.key] || null}
          onSaved={handleRecordingSaved}
        />
      )}
    </div>
  );

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
        <Button variant="outline" size="sm" onClick={copyLink} className="rounded-full gap-1.5 font-semibold">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
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

          {/* Final Podcast Builder — shown at top */}
          <FinalPodcastBuilder
            activityId={id!}
            sectionRecordings={sectionRecordings}
            allSectionKeys={ALL_SECTION_KEYS}
            onFinalSaved={handleRecordingSaved}
          />

          {/* Collapsible Recording Sections */}
          <Collapsible open={sectionsOpen} onOpenChange={setSectionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-12 rounded-xl font-bold text-base border-2"
              >
                {sectionsOpen ? "Hide Recording Sections" : "Show Recording Sections"}
                {sectionsOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {renderSection(otherSections[0])}
              {questionSections.map((s) => renderSection(s))}
              {renderSection(otherSections[1])}
            </CollapsibleContent>
          </Collapsible>

          {/* Podcast Playlist */}
          <PodcastPlaylist activityId={id!} />
        </div>
      </main>
    </div>
  );
}

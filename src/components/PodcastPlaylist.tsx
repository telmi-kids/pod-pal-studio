import { useEffect, useState } from "react";
import { Music, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FinalRecording {
  id: string;
  recording_url: string;
  created_at: string;
  student_name: string | null;
}

const cardColors = [
  "border-kid-blue/40 bg-kid-blue/5",
  "border-kid-pink/40 bg-kid-pink/5",
  "border-kid-green/40 bg-kid-green/5",
  "border-accent/40 bg-accent/5",
];

function getInitials(name: string | null): string {
  if (!name) return "S";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PodcastPlaylist({ activityId }: { activityId: string }) {
  const [recordings, setRecordings] = useState<FinalRecording[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("recordings")
        .select("id, recording_url, created_at, student_name")
        .eq("activity_id", activityId)
        .eq("section_key", "final")
        .order("created_at", { ascending: false });
      setRecordings((data as FinalRecording[]) || []);
      setLoading(false);
    };
    load();
  }, [activityId]);

  if (loading) return null;
  if (recordings.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted p-6 text-center">
        <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground font-semibold text-sm">
          No podcasts built yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
        <Music className="h-5 w-5 text-primary" />
        Podcast Playlist
        <span className="text-sm font-semibold text-muted-foreground">
          ({recordings.length})
        </span>
      </h2>
      {recordings.map((rec, i) => (
        <div
          key={rec.id}
          className={`rounded-xl border-2 p-4 space-y-3 ${cardColors[i % cardColors.length]}`}
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {getInitials(rec.student_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-foreground truncate">
                {rec.student_name || "Student"}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(rec.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <audio
            src={rec.recording_url}
            controls
            className="w-full h-10 rounded-lg"
          />
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  onNew: () => void;
  onSelect: (activity: Tables<"activities">) => void;
}

export default function StepActivities({ onNew, onSelect }: Props) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Tables<"activities">[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentMode, setStudentMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });
      setActivities(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const genreEmojis: Record<string, string> = {
    education: "📚",
    storytelling: "📖",
    science: "🔬",
    adventure: "🗺️",
    comedy: "😂",
    music: "🎵",
  };

  const cardColors = [
    "border-kid-blue bg-kid-blue/10",
    "border-kid-pink bg-kid-pink/10",
    "border-kid-green bg-kid-green/10",
    "border-accent bg-accent/10",
  ];

  const handleCardClick = (activity: Tables<"activities">) => {
    if (studentMode) {
      navigate(`/preview/${activity.id}`);
    } else {
      onSelect(activity);
    }
  };

  return (
    <div className="animate-bounce-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">
            {studentMode ? "🎙️ Choose Your Activity" : "🎧 Activity Bank"}
          </h1>
          <p className="text-muted-foreground mt-1 text-base">
            {studentMode ? "Pick one and start recording!" : "Your saved podcast activities"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!studentMode && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/settings")}
                className="h-12 w-12 rounded-xl"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                onClick={onNew}
                className="h-12 px-5 text-base font-bold rounded-xl bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-1 h-5 w-5" /> New
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Student Mode Toggle */}
      <div className="flex items-center gap-3 mb-6 p-3 rounded-xl border-2 border-border bg-card">
        <Switch
          id="student-mode"
          checked={studentMode}
          onCheckedChange={setStudentMode}
        />
        <Label htmlFor="student-mode" className="font-bold text-base cursor-pointer">
          Student Mode
        </Label>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-lg py-12">Loading activities...</div>
      ) : activities.length === 0 ? (
        <div className="text-center text-muted-foreground text-lg py-12">
          No activities yet. Create your first podcast! 🎙️
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {activities.map((a, i) => (
            <button
              key={a.id}
              onClick={() => handleCardClick(a)}
              className={`p-5 rounded-2xl border-2 text-left transition-all hover:scale-105 active:scale-95 ${cardColors[i % cardColors.length]}`}
            >
              <div className="text-3xl mb-2">{genreEmojis[a.genre] || "🎙️"}</div>
              <h3 className="font-bold text-base text-foreground truncate">{a.topic}</h3>
              <p className="text-sm text-muted-foreground mt-1">Ages {a.age_group}</p>
              <div className="flex items-center gap-1 text-muted-foreground text-sm mt-2">
                <Clock className="h-3 w-3" />
                <span>{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

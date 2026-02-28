import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, Settings, Search, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  onNew: (initialTopic?: string) => void;
  onSelect: (activity: Tables<"activities">) => void;
}

export default function StepActivities({ onNew, onSelect }: Props) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Tables<"activities">[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentMode, setStudentMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ageFilter, setAgeFilter] = useState("all");

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

  const uniqueAgeGroups = useMemo(
    () => [...new Set(activities.map((a) => a.age_group))].sort(),
    [activities]
  );

  const filtered = activities
    .filter((a) => ageFilter === "all" || a.age_group === ageFilter)
    .filter(
      (a) =>
        !searchQuery.trim() ||
        a.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                onClick={() => onNew()}
                className="h-12 px-5 text-base font-bold rounded-xl bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-1 h-5 w-5" /> New
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search Bar + Age Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities... e.g. History Year 4"
            className="pl-10 h-12 text-base rounded-xl border-2 border-muted focus:border-primary"
          />
        </div>
        <Select value={ageFilter} onValueChange={setAgeFilter}>
          <SelectTrigger className="w-[140px] h-12 rounded-xl border-2 border-muted">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {uniqueAgeGroups.map((ag) => (
              <SelectItem key={ag} value={ag}>
                {ag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground text-lg py-12">
          {searchQuery.trim() ? (
            <div className="space-y-4">
              <p>No activities match "{searchQuery}" 🔍</p>
              {!studentMode && (
                <Button
                  onClick={() => onNew(searchQuery.trim())}
                  className="h-12 px-6 text-base font-bold rounded-xl bg-primary hover:bg-primary/90"
                >
                  <Plus className="mr-1 h-5 w-5" /> Create "{searchQuery.trim()}"
                </Button>
              )}
            </div>
          ) : (
            "No activities yet. Create your first podcast! 🎙️"
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((a, i) => (
            <button
              key={a.id}
              onClick={() => handleCardClick(a)}
              className={`relative p-5 rounded-2xl border-2 text-left transition-all hover:scale-105 active:scale-95 ${cardColors[i % cardColors.length]}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(`${window.location.origin}/preview/${a.id}`);
                  toast.success("Link copied! 📋");
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Copy link"
              >
                <Share2 className="h-4 w-4" />
              </button>
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

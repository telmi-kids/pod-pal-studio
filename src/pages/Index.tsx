import { useState } from "react";
import StepForm from "@/components/StepForm";
import StepQuestions from "@/components/StepQuestions";
import StepActivities from "@/components/StepActivities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

type Screen = "form" | "questions" | "activities";

interface QuestionsData {
  introduction: string;
  question_1: string;
  question_2: string;
  question_3: string;
  goodbye: string;
}

interface FormData {
  topic: string;
  ageGroup: string;
  genre: string;
  voiceBlob: Blob | null;
  documentFile: File | null;
}

const Index = () => {
  const [screen, setScreen] = useState<Screen>("activities");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [questionsData, setQuestionsData] = useState<QuestionsData | null>(null);
  const [currentForm, setCurrentForm] = useState<FormData | null>(null);
  const [isViewingExisting, setIsViewingExisting] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const goToActivities = () => {
    setScreen("activities");
    setQuestionsData(null);
    setCurrentForm(null);
    setIsViewingExisting(false);
    setSelectedActivityId(null);
  };

  const handleFormSubmit = async (formData: FormData, documentText: string) => {
    setIsLoading(true);
    setCurrentForm(formData);

    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          topic: formData.topic,
          ageGroup: formData.ageGroup,
          genre: formData.genre,
          documentText,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setQuestionsData(data);
      setIsViewingExisting(false);
      setScreen("questions");
      toast.success("Questions generated! ✨");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate questions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (questions: QuestionsData) => {
    if (!currentForm) return;
    setIsSaving(true);

    try {
      let voiceUrl: string | null = null;
      let documentUrl: string | null = null;

      if (currentForm.voiceBlob) {
        const fileName = `voice-${Date.now()}.webm`;
        const { error } = await supabase.storage.from("voices").upload(fileName, currentForm.voiceBlob);
        if (!error) {
          const { data: urlData } = supabase.storage.from("voices").getPublicUrl(fileName);
          voiceUrl = urlData.publicUrl;
        }
      }

      if (currentForm.documentFile) {
        const fileName = `doc-${Date.now()}-${currentForm.documentFile.name}`;
        const { error } = await supabase.storage.from("documents").upload(fileName, currentForm.documentFile);
        if (!error) {
          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName);
          documentUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("activities").insert({
        topic: currentForm.topic,
        age_group: currentForm.ageGroup,
        genre: currentForm.genre,
        voice_url: voiceUrl,
        document_url: documentUrl,
        ...questions,
      });

      if (error) throw error;

      toast.success("Activity saved! 🎉");
      goToActivities();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectActivity = (activity: Tables<"activities">) => {
    setCurrentForm({
      topic: activity.topic,
      ageGroup: activity.age_group,
      genre: activity.genre,
      voiceBlob: null,
      documentFile: null,
    });
    setQuestionsData({
      introduction: activity.introduction || "",
      question_1: activity.question_1 || "",
      question_2: activity.question_2 || "",
      question_3: activity.question_3 || "",
      goodbye: activity.goodbye || "",
    });
    setIsViewingExisting(true);
    setScreen("questions");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav bar */}
      {screen !== "activities" && (
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToActivities}
            className="rounded-full gap-2 font-bold text-base"
          >
            <ArrowLeft className="h-5 w-5" />
            Activities
          </Button>

          <span className="ml-auto text-sm text-muted-foreground font-semibold">
            {screen === "form" ? "New Activity" : currentForm?.topic}
          </span>
        </header>
      )}

      <main className="flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-lg">
          {screen === "form" && (
            <StepForm onSubmit={handleFormSubmit} isLoading={isLoading} />
          )}
          {screen === "questions" && questionsData && currentForm && (
            <StepQuestions
              topic={currentForm.topic}
              data={questionsData}
              onSave={isViewingExisting ? undefined : handleSave}
              onBack={goToActivities}
              isSaving={isSaving}
            />
          )}
          {screen === "activities" && (
            <StepActivities
              onNew={() => { setIsViewingExisting(false); setScreen("form"); }}
              onSelect={handleSelectActivity}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;

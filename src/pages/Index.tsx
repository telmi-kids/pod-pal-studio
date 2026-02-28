import { useState } from "react";
import StepForm from "@/components/StepForm";
import StepQuestions from "@/components/StepQuestions";
import StepActivities from "@/components/StepActivities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
  const [initialTopic, setInitialTopic] = useState<string | undefined>();

  const goToActivities = () => {
    setScreen("activities");
    setQuestionsData(null);
    setCurrentForm(null);
    setIsViewingExisting(false);
    setSelectedActivityId(null);
    setInitialTopic(undefined);
  };

  const handleFormSubmit = async (formData: FormData, documentText: string, documentBase64?: string) => {
    setIsLoading(true);
    setCurrentForm(formData);

    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          topic: formData.topic,
          ageGroup: formData.ageGroup,
          genre: formData.genre,
          documentText,
          documentBase64,
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

      const { data: inserted, error } = await supabase.from("activities").insert({
        topic: currentForm.topic,
        age_group: currentForm.ageGroup,
        genre: currentForm.genre,
        voice_url: voiceUrl,
        document_url: documentUrl,
        ...questions,
      }).select("id").single();

      if (error) throw error;

      toast.success("Activity saved! 🎉");

      if (currentForm.voiceBlob && inserted?.id) {
        toast.info("Generating teacher voice audio... 🎙️ This may take a moment.");
        try {
          const reader = new FileReader();
          const voiceBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(",")[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(currentForm.voiceBlob!);
          });

          const { error: voiceErr } = await supabase.functions.invoke("generate-voice-audio", {
            body: {
              voiceBase64,
              activityId: inserted.id,
              sections: {
                introduction: questions.introduction,
                question_1: questions.question_1,
                question_2: questions.question_2,
                question_3: questions.question_3,
                goodbye: questions.goodbye,
              },
            },
          });

          if (voiceErr) {
            console.error("Voice generation error:", voiceErr);
            toast.error("Voice audio generation failed, but activity was saved.");
          } else {
            toast.success("Teacher voice audio generated! 🎤");
          }
        } catch (voiceE: any) {
          console.error("Voice generation error:", voiceE);
          toast.error("Voice audio generation failed, but activity was saved.");
        }
      }

      goToActivities();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateActivity = async (questions: QuestionsData) => {
    if (!selectedActivityId) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("activities")
        .update(questions)
        .eq("id", selectedActivityId);

      if (error) throw error;
      toast.success("Activity updated! ✅");
      goToActivities();
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
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
    setSelectedActivityId(activity.id);
    setScreen("questions");
  };

  return (
    <div className="min-h-screen bg-background">
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
            <StepForm onSubmit={handleFormSubmit} isLoading={isLoading} initialTopic={initialTopic} />
          )}
          {screen === "questions" && questionsData && currentForm && (
            <StepQuestions
              topic={currentForm.topic}
              data={questionsData}
              onSave={isViewingExisting ? handleUpdateActivity : handleSave}
              onBack={goToActivities}
              isSaving={isSaving}
              activityId={selectedActivityId || undefined}
            />
          )}
          {screen === "activities" && (
            <StepActivities
              onNew={(topic?: string) => {
                setIsViewingExisting(false);
                setInitialTopic(topic);
                setScreen("form");
              }}
              onSelect={handleSelectActivity}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;

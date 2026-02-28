import { useState } from "react";
import StepForm from "@/components/StepForm";
import StepQuestions from "@/components/StepQuestions";
import StepActivities from "@/components/StepActivities";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

      // Upload voice
      if (currentForm.voiceBlob) {
        const fileName = `voice-${Date.now()}.webm`;
        const { error } = await supabase.storage
          .from("voices")
          .upload(fileName, currentForm.voiceBlob);
        if (!error) {
          const { data: urlData } = supabase.storage.from("voices").getPublicUrl(fileName);
          voiceUrl = urlData.publicUrl;
        }
      }

      // Upload document
      if (currentForm.documentFile) {
        const fileName = `doc-${Date.now()}-${currentForm.documentFile.name}`;
        const { error } = await supabase.storage
          .from("documents")
          .upload(fileName, currentForm.documentFile);
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
      setScreen("activities");
      setQuestionsData(null);
      setCurrentForm(null);
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
    setScreen("questions");
  };

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-lg">
        {screen === "form" && (
          <StepForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        )}
        {screen === "questions" && questionsData && currentForm && (
          <StepQuestions
            topic={currentForm.topic}
            data={questionsData}
            onSave={handleSave}
            onBack={() => setScreen("form")}
            isSaving={isSaving}
          />
        )}
        {screen === "activities" && (
          <StepActivities
            onNew={() => setScreen("form")}
            onSelect={handleSelectActivity}
          />
        )}
      </div>
    </div>
  );
};

export default Index;

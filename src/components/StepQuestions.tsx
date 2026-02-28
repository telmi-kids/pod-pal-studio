import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Check, Save, LayoutGrid, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface QuestionsData {
  introduction: string;
  question_1: string;
  question_2: string;
  question_3: string;
  goodbye: string;
}

interface Props {
  topic: string;
  data: QuestionsData;
  onSave?: (data: QuestionsData) => void;
  onBack: () => void;
  isSaving: boolean;
}

export default function StepQuestions({ topic, data, onSave, onBack, isSaving }: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuestionsData>(data);

  const updateField = (key: keyof QuestionsData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const sections = [
    { key: "introduction" as const, label: "🎬 Introduction", color: "bg-kid-blue/10 border-kid-blue" },
    { key: "question_1" as const, label: "❓ Question 1", color: "bg-kid-green/10 border-kid-green" },
    { key: "question_2" as const, label: "❓ Question 2", color: "bg-kid-pink/10 border-kid-pink" },
    { key: "question_3" as const, label: "❓ Question 3", color: "bg-accent/10 border-accent" },
    { key: "goodbye" as const, label: "👋 Goodbye", color: "bg-primary/10 border-primary" },
  ];

  return (
    <div className="space-y-5 animate-bounce-in">
      <div className="text-center mb-6">
        <p className="text-muted-foreground text-sm uppercase tracking-wide font-bold">Podcast Topic</p>
        <h1 className="text-2xl font-extrabold text-foreground">{topic}</h1>
      </div>

      {sections.map(({ key, label, color }) => (
        <div key={key} className={`rounded-xl border-2 p-4 ${color} transition-all`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg">{label}</span>
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingField(editingField === key ? null : key)}
                className="rounded-full"
              >
                {editingField === key ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {editingField === key ? (
            <Textarea
              value={formData[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className="text-base min-h-[80px] border-0 bg-card/50 rounded-lg"
              autoFocus
            />
          ) : (
            <p className="text-base text-foreground/80 leading-relaxed">{formData[key]}</p>
          )}
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <Button onClick={onBack} variant="outline" className="flex-1 h-14 text-lg rounded-xl font-bold gap-2">
          <LayoutGrid className="h-5 w-5" />
          Activities
        </Button>
        {onSave && (
          <Button
            onClick={() => onSave(formData)}
            disabled={isSaving}
            className="flex-1 h-14 text-lg rounded-xl font-bold bg-kid-green hover:bg-kid-green/90"
          >
            <Save className="mr-2 h-5 w-5" />
            {isSaving ? "Saving..." : "Save Activity"}
          </Button>
        )}
      </div>
    </div>
  );
}

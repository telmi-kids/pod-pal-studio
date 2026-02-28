import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export default function Settings() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Tables<"training_materials">[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadMaterials = async () => {
    const { data } = await supabase
      .from("training_materials")
      .select("*")
      .order("created_at", { ascending: false });
    setMaterials(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const readFileText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        // Read text content
        const content = await readFileText(file);

        // Upload file to storage
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("training-materials")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("training-materials")
          .getPublicUrl(fileName);

        // Save to database with extracted text
        const { error: dbError } = await supabase.from("training_materials").insert({
          file_name: file.name,
          file_url: urlData.publicUrl,
          content: content,
        });

        if (dbError) throw dbError;

        toast.success(`Uploaded "${file.name}"`);
      } catch (err: any) {
        toast.error(`Failed to upload "${file.name}": ${err.message}`);
      }
    }

    setUploading(false);
    loadMaterials();
    // Reset file input
    e.target.value = "";
  };

  const handleDelete = async (material: Tables<"training_materials">) => {
    try {
      // Extract storage path from URL
      const urlParts = material.file_url.split("/training-materials/");
      const storagePath = urlParts[urlParts.length - 1];

      await supabase.storage.from("training-materials").remove([storagePath]);
      await supabase.from("training_materials").delete().eq("id", material.id);

      toast.success(`Removed "${material.file_name}"`);
      loadMaterials();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="rounded-full gap-2 font-bold text-base"
        >
          <ArrowLeft className="h-5 w-5" />
          Activities
        </Button>
        <span className="ml-auto text-sm text-muted-foreground font-semibold">Settings</span>
      </header>

      <main className="flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-lg space-y-6 animate-bounce-in">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground flex items-center gap-2">
              <BookOpen className="text-primary" /> AI Training Materials
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              Upload documents the AI should know about when generating podcast questions. 
              These materials give the AI context about your curriculum or topic area.
            </p>
          </div>

          {/* Upload area */}
          <label className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 cursor-pointer transition-colors">
            <Upload className="h-10 w-10 text-primary" />
            <span className="text-lg font-bold text-foreground">
              {uploading ? "Uploading..." : "Upload Training Documents"}
            </span>
            <span className="text-sm text-muted-foreground">
              .txt, .md, .csv, .pdf — text and PDF files supported
            </span>
            <input
              type="file"
              accept=".txt,.md,.csv,.json,.xml,.pdf"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>

          {/* Materials list */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg text-foreground">
              Uploaded Materials ({materials.length})
            </h2>

            {loading ? (
              <p className="text-muted-foreground py-6 text-center">Loading...</p>
            ) : materials.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 rounded-xl border-2 border-muted bg-muted/30">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold">No training materials yet</p>
                <p className="text-sm mt-1">Upload documents to improve AI question generation</p>
              </div>
            ) : (
              materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-muted bg-card"
                >
                  <FileText className="h-6 w-6 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{m.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.content.length > 0
                        ? `${m.content.length.toLocaleString()} characters`
                        : "No text extracted"}
                      {" · "}
                      {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(m)}
                    className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

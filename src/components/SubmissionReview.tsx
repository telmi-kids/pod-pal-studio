import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Music, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Submission {
  id: string;
  recording_url: string;
  created_at: string;
  student_name: string | null;
  status: string;
  rejection_comment: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return "S";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SubmissionReview({ activityId }: { activityId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("recordings")
      .select("id, recording_url, created_at, student_name, status, rejection_comment")
      .eq("activity_id", activityId)
      .eq("section_key", "final")
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false });
    setSubmissions((data as Submission[]) || []);
    setLoading(false);
  }, [activityId]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("recordings")
      .update({ status: "approved" } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to approve"); }
    else { toast.success("Approved! ✅"); await load(); }
    setActionLoading(null);
  };

  const reject = async (id: string) => {
    if (!rejectComment.trim()) { toast.error("Please add a comment"); return; }
    setActionLoading(id);
    const { error } = await supabase
      .from("recordings")
      .update({ status: "rejected", rejection_comment: rejectComment.trim() } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to reject"); }
    else { toast.success("Rejected"); setRejectingId(null); setRejectComment(""); await load(); }
    setActionLoading(null);
  };

  const pending = submissions.filter((s) => s.status === "pending");
  const approved = submissions.filter((s) => s.status === "approved");

  if (loading) return null;

  const renderCard = (sub: Submission, showActions: boolean) => (
    <div key={sub.id} className="rounded-xl border-2 border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {getInitials(sub.student_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-foreground truncate">
            {sub.student_name || "Student"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(sub.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      <audio src={sub.recording_url} controls className="w-full h-10 rounded-lg" />
      {showActions && (
        <div className="space-y-2">
          {rejectingId === sub.id ? (
            <div className="flex gap-2">
              <Input
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Reason for rejection..."
                className="flex-1 h-10 text-sm rounded-lg"
                autoFocus
              />
              <Button
                size="sm"
                onClick={() => reject(sub.id)}
                disabled={actionLoading === sub.id}
                className="bg-destructive hover:bg-destructive/90 rounded-lg"
              >
                {actionLoading === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectComment(""); }} className="rounded-lg">
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => approve(sub.id)}
                disabled={actionLoading === sub.id}
                className="flex-1 bg-kid-green hover:bg-kid-green/90 rounded-lg font-bold gap-1"
              >
                {actionLoading === sub.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectingId(sub.id)}
                className="flex-1 rounded-lg font-bold gap-1 text-destructive border-destructive/30"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
        <Music className="h-5 w-5 text-primary" />
        Submissions
      </h2>
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full rounded-xl">
          <TabsTrigger value="pending" className="flex-1 rounded-lg font-bold">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1 rounded-lg font-bold">
            Approved ({approved.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3 mt-3">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending submissions.</p>
          ) : pending.map((s) => renderCard(s, true))}
        </TabsContent>
        <TabsContent value="approved" className="space-y-3 mt-3">
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No approved submissions yet.</p>
          ) : approved.map((s) => renderCard(s, false))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (!authLoading && user) {
    navigate("/", { replace: true });
    return null;
  }

  const signIn = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message || "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">🎙️ Podcast Builder</h1>
          <p className="text-muted-foreground mt-2 font-semibold">Sign in to get started</p>
        </div>
        <Button
          onClick={signIn}
          disabled={loading}
          className="w-full h-14 text-lg font-bold rounded-xl gap-3"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

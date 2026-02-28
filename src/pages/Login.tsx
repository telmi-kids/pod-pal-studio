import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  if (!authLoading && user) {
    navigate("/", { replace: true });
    return null;
  }

  const canSignIn = ageConfirmed && termsAccepted;

  const signIn = async () => {
    if (!ageConfirmed) {
      toast.error("This product is available to users aged 18+ only.");
      return;
    }
    if (!termsAccepted) {
      toast.error("Please accept the Terms of Service.");
      return;
    }
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
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-foreground">🎙️ Create your account</h1>
          <p className="text-muted-foreground mt-2 font-semibold">Sign in to get started</p>
        </div>

        {/* Consent checkboxes */}
        <div className="space-y-4 text-left">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={ageConfirmed}
              onCheckedChange={(v) => setAgeConfirmed(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm font-medium text-foreground leading-tight">
              I confirm I am 18 or older.
            </span>
          </label>

          <div className="space-y-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={termsAccepted}
                onCheckedChange={(v) => setTermsAccepted(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-muted-foreground leading-tight">
                By creating an account, you agree to the{" "}
                <a href="#" className="underline text-primary font-medium">Terms of Service</a>
                {" "}and acknowledge the{" "}
                <a href="#" className="underline text-primary font-medium">Privacy Notice</a>.
              </span>
            </label>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={marketingOptIn}
              onCheckedChange={(v) => setMarketingOptIn(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-muted-foreground leading-tight">
              Send me product updates (you can unsubscribe anytime).
            </span>
          </label>
        </div>

        <Button
          onClick={signIn}
          disabled={loading || !canSignIn}
          className="w-full h-14 text-lg font-bold rounded-xl gap-3"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}

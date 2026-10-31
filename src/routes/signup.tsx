import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  User,
  Building2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const store = useStore();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("admin");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return toast.error("Please enter your name");
    if (!company.trim()) return toast.error("Please enter your company name");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid work email");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (!agreeTerms) return toast.error("Please accept the terms to create your account");

    setLoading(true);

    setTimeout(() => {
      const newUser = store.signup({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        role,
      });

      toast.success(`Account created! Welcome to Brightloop, ${newUser.name}.`);
      setLoading(false);
      navigate({ to: "/" });
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Brand Showcase Panel */}
      <div className="relative hidden md:flex md:w-1/2 bg-primary p-12 text-primary-foreground flex-col justify-between overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-black/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-white text-primary flex items-center justify-center font-bold text-xl shadow-md">
              B
            </div>
            <span className="text-2xl font-bold tracking-tight font-display text-white">
              Brightloop
            </span>
          </Link>
          <div className="mt-8 space-y-3 max-w-lg">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/15 text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Fast Onboarding
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-display leading-tight text-white">
              Launch Your Subscription Hub in Minutes
            </h1>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              Create your account to start managing recurring subscriptions, generating compliant GST tax invoices, and collecting payments via UPI & Cards.
            </p>
          </div>
        </div>

        {/* Perks Checklist */}
        <div className="relative z-10 space-y-4 py-8 border-y border-white/15 my-6">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-white">No credit card or setup fee required</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-white">Instant pre-loaded seed data for exploration</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-white">Full Odoo-style CRM, Quotation, and Billing workflow</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-white">Interactive customer self-service checkout</span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-primary-foreground/70">
          <span>Enterprise Security Standard</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> ISO 27001 & GST Ready
          </span>
        </div>
      </div>

      {/* Right Registration Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header */}
          <div className="md:hidden text-center space-y-1 mb-6">
            <div className="inline-flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                B
              </div>
              <span className="text-2xl font-bold font-display text-foreground">Brightloop</span>
            </div>
            <p className="text-xs text-muted-foreground">Subscription Management & Billing</p>
          </div>

          <Card className="border shadow-lg sm:rounded-2xl overflow-hidden">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight font-display">
                Create your account
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Set up your profile to start managing subscriptions and proposals.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Account Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Choose Account Type</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === "admin"
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "hover:bg-muted/50 border-border"
                    }`}
                  >
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" /> Vendor / Admin
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Manage subscriptions, products & collect revenue
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === "customer"
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "hover:bg-muted/50 border-border"
                    }`}
                  >
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-500" /> Customer Account
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      Access portal, review proposals & pay invoices
                    </span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Company Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Acme Corp"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Work Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@acmecorp.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Create Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="pl-9 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start space-x-2 pt-1">
                  <Checkbox
                    id="terms"
                    checked={agreeTerms}
                    onCheckedChange={(c) => setAgreeTerms(!!c)}
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                    I agree to the <span className="text-primary hover:underline">Terms of Service</span> and{" "}
                    <span className="text-primary hover:underline">Privacy Policy</span>.
                  </label>
                </div>

                <Button type="submit" disabled={loading} className="w-full gap-2 font-medium mt-2">
                  {loading ? "Creating your workspace..." : "Create Account & Get Started"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 border-t bg-muted/20 py-4 text-center text-xs text-muted-foreground">
              <p>
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </p>
              <Link to="/" className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                ← Back to Dashboard
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

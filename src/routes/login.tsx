import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Building2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const store = useStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@brightloop.in");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      store.login(email.trim());
      toast.success(`Signed in successfully as ${email}`);
      setLoading(false);
      navigate({ to: "/" });
    }, 400);
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    store.login(demoEmail);
    toast.success(`Switched and signed in as ${demoEmail}`);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Hero / Brand Showcase Panel */}
      <div className="relative hidden md:flex md:w-1/2 bg-primary p-12 text-primary-foreground flex-col justify-between overflow-hidden">
        {/* Subtle background glow effects */}
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
              <Sparkles className="h-3.5 w-3.5" /> Next-Gen SaaS Billing
            </span>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight font-display leading-tight text-white">
              Complete Subscription Lifecycle & Invoicing Engine
            </h1>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              From proposal drafting and digital signature acceptance to automated GST recurring billing and instant UPI customer collections.
            </p>
          </div>
        </div>

        {/* Value Proposition List */}
        <div className="relative z-10 space-y-4 py-8 border-y border-white/15 my-6">
          <div className="flex items-start gap-3">
            <div className="p-1 rounded bg-white/15 text-white shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Automated Recurring Billing Engine</p>
              <p className="text-xs text-primary-foreground/75">
                Calculates daily, weekly, monthly, and annual cycles with idempotent GST invoices.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 rounded bg-white/15 text-white shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Interactive Customer Portal</p>
              <p className="text-xs text-primary-foreground/75">
                Self-service QR code UPI, cards, net banking payments & online proposal signing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1 rounded bg-white/15 text-white shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Real-Time Revenue Analytics</p>
              <p className="text-xs text-primary-foreground/75">
                Instant visibility into MRR, ARR, collection velocity, and churn risk.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-primary-foreground/70">
          <span>© 2026 Brightloop Cloud Technologies</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> 256-bit SSL Protected
          </span>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="md:hidden text-center space-y-2 mb-6">
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
                Sign in to your account
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter your work email and password to access your workspace.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Demo Account Fast-Switchers */}
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Quick Demo Login (1-Click)
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin("admin@brightloop.in")}
                    className="p-2 rounded-lg border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left flex flex-col justify-between"
                  >
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" /> Admin
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">Full Access</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("staff@brightloop.in")}
                    className="p-2 rounded-lg border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left flex flex-col justify-between"
                  >
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-blue-500" /> Staff
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">Operations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin("billing@acme.com")}
                    className="p-2 rounded-lg border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left flex flex-col justify-between"
                  >
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-emerald-500" /> Customer
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">Client Portal</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Work Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Password</label>
                    <button
                      type="button"
                      onClick={() => toast.info("Password reset simulated: Login with any password in demo mode.")}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(c) => setRememberMe(!!c)}
                  />
                  <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
                    Remember my session on this device
                  </label>
                </div>

                <Button type="submit" disabled={loading} className="w-full gap-2 font-medium">
                  {loading ? "Authenticating..." : "Sign In to Workspace"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t bg-muted/20 py-4 text-center text-xs text-muted-foreground">
              <p>
                Don't have a workspace yet?{" "}
                <Link to="/signup" className="font-semibold text-primary hover:underline">
                  Sign up for free
                </Link>
              </p>
              <Link to="/" className="text-[11px] text-muted-foreground hover:text-foreground hover:underline">
                ← Back to Dashboard Demo
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

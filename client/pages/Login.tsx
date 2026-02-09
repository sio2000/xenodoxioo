import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";

export default function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock authentication
    setTimeout(() => {
      setIsLoading(false);
      alert("Login successful! Redirect to dashboard.");
    }, 1500);
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center container-max py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t("auth.welcomeBack")}
            </h1>
            <p className="text-muted-foreground">{t("auth.signInMessage")}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t("auth.email")}
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-3 text-muted-foreground"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder={t("auth.emailPlaceholder")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t("auth.password")}
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-3 text-muted-foreground"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-foreground">{t("auth.rememberMe")}</span>
              </label>
              <a
                href="/forgot-password"
                className="text-primary hover:underline"
              >
                {t("auth.forgotPassword")}
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {isLoading ? t("auth.signingIn") : t("auth.signInButton")}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">{t("common.or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.noAccount")} {" "}
            <Link
              to="/register"
              className="text-primary font-semibold hover:underline"
            >
              {t("auth.createOne")}
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

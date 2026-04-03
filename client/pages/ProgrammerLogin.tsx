import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import { useLanguage } from "@/hooks/useLanguage";

export default function ProgrammerLogin() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl("/api/programmer/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.accessToken) {
        localStorage.setItem(
          "programmer",
          JSON.stringify({
            accessToken: data.accessToken,
            email: data.email,
            role: data.role,
          }),
        );
        navigate("/programmer");
        return;
      }

      if (data.error === "Programmer login is not configured on the server") {
        setError(t("programmer.login.notConfigured"));
      } else {
        setError(typeof data.error === "string" ? data.error : "Login failed");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("programmer.login.title")}</CardTitle>
            <CardDescription>{t("programmer.login.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prog-email">{t("programmer.login.email")}</Label>
                <Input
                  id="prog-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prog-password">{t("programmer.login.password")}</Label>
                <Input
                  id="prog-password"
                  type="password"
                  autoComplete="current-password"
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("programmer.login.loggingIn") : t("programmer.login.button")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

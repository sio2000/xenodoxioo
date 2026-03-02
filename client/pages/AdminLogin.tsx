import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";

export default function AdminLogin() {
  const [email, setEmail] = useState("admin@booking.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const admin = await response.json();
        // Store admin info in localStorage (simplified)
        localStorage.setItem("admin", JSON.stringify(admin));
        navigate("/admin");
      } else {
        const data = await response.json();
        const msg =
          data.error === "Invalid credentials"
            ? "Λάθος email ή κωδικός. Χρησιμοποιήστε admin@booking.com / admin123. Βεβαιωθείτε ότι έχετε τρέξει pnpm db:seed στο backend (Render)."
            : data.error || "Login failed";
        setError(msg);
      }
    } catch (err) {
      setError(
        "Δεν ήταν δυνατή η σύνδεση με το backend. Ελέγξτε ότι το VITE_API_URL ορίζει το Render URL και κάντε redeploy στο Netlify."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the admin panel.
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Demo: admin@booking.com / admin123
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { Mail, Lock, User } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";

export default function Register() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert(t("auth.passwordMismatch"));
      return;
    }
    setIsLoading(true);
    // Mock registration
    setTimeout(() => {
      setIsLoading(false);
      alert("Account created! Please check your email to verify.");
    }, 1500);
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center container-max py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {t("auth.createAccount")}
                  </h1>
                  <p className="text-muted-foreground">{t("auth.joinMessage")}</p>
                </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                  {t("checkout.firstName")}
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-3 text-muted-foreground"
                  />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder={t("auth.firstNamePlaceholder")}
                  />
                </div>
              </div>
              <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                  {t("checkout.lastName")}
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-3 text-muted-foreground"
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    placeholder={t("auth.lastNamePlaceholder")}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t("checkout.email")}
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-3 text-muted-foreground"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder={t("auth.passwordPlaceholder")}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                {t("auth.confirmPassword")}
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-3 text-muted-foreground"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  placeholder={t("auth.passwordPlaceholder")}
                />
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" required className="mt-1 w-4 h-4" />
              <span className="text-sm text-foreground">{t("auth.agreeTerms")}</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center mt-6 disabled:opacity-50"
            >
              {isLoading ? t("auth.creatingAccount") : t("auth.createButton")}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t("auth.haveAccount")} {" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">{t("auth.signIn")}</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

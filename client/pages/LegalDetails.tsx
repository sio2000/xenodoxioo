import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { FileText, Building2, Shield } from "lucide-react";

export default function LegalDetails() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container-max section-padding">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("legal.title")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            {t("legal.subtitle")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Property License Details */}
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {t("legal.propertyLicensesTitle")}
              </h2>
            </div>
            <div className="space-y-6 text-sm">
              {/* Lykoskufi Villas */}
              <div className="border-b border-border pb-4">
                <h3 className="font-semibold text-foreground mb-2">Lykoskufi Villas</h3>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{t("legal.eot")}</span> 1365294
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">ΚΑΕΚ</span> 031751707103
                </p>
              </div>
              {/* Ogra House */}
              <div className="border-b border-border pb-4">
                <h3 className="font-semibold text-foreground mb-2">Ogra House</h3>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{t("legal.aa")}</span> 1246K91000329401
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">ΚΑΕΚ</span> 031751707112
                </p>
              </div>
              {/* The Bungalows */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">The Bungalows</h3>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{t("legal.aa")}</span> 1283732
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">ΚΑΕΚ</span> 031751707110
                </p>
              </div>
            </div>
          </section>

          {/* Business Details */}
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {t("legal.businessTitle")}
              </h2>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-foreground text-lg">ALTIN COTA</p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">ΑΦΜ:</span> 116379920
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">ΓΕΜΗ:</span> 148929614000
              </p>
            </div>
          </section>

          {/* GDPR & Privacy */}
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield size={20} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {t("legal.gdprTitle")}
              </h2>
            </div>
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
              <p>{t("legal.gdpr.intro")}</p>
              <h4 className="font-semibold text-foreground">{t("legal.gdpr.dataController")}</h4>
              <p>{t("legal.gdpr.dataControllerDesc")}</p>
              <h4 className="font-semibold text-foreground">{t("legal.gdpr.purpose")}</h4>
              <p>{t("legal.gdpr.purposeDesc")}</p>
              <h4 className="font-semibold text-foreground">{t("legal.gdpr.rights")}</h4>
              <p>{t("legal.gdpr.rightsDesc")}</p>
              <h4 className="font-semibold text-foreground">{t("legal.gdpr.retention")}</h4>
              <p>{t("legal.gdpr.retentionDesc")}</p>
              <h4 className="font-semibold text-foreground">{t("legal.gdpr.complaint")}</h4>
              <p>{t("legal.gdpr.complaintDesc")}</p>
            </div>
          </section>

          {/* Back link */}
          <div className="text-center pt-4">
            <Link
              to="/"
              className="text-primary hover:underline font-medium"
            >
              {t("legal.backToHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

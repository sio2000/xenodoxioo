import Layout from "@/components/Layout";
import {
  CalendarRange,
  DollarSign,
  HelpCircle,
  Settings,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  PaymentSettingsPanelProgrammer,
  PricesAndPeriodPanelProgrammer,
  PricingAndDiscountsProgrammer,
  TaxSettingsPanelProgrammer,
} from "@/components/staff/ProgrammerStaffPanels";

const SECTION_ACCENTS: Record<
  string,
  { borderL: string; headerTint: string; iconTint: string; navButton: string }
> = {
  "programmer-section-prices": {
    borderL: "border-l-amber-500",
    headerTint: "bg-amber-50 dark:bg-amber-950/40",
    iconTint: "text-amber-600 dark:text-amber-400",
    navButton:
      "bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white border-2 border-amber-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
  "programmer-section-pricing": {
    borderL: "border-l-violet-500",
    headerTint: "bg-violet-50 dark:bg-violet-950/40",
    iconTint: "text-violet-600 dark:text-violet-400",
    navButton:
      "bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white border-2 border-violet-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
  "programmer-section-settings": {
    borderL: "border-l-slate-500",
    headerTint: "bg-slate-50 dark:bg-slate-950/40",
    iconTint: "text-slate-600 dark:text-slate-400",
    navButton:
      "bg-slate-600 hover:bg-slate-500 active:scale-[0.98] text-white border-2 border-slate-800 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  },
};

function ProgrammerAreaSection({
  sectionId,
  titleId,
  title,
  help,
  helpAriaLabel,
  icon: Icon,
  children,
}: {
  sectionId: string;
  titleId: string;
  title: string;
  help: string;
  helpAriaLabel: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const accent = SECTION_ACCENTS[sectionId] ?? SECTION_ACCENTS["programmer-section-prices"];
  return (
    <section
      id={sectionId}
      aria-labelledby={titleId}
      className="scroll-mt-20 mb-8 md:mb-10"
    >
      <div
        className={cn(
          "rounded-xl border border-border bg-card shadow-sm p-4 md:p-5 border-l-4",
          accent.borderL,
        )}
      >
        <header
          className={cn(
            "mb-4 pb-3 border-b border-border -mx-1 px-3 py-2 rounded-lg",
            accent.headerTint,
          )}
        >
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <h2
              id={titleId}
              className="text-xl md:text-2xl font-bold text-foreground flex flex-wrap items-center gap-2 pr-1"
            >
              <Icon className={cn("h-7 w-7 shrink-0", accent.iconTint)} strokeWidth={1.75} aria-hidden />
              {title}
            </h2>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex shrink-0 rounded-full p-1.5 min-h-10 min-w-10 items-center justify-center",
                    "text-foreground/70 hover:text-foreground hover:bg-background/80 border border-border/60 transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  )}
                  aria-label={helpAriaLabel}
                >
                  <HelpCircle className="h-5 w-5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-sm text-left leading-snug z-[300]">
                {help}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}

export default function Programmer() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem("programmer");
    if (!raw) {
      navigate("/programmer/login");
      return;
    }
    try {
      const token = JSON.parse(raw).accessToken;
      if (!token) navigate("/programmer/login");
    } catch {
      navigate("/programmer/login");
    }
  }, [navigate]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  };

  const logout = () => {
    localStorage.removeItem("programmer");
    navigate("/programmer/login");
  };

  const navItems = [
    {
      id: "programmer-section-prices",
      label: t("admin.pricesAndPeriod"),
      icon: CalendarRange,
      navButton: SECTION_ACCENTS["programmer-section-prices"].navButton,
    },
    {
      id: "programmer-section-pricing",
      label: t("admin.pricing"),
      icon: Tag,
      navButton: SECTION_ACCENTS["programmer-section-pricing"].navButton,
    },
    {
      id: "programmer-section-settings",
      label: t("admin.settings"),
      icon: Settings,
      navButton: SECTION_ACCENTS["programmer-section-settings"].navButton,
    },
  ] as const;

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white py-5 mb-5 shadow-lg">
          <div className="container-max flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold drop-shadow-sm">{t("programmer.title")}</h1>
              <p className="text-white/85 mt-1 text-sm md:text-base max-w-2xl">{t("programmer.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
              >
                {t("programmer.backToSite")}
              </button>
              <button
                type="button"
                onClick={logout}
                className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
              >
                {t("programmer.logout")}
              </button>
            </div>
          </div>
        </div>

        <div className="container-max pb-8">
          <nav
            aria-label={t("programmer.areasNavLabel")}
            className="sticky top-0 z-20 -mx-4 px-4 py-2.5 mb-6 rounded-b-xl border-b border-white/10 bg-gradient-to-b from-muted/90 to-background/95 backdrop-blur-md shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1 min-h-[3.75rem] px-2 py-2 rounded-xl font-bold text-xs sm:text-sm text-center leading-tight transition-transform",
                      item.navButton,
                    )}
                  >
                    <span className="absolute top-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-black text-white border border-white/30">
                      {idx + 1}
                    </span>
                    <Icon size={22} className="shrink-0 opacity-95" aria-hidden />
                    <span className="line-clamp-2">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <ProgrammerAreaSection
            sectionId="programmer-section-prices"
            titleId="programmer-heading-prices"
            title={t("admin.pricesAndPeriod")}
            help={t("admin.section.pricesPeriod.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={CalendarRange}
          >
            <PricesAndPeriodPanelProgrammer />
          </ProgrammerAreaSection>

          <ProgrammerAreaSection
            sectionId="programmer-section-pricing"
            titleId="programmer-heading-pricing"
            title={t("admin.pricing")}
            help={t("admin.section.pricing.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={DollarSign}
          >
            <PricingAndDiscountsProgrammer />
          </ProgrammerAreaSection>

          <ProgrammerAreaSection
            sectionId="programmer-section-settings"
            titleId="programmer-heading-settings"
            title={t("admin.settings")}
            help={t("admin.section.settings.help")}
            helpAriaLabel={t("admin.sectionHelpHint")}
            icon={Settings}
          >
            <div className="grid gap-4 max-w-2xl">
              <TaxSettingsPanelProgrammer />
              <PaymentSettingsPanelProgrammer />
            </div>
          </ProgrammerAreaSection>
        </div>
      </div>
    </Layout>
  );
}

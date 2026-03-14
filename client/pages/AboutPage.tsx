import { motion } from "framer-motion";
import { MapPin, Home, Users, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { apiUrl, imageUrl } from "@/lib/api";
import Layout from "@/components/Layout";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=85";
const FALLBACK_INTERIOR = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85";
const FALLBACK_SEA = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=85";

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export default function About() {
  const { language, t } = useLanguage();
  const [propertyImages, setPropertyImages] = useState<{
    hero: string;
    interior: string;
    sea: string;
  }>({ hero: FALLBACK_HERO, interior: FALLBACK_INTERIOR, sea: FALLBACK_SEA });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/properties"));
        if (!res.ok || !mounted) return;
        const json = await res.json();
        const data = (json.data ?? []) as { mainImage?: string; galleryImages?: string[] }[];
        if (data.length === 0) return;
        const first = data[0];
        const gallery = Array.isArray(first.galleryImages) ? first.galleryImages : [];
        setPropertyImages({
          hero: imageUrl(first.mainImage) || FALLBACK_HERO,
          interior: imageUrl(gallery[1] ?? gallery[0] ?? first.mainImage) || FALLBACK_INTERIOR,
          sea: imageUrl(gallery[2] ?? gallery[0] ?? first.mainImage) || FALLBACK_SEA,
        });
      } catch {
        /* keep fallbacks */
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-[#fafaf9]">
        {/* Hero — full-bleed image, refined overlay */}
        <section className="relative h-[65vh] min-h-[420px] overflow-hidden">
          <img
            src="/644024829_926388910567259_6978044638543006750_n.jpg"
            alt="Leonidion villas"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="container-max w-full">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="max-w-2xl mx-auto text-center"
              >
                <h1 className="luxury-heading text-4xl md:text-5xl lg:text-6xl text-white tracking-tight">
                  LEONIDIONHOUSES
                </h1>
                <p className="mt-4 text-lg md:text-xl text-white/90 font-light leading-relaxed">
                  {t("about.hero.subtitle")}
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Trust bar — subtle, credible */}
        <section className="border-b border-border/60 bg-white/80 backdrop-blur-sm">
          <div className="container-max py-8 md:py-10">
            <motion.div
              initial="initial"
              animate="animate"
              variants={containerVariants}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
            >
              {[
                { label: t("about.trust.years"), value: t("about.trust.yearsVal") },
                { label: t("about.trust.properties"), value: t("about.trust.propertiesVal") },
                { label: "Ευχαριστημένοι Επισκέπτες", value: "5000+" },
                { label: "Θετικές Κριτικές", value: "100+" },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeIn} className="text-center">
                  <p className="text-2xl md:text-3xl luxury-heading text-foreground">{item.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground uppercase tracking-wider">{item.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Philosophy — editorial storytelling */}
        <section className="luxury-section-padding">
          <div className="container-max">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className="order-2 lg:order-1"
              >
                <h2 className="luxury-heading text-3xl md:text-4xl text-foreground">
                  {t("about.philosophy.title")}
                </h2>
                <div className="luxury-divider my-8" />
                <div className="space-y-6 text-muted-foreground leading-relaxed text-base md:text-lg">
                  <p>{t("about.philosophy.p1")}</p>
                  <p>{t("about.philosophy.p2")}</p>
                  <p>{t("about.philosophy.p3")}</p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className="order-1 lg:order-2"
              >
                <div className="aspect-[4/5] rounded-lg overflow-hidden shadow-luxury-md">
                  <img
                    src="/645696801_1911893926199490_2525005987881341297_n.jpg"
                    alt="Villa interior"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Leonidionhouses — properties description */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container-max max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6 }}
              className="space-y-12"
            >
              <h2 className="luxury-heading text-3xl md:text-4xl text-foreground">
                Leonidionhouses
              </h2>
              <div className="luxury-divider" />
              <div className="space-y-6 text-muted-foreground leading-relaxed text-base md:text-lg">
                <p>{t("about.leonidionhouses.intro1")}</p>
                <p>{t("about.leonidionhouses.intro2")}</p>
              </div>

              {[
                { key: "ograHouse", paras: ["p1", "p2"] },
                { key: "smallBungalow", paras: ["p1", "p2", "p3", "p4"] },
                { key: "bigBungalow", paras: ["p1", "p2", "p3", "p4"] },
                { key: "lykoskufi1", paras: ["p1", "p2"] },
                { key: "lykoskufi2", paras: ["p1", "p2"] },
                { key: "lykoskufi5", paras: ["p1", "p2", "p3"] },
              ].map((prop, i) => {
                const title = t(`about.${prop.key}.title`);
                return (
                  <motion.div
                    key={prop.key}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="border-b border-border/50 pb-10 last:border-0 last:pb-0"
                  >
                    <h3 className="font-semibold text-foreground text-xl mb-4">{title}</h3>
                    <div className="space-y-4 text-muted-foreground leading-relaxed text-base">
                      {prop.paras.map((p) => {
                        const text = t(`about.${prop.key}.${p}`);
                        return text ? <p key={p}>{text}</p> : null;
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Features — minimal cards */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container-max">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {[
                { icon: MapPin, title: t("about.features.location"), desc: t("about.features.locationDesc") },
                { icon: Home, title: t("about.features.architecture"), desc: t("about.features.architectureDesc") },
                { icon: Users, title: t("about.features.privacy"), desc: t("about.features.privacyDesc") },
                { icon: Award, title: t("about.features.experience"), desc: t("about.features.experienceDesc") },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="group p-8 rounded-lg border border-border/50 hover:border-primary/30 transition-colors duration-300"
                >
                  <item.icon className="w-8 h-8 text-primary/80 mb-4" strokeWidth={1.25} />
                  <h3 className="font-medium text-foreground text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Large editorial image */}
        <section className="py-0">
          <div className="container-max">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="aspect-[21/9] md:aspect-[3/1] rounded-lg overflow-hidden"
            >
              <img
                src={propertyImages.sea}
                alt="Sea view"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </section>

        {/* CTA — confident, minimal */}
        <section className="luxury-section-padding bg-[#fafaf9]">
          <div className="container-max text-center max-w-2xl mx-auto">
          </div>
        </section>
      </div>
    </Layout>
  );
}

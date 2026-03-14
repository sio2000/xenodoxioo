import { HelpCircle, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

export default function FAQ() {
  const { t } = useLanguage();

  const faqs = [
    {
      question: t("faq.q1.question"),
      answer: t("faq.q1.answer")
    },
    {
      question: t("faq.q2.question"),
      answer: t("faq.q2.answer")
    },
    {
      question: t("faq.q4.question"),
      answer: t("faq.q4.answer")
    },
    {
      question: t("faq.q5.question"),
      answer: t("faq.q5.answer")
    },
    {
      question: t("faq.q6.question"),
      answer: t("faq.q6.answer")
    },
    {
      question: t("faq.q7.question"),
      answer: t("faq.q7.answer")
    },
    {
      question: t("faq.q8.question"),
      answer: t("faq.q8.answer")
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container-max section-padding">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("faq.title")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            {t("faq.subtitle")}
          </p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto space-y-6">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-lg p-6 border border-border hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <HelpCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8 border border-border">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {t("faq.contactTitle")}
            </h2>
            <p className="text-muted-foreground mb-8">
              {t("faq.contactSubtitle")}
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail size={20} />
                <a 
                  href={`mailto:${t("footer.email")}`}
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.email")}
                </a>
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone size={20} />
                <a 
                  href={`tel:${t("footer.phone")}`}
                  className="hover:text-primary transition-colors"
                >
                  {t("footer.phone")}
                </a>
              </div>
              
              <div className="flex items-start gap-3 text-muted-foreground">
                <MapPin size={20} className="mt-1 flex-shrink-0" />
                <span>{t("footer.address")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center container-max section-padding">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <p className="text-2xl font-bold text-foreground mb-2">
            {t("common.pageNotFound")}
          </p>
          <p className="text-muted-foreground text-lg mb-8">
            {t("common.pageNotFoundDesc")}
          </p>
          <Link to="/" className="btn-primary">
            {t("common.returnHome")}
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;

import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { formatStayDate, stayLocale } from "@/lib/stay-dates";
import { AlertTriangle, Calendar, Home, Users } from "lucide-react";

type BookingPreview = {
  id: string;
  bookingNumber: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
  totalPrice: number;
  unitName: string;
  propertyName: string;
};

export default function CancelBooking() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { t, language } = useLanguage();
  const [booking, setBooking] = useState<BookingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t("cancelBooking.invalidLink"));
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl(`/api/cancel-booking?token=${encodeURIComponent(token)}`));
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(json.error || t("cancelBooking.invalidLink"));
          setLoading(false);
          return;
        }

        const data = json.data;
        setBooking({
          id: data.id,
          bookingNumber: data.bookingNumber,
          guestName: data.guestName,
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          nights: data.nights,
          guests: data.guests,
          totalPrice: data.totalPrice,
          unitName: data.unitName || "N/A",
          propertyName: data.propertyName || "N/A",
        });
      } catch {
        setError(t("cancelBooking.invalidLink"));
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [token, t]);

  const handleCancel = async () => {
    if (!token || !confirmTerms) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(apiUrl("/api/cancel-booking"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCancelError(json.error || t("dashboard.cancelError"));
        setCancelling(false);
        return;
      }
      setCancelled(true);
    } catch {
      setCancelError(t("dashboard.cancelError"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center container-max section-padding">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (error && !booking) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center container-max section-padding">
          <div className="text-center max-w-md">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">{error}</h1>
            <p className="text-muted-foreground mb-6">
              {t("cancelBooking.errorDesc")}
            </p>
            <Link to="/" className="btn-primary">
              {t("cancelBooking.backHome")}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (cancelled) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center container-max section-padding">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">{t("cancelBooking.successTitle")}</h1>
            <p className="text-muted-foreground mb-6">{t("cancelBooking.successMessage")}</p>
            <Link to="/" className="btn-primary">
              {t("cancelBooking.backHome")}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!booking) return null;

  const checkIn = formatStayDate(booking.checkInDate, stayLocale(language), "long");
  const checkOut = formatStayDate(booking.checkOutDate, stayLocale(language), "long");

  return (
    <Layout>
      <div className="container-max section-padding min-h-screen py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-8">{t("cancelBooking.pageTitle")}</h1>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">{t("cancelBooking.bookingDetails")}</h2>
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-foreground">
                <Home className="w-4 h-4 text-muted-foreground" />
                <span><strong>{booking.propertyName}</strong> · {booking.unitName}</span>
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{checkIn} – {checkOut} ({booking.nights} {t("common.nights")})</span>
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{booking.guests} {t("common.guests")} · {booking.guestName}</span>
              </p>
              <p className="text-lg font-semibold pt-2">
                {t("checkout.total")}: {formatCurrency(booking.totalPrice, language)}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-6">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-4">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  {t("cancelBooking.confirmQuestion")}
                </h3>
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  {t("cancelBooking.datesReleased")}
                </p>
                <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                  {t("cancelBooking.noRefund")}
                </p>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm pt-2">
                  {t("dashboard.cancelConfirm21DaysTitle")}
                </h4>
                <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 text-sm space-y-1">
                  <li>{t("dashboard.cancelConfirmBullet1")}</li>
                  <li>{t("dashboard.cancelConfirmBullet2")}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmTerms}
                onChange={(e) => setConfirmTerms(e.target.checked)}
                className="mt-1 rounded border-border"
              />
              <span className="text-sm text-muted-foreground">{t("cancelBooking.acceptTerms")}</span>
            </label>

            {cancelError && (
              <p className="text-sm text-red-600">{cancelError}</p>
            )}

            <button
              onClick={handleCancel}
              disabled={!confirmTerms || cancelling}
              className="w-full py-3 px-4 rounded-lg font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
            >
              {cancelling ? t("dashboard.cancelling") : t("cancelBooking.confirmButton")}
            </button>

            <Link
              to="/"
              className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("common.cancel")} · {t("cancelBooking.backHome")}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { formatStayDate, stayLocale } from "@/lib/stay-dates";

type BookingData = {
  id: string;
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  status: string;
  totalPrice: number;
  subtotal: number;
  cleaningFee: number;
  taxes: number;
  discountAmount: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  guests: number;
  unit?: {
    id: string;
    name: string;
    property?: { id: string; name: string };
  };
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email")?.trim() || "";
  const { t, language } = useLanguage();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Missing booking id");
      setLoading(false);
      return;
    }

    const rawAuth = localStorage.getItem("auth");
    let accessToken: string | null = null;
    if (rawAuth) {
      try {
        const parsed = JSON.parse(rawAuth);
        accessToken = parsed.accessToken;
      } catch { /* invalid */ }
    }

    // Guest access: ?email= required when no auth
    if (!accessToken && !emailParam) {
      setError("auth_required");
      setLoading(false);
      return;
    }

    const fetchBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = accessToken
          ? apiUrl(`/api/bookings/${id}`)
          : apiUrl(`/api/bookings/${id}?email=${encodeURIComponent(emailParam)}`);
        const response = await fetch(url, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(json.error || "Booking not found");
          setLoading(false);
          return;
        }

        const data = json.data;
        setBooking({
          id: data.id,
          bookingNumber: data.bookingNumber,
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          nights: data.nights,
          status: data.status,
          totalPrice: data.totalPrice,
          subtotal: data.subtotal,
          cleaningFee: data.cleaningFee,
          taxes: data.taxes,
          discountAmount: data.discountAmount ?? 0,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          guests: data.guests,
          unit: data.unit,
        });
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id, emailParam]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center container-max section-padding">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (error === "auth_required") {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center container-max section-padding">
          <div className="text-center max-w-md">
            <p className="text-muted-foreground mb-4">
              {t("dashboard.loginToViewBooking")}
            </p>
            <Link to="/login" className="btn-primary">
              {t("common.login")}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !booking) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center container-max section-padding">
          <div className="text-center max-w-md">
            <p className="text-muted-foreground mb-4">
              {error === "You do not have access to this booking"
                ? t("dashboard.noAccessToBooking")
                : t("common.pageNotFoundDesc")}
            </p>
            <Link to="/dashboard" className="btn-primary">
              {t("dashboard.backToBookings")}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const checkInLabel = formatStayDate(booking.checkInDate, stayLocale(language));
  const checkOutLabel = formatStayDate(booking.checkOutDate, stayLocale(language));
  const statusKey =
    booking.status === "CONFIRMED"
      ? "confirmed"
      : booking.status.toLowerCase();
  const propertyName = booking.unit?.property?.name ?? "";
  const unitName = booking.unit?.name ?? "";

  const isGuestView = !localStorage.getItem("auth") && !!emailParam;

  return (
    <Layout>
      <div className="container-max section-padding min-h-screen">
        <div className="max-w-2xl mx-auto">
          <Link
            to={isGuestView ? "/properties" : "/dashboard"}
            className="inline-flex items-center text-primary hover:underline mb-6"
          >
            ← {isGuestView ? (t("common.back") || "Πίσω") : t("dashboard.backToBookings")}
          </Link>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {t("dashboard.bookingDetails")} #{booking.bookingNumber}
              </h1>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  booking.status === "CONFIRMED"
                    ? "bg-green-100 text-green-700"
                    : booking.status === "CANCELLED"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {t(`dashboard.${statusKey}`)}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-foreground">
                <span className="font-semibold">{propertyName}</span>
                {unitName && ` · ${unitName}`}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("dashboard.checkIn")}: {checkInLabel} → {t("dashboard.checkOut")}:{" "}
                {checkOutLabel} ({booking.nights} {t("common.nights")})
              </p>
              <p className="text-muted-foreground text-sm">
                {t("common.guests")}: {booking.guests}
              </p>
              <p className="text-muted-foreground text-sm">
                {booking.guestName} · {booking.guestEmail}
                {booking.guestPhone ? ` · ${booking.guestPhone}` : ""}
              </p>
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("checkout.subtotal")}
                  </span>
                  <span>{formatCurrency(booking.subtotal, language)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("checkout.cleaningFee")}
                </span>
                <span>{formatCurrency(booking.cleaningFee, language)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("checkout.taxes")}
                </span>
                <span>{formatCurrency(booking.taxes, language)}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t("checkout.discount")}</span>
                  <span>-{formatCurrency(booking.discountAmount, language)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>{t("checkout.total")}</span>
                <span>{formatCurrency(booking.totalPrice, language)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

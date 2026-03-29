import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { formatStayDate, stayLocale } from "@/lib/stay-dates";
import { CreditCard, Lock, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

type QuoteResponse = {
  unit: { id: string; name?: string; maxGuests?: number; basePrice?: number; cleaningFee?: number };
  pricing: {
    nights: number;
    basePrice: number;
    subtotal: number;
    cleaningFee: number;
    discountAmount: number;
    taxes: number;
    taxRate: number;
    totalPrice: number;
    depositAmount: number;
    balanceAmount: number;
    isFullPayment: boolean;
    scheduledChargeDate: string | null;
  };
};

// ── Stripe Payment Form ────────────────────────────────────────────

function StripePaymentForm({
  onSuccess,
  isProcessing,
  setIsProcessing,
  clientSecret,
}: {
  onSuccess: (paymentIntentId?: string) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  clientSecret: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/dashboard",
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Payment failed");
      setIsProcessing(false);
      return;
    }

    const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
    if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      console.warn("[CHECKOUT] Payment status after confirm:", paymentIntent?.status);
      if (paymentIntent?.status === "processing") {
        onSuccess(paymentIntent?.id);
      } else {
        setErrorMessage(`Payment status: ${paymentIntent?.status || "unknown"}. Please try again.`);
        setIsProcessing(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMessage && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="btn-primary w-full justify-center text-lg py-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}

// ── Main Checkout ──────────────────────────────────────────────────

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Payment state
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string>("DEPOSIT");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [step, setStep] = useState<"info" | "payment">("info");

  const offerToken = searchParams.get("offer");
  const unitId = searchParams.get("unit") || null;
  const propertyId = searchParams.get("property") || null;
  const checkIn = searchParams.get("checkIn") ?? searchParams.get("checkin") ?? null;
  const checkOut = searchParams.get("checkOut") ?? searchParams.get("checkout") ?? null;
  const guests = searchParams.get("guests") ?? "2";

  const [offerData, setOfferData] = useState<{
    token: string;
    unitId: string;
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    customTotalEur: number;
    unit?: { name?: string };
    property?: { name?: string };
  } | null>(null);

  const isOfferFlow = !!offerToken;
  const effectiveUnitId = isOfferFlow ? offerData?.unitId : unitId;
  const effectiveCheckIn = isOfferFlow ? offerData?.checkIn : checkIn;
  const effectiveCheckOut = isOfferFlow ? offerData?.checkOut : checkOut;
  const effectiveGuests = isOfferFlow ? (offerData?.guests ?? 2) : Number(guests) || 2;

  const { language, t } = useLanguage();

  useEffect(() => {
    try {
      const auth = localStorage.getItem("auth");
      if (auth) {
        const parsed = JSON.parse(auth);
        setIsLoggedIn(true);
        setFormData((prev) => ({ ...prev, email: parsed.email || "" }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!offerToken) return;
    setLoadingQuote(true);
    setQuoteError(null);
    fetch(apiUrl(`/api/bookings/offer/${offerToken}`))
      .then((r) => r.json())
      .then((json) => {
        const d = json.data ?? json;
        if (d?.token) {
          setOfferData(d);
          const ci = new Date(d.checkIn);
          const co = new Date(d.checkOut);
          const nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
          setQuote({
            unit: { id: d.unitId, name: d.unit?.name, maxGuests: d.guests },
            pricing: {
              nights,
              basePrice: nights > 0 ? d.customTotalEur / nights : 0,
              subtotal: d.customTotalEur,
              cleaningFee: 0,
              discountAmount: 0,
              taxes: 0,
              taxRate: 0,
              totalPrice: d.customTotalEur,
              depositAmount: d.customTotalEur,
              balanceAmount: 0,
              isFullPayment: true,
              scheduledChargeDate: null,
            },
          });
        } else {
          setQuoteError(d?.error || "Offer not found or already used");
        }
      })
      .catch(() => setQuoteError("Failed to load offer"))
      .finally(() => setLoadingQuote(false));
  }, [offerToken]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
  });

  const quoteAbortRef = useRef<AbortController | null>(null);

  // Load quote (includes coupon when applied; re-runs when appliedCoupon changes)
  // couponOverride: pass null to fetch without coupon (e.g. when removing coupon)
  const loadQuote = useCallback(async (couponOverride?: string | null) => {
    if (offerToken) return;
    if (!unitId || !checkIn || !checkOut) {
      setQuoteError("Missing booking details. Please start your booking again.");
      setLoadingQuote(false);
      return;
    }
    // Cancel any in-flight quote request to avoid race (e.g. old no-coupon overwriting discounted)
    quoteAbortRef.current?.abort();
    quoteAbortRef.current = new AbortController();
    const signal = quoteAbortRef.current.signal;

    const couponToUse = couponOverride === undefined ? appliedCoupon?.code : (couponOverride || undefined);

    setLoadingQuote(true);
    setQuoteError(null);
    try {
      const response = await fetch(apiUrl("/api/bookings/quote"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: Number(guests) || 1,
          ...(couponToUse && { couponCode: couponToUse }),
        }),
        signal,
      });
      if (!response.ok) {
        const text = await response.text();
        let errMsg = "Dates not available";
        try {
          const errJson = JSON.parse(text);
          errMsg = errJson.error || errMsg;
        } catch {
          if (!text.includes("<!doctype")) errMsg = text || errMsg;
        }
        setQuoteError(errMsg);
        return;
      }
      const json = await response.json();
      const payload = json.data ?? json;
      if (payload?.pricing) {
        setQuote(payload as QuoteResponse);
      } else {
        setQuoteError(payload?.error || "Invalid quote response");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setQuoteError("Unable to load pricing. Please try again.");
    } finally {
      if (!signal.aborted) setLoadingQuote(false);
    }
  }, [offerToken, unitId, checkIn, checkOut, guests, appliedCoupon?.code]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  // Step 1: Create booking + payment intent (or offer payment intent)
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOfferFlow) {
      if (!offerToken || !offerData) {
        setCheckoutError("Offer not loaded.");
        return;
      }
      setIsProcessing(true);
      setCheckoutError(null);
      try {
        const paymentRes = await fetch(apiUrl("/api/payments/create-intent-from-offer"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerToken,
            guestName: `${formData.firstName} ${formData.lastName}`.trim(),
            guestEmail: formData.email,
            guestPhone: formData.phone || undefined,
          }),
        });
        const paymentJson = await paymentRes.json().catch(() => ({}));
        if (!paymentRes.ok || !paymentJson.data?.clientSecret) {
          setCheckoutError(paymentJson.error || "Failed to initialize payment");
          return;
        }
        setClientSecret(paymentJson.data.clientSecret);
        setPaymentType("FULL");
        setStep("payment");
      } catch (err) {
        setCheckoutError((err as Error).message || "Something went wrong");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!unitId || !checkIn || !checkOut) {
      setCheckoutError("Missing booking details.");
      return;
    }

    let accessToken: string | null = null;
    try {
      const raw = localStorage.getItem("auth");
      if (raw) accessToken = JSON.parse(raw).accessToken ?? null;
    } catch {}

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    setIsProcessing(true);
    setCheckoutError(null);

    const TIMEOUT_MS = 25000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // 1. Create booking
      const bookingRes = await fetch(apiUrl("/api/bookings"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          unitId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: Number(guests) || 1,
          guestName: `${formData.firstName} ${formData.lastName}`.trim(),
          guestEmail: formData.email,
          guestPhone: formData.phone,
          couponCode: appliedCoupon?.code,
        }),
        signal: controller.signal,
      });

      const bookingJson = await bookingRes.json().catch(() => ({}));
      if (!bookingRes.ok) {
        setCheckoutError(bookingJson.error || "Failed to create booking");
        return;
      }

      const newBookingId = bookingJson.data?.id;
      if (!newBookingId) {
        setCheckoutError("Booking creation failed — no ID returned");
        return;
      }
      setBookingId(newBookingId);

      // 2. Create payment intent
      const paymentEndpoint = accessToken
        ? "/api/payments/create-intent"
        : "/api/payments/create-guest-intent";

      const paymentRes = await fetch(apiUrl(paymentEndpoint), {
        method: "POST",
        headers,
        body: JSON.stringify({ bookingId: newBookingId }),
        signal: controller.signal,
      });

      const paymentJson = await paymentRes.json().catch(() => ({}));
      if (!paymentRes.ok || !paymentJson.data?.clientSecret) {
        setCheckoutError(paymentJson.error || "Failed to initialize payment");
        return;
      }

      setClientSecret(paymentJson.data.clientSecret);
      setPaymentType(paymentJson.data.paymentType || "DEPOSIT");
      setStep("payment");
    } catch (err) {
      console.error("Checkout error:", err);
      const errMsg = (err as Error).message || "";
      if ((err as Error).name === "AbortError") {
        setCheckoutError("Request timed out. Please check your connection and try again.");
      } else if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("Failed") || errMsg.includes("HTTP")) {
        setCheckoutError("Network error. Please check your connection and try again.");
      } else {
        setCheckoutError(errMsg || "Something went wrong. Please try again.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId?: string) => {
    let completedBookingId: string | null = null;
    if (isOfferFlow && paymentIntentId) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(apiUrl("/api/payments/complete-offer-payment"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId }),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.success) {
            completedBookingId = json.data?.bookingId ?? null;
            break;
          }
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
        } catch {
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    } else if (!isOfferFlow && bookingId) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(apiUrl(`/api/payments/confirm-status/${bookingId}`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && (json.data?.confirmed || json.data?.alreadyConfirmed)) break;
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
        } catch {
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }
    setPaymentComplete(true);
    setIsProcessing(false);
    const target =
      isOfferFlow && completedBookingId
        ? `/booking/${completedBookingId}${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ""}`
        : isLoggedIn
          ? "/dashboard"
          : "/";
    setTimeout(() => navigate(target), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) { setCouponError("Enter a coupon code"); return; }
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/coupons/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          unitId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guests: Number(guests) || 1,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppliedCoupon(data.coupon);
        // Immediate quote fetch so discounted price shows without waiting for useEffect
        const code = data.coupon?.code ?? couponCode.trim().toUpperCase();
        const quoteRes = await fetch(apiUrl("/api/bookings/quote"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            guests: Number(guests) || 1,
            couponCode: code,
          }),
        });
        if (quoteRes.ok) {
          const quoteJson = await quoteRes.json();
          const payload = quoteJson.data ?? quoteJson;
          if (payload?.pricing) {
            setQuote(payload as QuoteResponse);
          }
        }
      } else {
        setCouponError(data.error || "Invalid coupon");
      }
    } catch { setCouponError("Failed to apply coupon"); }
    finally { setApplyingCoupon(false); }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    loadQuote(null);
  };

  // Derived pricing
  const pricing = quote?.pricing;
  const nights = pricing?.nights ?? 0;
  const basePrice = pricing?.basePrice ?? 0;
  const cleaningFee = pricing?.cleaningFee ?? 0;
  const discountAmount = pricing?.discountAmount ?? 0;
  const taxes = pricing?.taxes ?? 0;
  const taxRate = pricing?.taxRate ?? 15;
  const total = pricing?.totalPrice ?? 0;
  const depositAmount = pricing?.depositAmount ?? 0;
  const balanceAmount = pricing?.balanceAmount ?? 0;
  const isFullPayment = pricing?.isFullPayment ?? false;

  const formattedCheckIn = effectiveCheckIn
    ? formatStayDate(effectiveCheckIn, stayLocale(language))
    : "";
  const formattedCheckOut = effectiveCheckOut
    ? formatStayDate(effectiveCheckOut, stayLocale(language))
    : "";

  // Payment success screen
  if (paymentComplete) {
    return (
      <Layout>
        <div className="container-max py-20 text-center">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-lg text-muted-foreground mb-2">
            Your booking has been confirmed. A confirmation email will be sent to {formData.email}.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container-max py-12">
        <div className="mb-12">
          {(propertyId || offerData?.propertyId) && (
            <Link to={`/properties/${propertyId || offerData?.propertyId}`} className="text-primary hover:text-primary/80 mb-4 inline-block">
              &larr; {t("property.backToProperty")}
            </Link>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("checkout.title")}</h1>
              <p className="text-muted-foreground text-lg mt-2">{t("checkout.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <User size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                  <User size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Guest Booking</span>
                </div>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-4 mt-6">
            <div className={`flex items-center gap-2 ${step === "info" ? "text-primary font-bold" : "text-muted-foreground"}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === "info" ? "bg-primary text-white" : "bg-muted"}`}>1</span>
              Details
            </div>
            <div className="h-px flex-1 bg-border" />
            <div className={`flex items-center gap-2 ${step === "payment" ? "text-primary font-bold" : "text-muted-foreground"}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === "payment" ? "bg-primary text-white" : "bg-muted"}`}>2</span>
              Payment
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === "info" ? (
              <form onSubmit={handleCreateBooking} className="space-y-8">
                {/* Guest Info */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">{t("checkout.guestInfo")}</h2>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.firstName")} *</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.lastName")} *</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.email")} *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.phone")} *</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">{t("checkout.billingAddress")}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.address")} *</label>
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange} required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.city")} *</label>
                        <input type="text" name="city" value={formData.city} onChange={handleInputChange} required
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.zipCode")} *</label>
                        <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} required
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">{t("checkout.country")} *</label>
                      <select name="country" value={formData.country} onChange={handleInputChange} required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                        <option value="">{language === "el" ? "Επιλέξτε χώρα" : "Select a country"}</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Coupon (hidden for custom offer) */}
                {!isOfferFlow && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-bold text-foreground mb-6">{t("checkout.couponCode")}</h2>
                  {!appliedCoupon ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder={t("checkout.couponPlaceholder")}
                          className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground" />
                        <button type="button" onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode.trim()}
                          className="btn-secondary px-6 disabled:opacity-50 disabled:cursor-not-allowed">
                          {applyingCoupon ? "Applying..." : t("checkout.applyCoupon")}
                        </button>
                      </div>
                      {couponError && <p className="text-sm text-destructive">{couponError}</p>}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">&#10003;</span>
                        <div>
                          <p className="font-semibold text-green-700">{appliedCoupon.code}</p>
                          <p className="text-sm text-green-600">
                            {appliedCoupon.discountType === "PERCENTAGE" ? `${appliedCoupon.discountValue}% off` : `€${appliedCoupon.discountValue} off`}
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={handleRemoveCoupon} className="text-red-500 hover:text-red-700 text-sm font-medium">
                        {t("checkout.removeCoupon")}
                      </button>
                    </div>
                  )}
                </div>
                )}

                {/* Terms */}
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" required className="mt-1 w-4 h-4" />
                    <span className="text-sm text-foreground">{t("checkout.agreeTerms")}</span>
                  </label>
                </div>

                {checkoutError && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
                    <AlertCircle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">{checkoutError}</p>
                      <button
                        type="button"
                        onClick={() => setCheckoutError(null)}
                        className="mt-2 text-sm font-medium text-primary hover:text-primary/80 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={isProcessing || (isOfferFlow ? !offerData : !(unitId && checkIn && checkOut))}
                  className="btn-primary w-full justify-center text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isProcessing ? (isOfferFlow ? "Preparing payment..." : "Creating booking...") : "Continue to Payment"}
                </button>
              </form>
            ) : (
              /* Step 2: Stripe Payment */
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <CreditCard size={24} />
                  {t("checkout.payment")}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {isFullPayment
                    ? `Full payment: ${formatCurrency(total, language)}`
                    : `Deposit (${total > 0 ? Math.round((depositAmount / total) * 100) : 0}%): ${formatCurrency(depositAmount, language)}`}
                </p>

                <div className="p-4 bg-primary/5 rounded-lg mb-6 flex items-center gap-2">
                  <Lock size={18} className="text-primary" />
                  <p className="text-sm text-foreground">Secure payment powered by Stripe</p>
                </div>

                {clientSecret && stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: { theme: "stripe", variables: { colorPrimary: "#0f172a" } },
                    }}
                  >
                    <StripePaymentForm
                      onSuccess={handlePaymentSuccess}
                      isProcessing={isProcessing}
                      setIsProcessing={setIsProcessing}
                      clientSecret={clientSecret}
                    />
                  </Elements>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading payment form...</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { setStep("info"); setCheckoutError(null); }}
                  className="mt-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  &larr; Back to details
                </button>
              </div>
            )}
          </div>

          {/* Booking Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-foreground mb-6">{t("checkout.bookingSummary")}</h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">{t("checkout.checkInOut")}</p>
                  <p className="font-semibold text-foreground">
                    {formattedCheckIn && formattedCheckOut ? `${formattedCheckIn} - ${formattedCheckOut} (${nights} ${t("common.nights")})` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("checkout.guests")}</p>
                  <p className="font-semibold text-foreground">{guests} {t("common.guests")}</p>
                </div>
              </div>

              <div className="space-y-3 mb-6 pb-6 border-b border-border text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{nights} {t("common.nights")} x {formatCurrency(basePrice, language)}</span>
                  <span className="font-semibold">{formatCurrency(basePrice * nights, language)}</span>
                </div>
                {cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("checkout.cleaningFee")}</span>
                    <span className="font-semibold">{formatCurrency(cleaningFee, language)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-600">{appliedCoupon?.code} discount</span>
                    <span className="font-semibold text-green-600">-{formatCurrency(discountAmount, language)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("checkout.taxes")} ({taxRate}%)</span>
                  <span className="font-semibold">{formatCurrency(taxes, language)}</span>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-semibold">{t("checkout.total")}</span>
                  <span className="text-3xl font-bold text-primary">{formatCurrency(total, language)}</span>
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-6 mb-6">
                <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">&euro;</span>
                  </div>
                  {t("checkout.paymentSchedule")}
                </h4>
                <div className="space-y-4">
                  {isFullPayment ? (
                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-primary/10">
                      <div>
                        <p className="font-semibold text-foreground">Full Payment</p>
                        <p className="text-xs text-muted-foreground">Due now (check-in within 21 days)</p>
                      </div>
                      <p className="font-bold text-lg text-primary">{formatCurrency(total, language)}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-primary/10">
                        <div>
                          <p className="font-semibold text-foreground">{t("checkout.deposit")}</p>
                          <p className="text-xs text-muted-foreground">{t("checkout.dueNow")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">{formatCurrency(depositAmount, language)}</p>
                          <p className="text-xs text-muted-foreground">{total > 0 ? Math.round((depositAmount / total) * 100) : 0}%</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-primary/10">
                        <div>
                          <p className="font-semibold text-foreground">{t("checkout.balancePayment")}</p>
                          <p className="text-xs text-muted-foreground">21 days before check-in</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-primary">{formatCurrency(balanceAmount, language)}</p>
                          <p className="text-xs text-muted-foreground">{total > 0 ? Math.round((balanceAmount / total) * 100) : 0}%</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {quoteError && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm font-medium text-destructive">{quoteError}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ελέγξτε τις ημερομηνίες και τον αριθμό επισκεπτών. Η άφιξη πρέπει να είναι τουλάχιστον 3 ημέρες από σήμερα και η ελάχιστη διαμονή 7 νύχτες.
                  </p>
                  <button
                    type="button"
                    onClick={() => loadQuote()}
                    className="mt-3 text-sm font-medium text-primary hover:text-primary/80 underline"
                  >
                    Δοκιμάστε ξανά
                  </button>
                </div>
              )}
              <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
                <p>&#10003; Secure payment via Stripe</p>
                <p>&#10003; {isFullPayment ? "Full amount charged now" : "Only deposit charged now"}</p>
                <p>&#10003; Instant confirmation</p>
              </div>
            </div>
            {loadingQuote && <p className="text-xs text-muted-foreground mt-4">Loading pricing...</p>}
            {quoteError && <p className="text-xs text-destructive mt-4">{quoteError}</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}

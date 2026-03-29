import Layout from "@/components/Layout";
import { apiUrl } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { formatStayDate, stayLocale } from "@/lib/stay-dates";

type DashboardBooking = {
  id: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus?: string;
  total: number;
};

type AuthState = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<DashboardBooking | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const userName =
    auth ? `${auth.user.firstName} ${auth.user.lastName}` : t("dashboard.guest");

  useEffect(() => {
    const raw = localStorage.getItem("auth");
    if (!raw) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AuthState;
      if (!parsed.accessToken || !parsed.user) {
        navigate("/login");
        return;
      }
      setAuth(parsed);

      const loadBookings = async () => {
        try {
          console.log("🔍 [DASHBOARD] Fetching user bookings...");
          const response = await fetch(apiUrl("/api/bookings/user"), {
            headers: {
              Authorization: `Bearer ${parsed.accessToken}`,
            },
          });

          const json = await response.json().catch(() => ({}));

          if (!response.ok) {
            console.error("❌ [DASHBOARD] Failed to load bookings:", json);
            setBookingsError(json.error || "Unable to load bookings.");
            return;
          }

          const data = json.data;
          const mapped: DashboardBooking[] = (data.bookings ?? []).map(
            (b: any) => ({
              id: b.id,
              propertyName: b.unit?.property?.name ?? "Property",
              checkIn: (b.check_in_date || b.checkInDate)
                ? new Date(b.check_in_date || b.checkInDate).toISOString().split("T")[0]
                : "",
              checkOut: (b.check_out_date || b.checkOutDate)
                ? new Date(b.check_out_date || b.checkOutDate).toISOString().split("T")[0]
                : "",
              status: (b.status || "PENDING").toLowerCase(),
              paymentStatus: (b.payment_status || b.paymentStatus || "PENDING").toLowerCase(),
              total: Number(b.total_price ?? b.totalPrice ?? 0),
            }),
          );

          setBookings(mapped);
        } catch (error) {
          console.error("❌ [DASHBOARD] Network error while loading bookings", error);
          setBookingsError("Network error. Please try again.");
        } finally {
          setLoadingBookings(false);
        }
      };

      loadBookings();
    } catch (error) {
      console.error("❌ [DASHBOARD] Invalid auth data", error);
      localStorage.removeItem("auth");
      navigate("/login");
    }
  }, [navigate]);

  // Load profile when switching to profile tab
  useEffect(() => {
    if (activeTab !== "profile" || !auth?.accessToken) return;
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const res = await fetch(apiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.data) {
          const d = json.data;
          setProfileForm({
            firstName: d.firstName ?? auth.user.firstName ?? "",
            lastName: d.lastName ?? auth.user.lastName ?? "",
            phone: d.phone ?? "",
          });
        } else {
          setProfileForm({
            firstName: auth.user.firstName ?? "",
            lastName: auth.user.lastName ?? "",
            phone: "",
          });
        }
      } catch {
        setProfileForm({
          firstName: auth.user.firstName ?? "",
          lastName: auth.user.lastName ?? "",
          phone: "",
        });
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [activeTab, auth?.accessToken, auth?.user?.firstName, auth?.user?.lastName]);

  const handleProfileSave = async () => {
    if (!auth?.accessToken) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await fetch(apiUrl("/api/auth/profile"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          phone: profileForm.phone.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setProfileSuccess(true);
        setAuth((prev) =>
          prev
            ? {
                ...prev,
                user: {
                  ...prev.user,
                  firstName: profileForm.firstName.trim(),
                  lastName: profileForm.lastName.trim(),
                },
              }
            : null
        );
        setTimeout(() => setProfileSuccess(false), 3000);
      } else {
        setProfileError(json.error || t("dashboard.profileSaveError"));
      }
    } catch {
      setProfileError(t("dashboard.profileSaveError"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  const handleCancelClick = (booking: DashboardBooking) => {
    setCancellingBooking(booking);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingBooking || !auth?.accessToken) return;
    setCancelLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/bookings/${cancellingBooking.id}/cancel`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setCancellingBooking(null);
        setBookings((prev) => prev.filter((b) => b.id !== cancellingBooking.id));
      } else {
        alert(json.error || t("dashboard.cancelError"));
      }
    } catch {
      alert(t("dashboard.cancelError"));
    } finally {
      setCancelLoading(false);
    }
  };

  const canCancelBooking = (status: string) =>
    ["pending", "confirmed"].includes(status);

  return (
    <Layout>
      <div className="container-max py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t("dashboard.welcome")},{" "}
          <span className="font-semibold text-foreground">{userName}</span>
        </p>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              {/* Profile Card */}
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{userName}</p>
                    <p className="text-sm text-muted-foreground">
                      {auth?.user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu */}
              <nav className="space-y-2">
                {[
                  { id: "bookings", label: t("dashboard.myBookings"), icon: Calendar },
                  { id: "profile", label: t("dashboard.profileSettings"), icon: User },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === item.id
                          ? "bg-primary text-white"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors font-semibold"
              >
                <LogOut size={18} />
                {t("dashboard.logout")}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Bookings Tab */}
            {activeTab === "bookings" && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {t("dashboard.myBookings")}
                </h2>
                <div className="space-y-4">
                  {loadingBookings && (
                    <p className="text-muted-foreground">
                      {t("dashboard.loadingBookings")}
                    </p>
                  )}

                  {bookingsError && (
                    <p className="text-destructive text-sm">
                      {bookingsError}
                    </p>
                  )}

                  {!loadingBookings &&
                    !bookingsError &&
                    bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-card border border-border rounded-lg p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              {booking.propertyName}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                              {t("dashboard.bookingId")} : #{booking.id}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                booking.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : booking.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {t(`dashboard.${booking.status}`) || booking.status}
                            </span>
                            {booking.paymentStatus && booking.paymentStatus !== "pending" && (
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                  booking.paymentStatus === "paid_full"
                                    ? "bg-green-100 text-green-700"
                                    : booking.paymentStatus === "deposit_paid"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {t(`dashboard.${booking.paymentStatus}`) || booking.paymentStatus}
                              </span>
                            )}
                            <p className="text-2xl font-bold text-primary mt-2">
                              {formatCurrency(booking.total, language)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                          <span>
                            {t("dashboard.checkIn")}:{" "}
                            {formatStayDate(booking.checkIn, stayLocale(language))}
                          </span>
                          <span>
                            {t("dashboard.checkOut")}:{" "}
                            {formatStayDate(booking.checkOut, stayLocale(language))}
                          </span>
                        </div>

                        <div className="flex gap-3">
                          <Link
                            to={`/booking/${booking.id}`}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold"
                          >
                            {t("common.viewDetails")}
                          </Link>
                          {canCancelBooking(booking.status) && (
                            <button
                              onClick={() => handleCancelClick(booking)}
                              className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-sm font-semibold"
                            >
                              {t("dashboard.cancelBooking")}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {!loadingBookings && !bookingsError && bookings.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      {t("dashboard.noBookings")}
                    </p>
                    <Link to="/properties" className="btn-primary">
                      {t("dashboard.browseProperties")}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Cancel booking confirmation modal */}
            {cancellingBooking && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-xl">
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    {t("dashboard.cancelConfirmTitle")}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    {t("dashboard.cancelConfirmMessage")}
                  </p>
                  <div className="text-muted-foreground text-sm mb-4">
                    <p className="font-medium text-foreground mb-2">{t("dashboard.cancelConfirm21DaysTitle")}</p>
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      <li>{t("dashboard.cancelConfirmBullet1")}</li>
                      <li>{t("dashboard.cancelConfirmBullet2")}</li>
                    </ul>
                  </div>
                  <p className="text-sm text-foreground mb-4">
                    {cancellingBooking.propertyName} · {cancellingBooking.checkIn} → {cancellingBooking.checkOut}
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setCancellingBooking(null)}
                      disabled={cancelLoading}
                      className="btn-secondary"
                    >
                      {t("common.back")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelConfirm}
                      disabled={cancelLoading}
                      className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50 font-semibold"
                    >
                      {cancelLoading ? t("dashboard.cancelling") : t("dashboard.confirmCancel")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {t("dashboard.profileSettings")}
                </h2>
                <div className="bg-card border border-border rounded-lg p-6 space-y-6 max-w-md">
                  {profileLoading ? (
                    <p className="text-muted-foreground">{t("dashboard.loadingBookings")}</p>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          {t("dashboard.fullName")}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={profileForm.firstName}
                            onChange={(e) =>
                              setProfileForm((p) => ({ ...p, firstName: e.target.value }))
                            }
                            placeholder={t("dashboard.firstName")}
                            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                          />
                          <input
                            type="text"
                            value={profileForm.lastName}
                            onChange={(e) =>
                              setProfileForm((p) => ({ ...p, lastName: e.target.value }))
                            }
                            placeholder={t("dashboard.lastName")}
                            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          {t("dashboard.emailAddress")}
                        </label>
                        <input
                          type="email"
                          value={auth?.user.email ?? ""}
                          disabled
                          className="w-full px-4 py-2 border border-border rounded-lg bg-muted text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          {t("dashboard.phoneNumber")}
                        </label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm((p) => ({ ...p, phone: e.target.value }))
                          }
                          placeholder="+30 6974637217"
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-background"
                        />
                      </div>

                      {profileError && (
                        <p className="text-destructive text-sm">{profileError}</p>
                      )}
                      {profileSuccess && (
                        <p className="text-green-600 text-sm font-medium">
                          {t("dashboard.profileSaved")}
                        </p>
                      )}

                      <button
                        onClick={handleProfileSave}
                        disabled={profileSaving}
                        className="btn-primary w-full justify-center disabled:opacity-50"
                      >
                        {profileSaving ? t("dashboard.saving") : t("dashboard.saveChanges")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}

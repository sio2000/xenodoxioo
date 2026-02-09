import Layout from "@/components/Layout";
import { Link } from "react-router-dom";
import { Calendar, User, Settings, LogOut, Edit } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("bookings");

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    joinDate: "2024-01-15",
  };

  // Mock bookings
  const bookings = [
    {
      id: 1,
      property: "The Lykoskufi Villas - Villa A",
      checkIn: "2024-12-15",
      checkOut: "2024-12-18",
      status: "confirmed",
      total: 850,
    },
    {
      id: 2,
      property: "The Ogra House",
      checkIn: "2024-01-20",
      checkOut: "2024-01-27",
      status: "pending",
      total: 1540,
    },
  ];
  const { t, language } = useLanguage();

  const handleLogout = () => {
    alert("Logged out! Redirect to home.");
    window.location.href = "/";
  };

  return (
    <Layout>
      <div className="container-max py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">{t("dashboard.title")}</h1>

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
                    <p className="font-bold text-foreground">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu */}
              <nav className="space-y-2">
                {[
                  { id: "bookings", label: t("dashboard.myBookings"), icon: Calendar },
                  { id: "profile", label: t("dashboard.profileSettings"), icon: User },
                  { id: "preferences", label: t("dashboard.preferences"), icon: Settings },
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
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-card border border-border rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-foreground">
                            {booking.property}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {t("dashboard.bookingId")} : #{booking.id}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {t(`dashboard.${booking.status}`)}
                          </span>
                          <p className="text-2xl font-bold text-primary mt-2">
                            {formatCurrency(booking.total, language)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                        <span>{t("dashboard.checkIn")}: {booking.checkIn}</span>
                        <span>{t("dashboard.checkOut")}: {booking.checkOut}</span>
                      </div>

                      <div className="flex gap-3">
                        <Link
                          to={`/booking/${booking.id}`}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold"
                        >
                          {t("common.viewDetails")}
                        </Link>
                        {booking.status === "confirmed" && (
                            <button className="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-sm font-semibold">
                              {t("dashboard.cancelBooking")}
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>

                {bookings.length === 0 && (
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

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  {t("dashboard.profileSettings")}
                </h2>
                <div className="bg-card border border-border rounded-lg p-6 space-y-6 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("dashboard.fullName")}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={user.name}
                        className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <button className="p-2 hover:bg-muted rounded transition-colors">
                        <Edit size={18} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      {t("dashboard.emailAddress")}
                    </label>
                    <input
                      type="email"
                      defaultValue={user.email}
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
                      defaultValue={user.phone}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>

                  <button className="btn-primary w-full justify-center">
                    {t("dashboard.saveChanges")}
                  </button>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Preferences
                </h2>
                <div className="bg-card border border-border rounded-lg p-6 space-y-6 max-w-md">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <div>
                      <p className="font-semibold text-foreground">
                        Email Notifications
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Booking confirmations and reminders
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4" />
                    <div>
                      <p className="font-semibold text-foreground">
                        Marketing Emails
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.specialOffers")}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <div>
                      <p className="font-semibold text-foreground">
                        SMS Notifications
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Important booking updates via SMS
                      </p>
                    </div>
                  </label>

                  <button className="btn-primary w-full justify-center">
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

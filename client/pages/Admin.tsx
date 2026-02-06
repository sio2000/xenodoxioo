import Layout from "@/components/Layout";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Users,
  Settings,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const stats = [
    {
      label: "Total Bookings",
      value: "48",
      icon: BookOpen,
      color: "bg-blue-100 text-blue-700",
    },
    {
      label: "Revenue (This Month)",
      value: "$12,450",
      icon: DollarSign,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "Total Users",
      value: "156",
      icon: Users,
      color: "bg-purple-100 text-purple-700",
    },
    {
      label: "Occupancy Rate",
      value: "87%",
      icon: Calendar,
      color: "bg-orange-100 text-orange-700",
    },
  ];

  const adminMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "bookings", label: "Bookings", icon: BookOpen },
    { id: "pricing", label: "Pricing & Discounts", icon: DollarSign },
    { id: "properties", label: "Properties", icon: Calendar },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Admin Header */}
        <div className="bg-primary text-white py-8 mb-8">
          <div className="container-max">
            <h1 className="text-4xl font-bold">Admin Panel</h1>
            <p className="text-white/80 mt-2">
              Manage your villa rental business
            </p>
          </div>
        </div>

        <div className="container-max pb-12">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === item.id
                      ? "bg-primary text-white"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Dashboard Overview
              </h2>

              {/* Stats Grid */}
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-card border border-border rounded-lg p-6"
                    >
                      <div
                        className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center mb-4`}
                      >
                        <Icon size={24} />
                      </div>
                      <p className="text-muted-foreground text-sm mb-1">
                        {stat.label}
                      </p>
                      <p className="text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    Recent Bookings
                  </h3>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="pb-4 border-b border-border last:border-0"
                      >
                        <p className="font-semibold text-foreground">
                          Villa A - Booking #{1000 + i}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          2024-12-{15 + i} to 2024-12-{18 + i}
                        </p>
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          Confirmed
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    Occupancy by Property
                  </h3>
                  <div className="space-y-4">
                    {[
                      "The Lykoskufi Villas",
                      "The Ogra House",
                      "The Bungalows",
                    ].map((property, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-foreground">
                            {property}
                          </span>
                          <span className="text-muted-foreground">
                            {85 + i}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${85 + i}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bookings Tab */}
          {activeTab === "bookings" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Booking Management
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground text-center py-12">
                  Booking management interface - View, modify, and cancel
                  bookings. Manage cancellation policies and refunds.
                </p>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Pricing & Discounts
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground text-center py-12">
                  Manage seasonal pricing, minimum stay rules, coupons,
                  long-stay discounts, and extras pricing.
                </p>
              </div>
            </div>
          )}

          {/* Properties Tab */}
          {activeTab === "properties" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Property Management
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground text-center py-12">
                  Manage properties, units, amenities, gallery images, and
                  availability calendars. Block dates manually.
                </p>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                User Management
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-muted-foreground text-center py-12">
                  View all users, apply custom discounts, manage user roles and
                  permissions, handle refunds.
                </p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Settings
              </h2>
              <div className="grid gap-6 max-w-2xl">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold text-foreground mb-4">
                    Email Templates
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Customize booking confirmation, payment reminders, arrival
                    reminders, and cancellation emails.
                  </p>
                  <button className="btn-primary">Edit Email Templates</button>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold text-foreground mb-4">
                    Cancellation Policy
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Configure default cancellation rules and manage automatic
                    refunds.
                  </p>
                  <button className="btn-primary">
                    Edit Cancellation Policy
                  </button>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold text-foreground mb-4">
                    Tax Settings
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Configure VAT and tax percentages for pricing calculations.
                  </p>
                  <button className="btn-primary">Edit Tax Settings</button>
                </div>

                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-bold text-foreground mb-4">
                    Stripe Integration
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Connect your Stripe account for payment processing.
                  </p>
                  <button className="btn-secondary">Configure Stripe</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

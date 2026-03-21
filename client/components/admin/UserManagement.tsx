import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import formatCurrency from "@/lib/currency";
import { Search, Filter, Eye, Edit, Mail, Calendar, BookOpen, Phone, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  _count: {
    bookings: number;
  };
}

export default function UserManagement() {
  const { language, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, statusFilter, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: "10",
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(apiUrl(`/api/admin/users?${params}`));
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || data.users || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "text-green-600 bg-green-100";
      case "INACTIVE": return "text-red-600 bg-red-100";
      case "SUSPENDED": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(apiUrl(`/api/admin/users/${userId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchUsers();
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded mb-6"></div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {t("admin.userManagement")}
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                type="text"
                placeholder={t("admin.searchUsers")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="ALL">{t("admin.allStatus")}</option>
              <option value="ACTIVE">{t("admin.statusActive")}</option>
              <option value="INACTIVE">{t("admin.statusInactive")}</option>
              <option value="SUSPENDED">{t("admin.statusSuspended")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">{t("admin.tableUser")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">{t("admin.tableEmail")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">{t("admin.tablePhone")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">{t("admin.tableStatus")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">{t("admin.tableBookings")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">{t("admin.tableJoined")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">{t("admin.tableActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      <Mail size={14} className="text-muted-foreground" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      {user.phone ? (
                        <>
                          <Phone size={14} className="text-muted-foreground" />
                          {user.phone}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen size={14} className="text-muted-foreground" />
                      {t("admin.userBookingsCount").replace("{count}", String(user._count?.bookings || 0))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-muted-foreground" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="btn-secondary-sm"
                        title={t("admin.viewDetails")}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn-secondary-sm"
                        title={t("admin.editUser")}
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("admin.noUsersFound")}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="btn-secondary-sm"
          >
            {t("admin.previous")}
          </button>
          <span className="text-sm text-muted-foreground">
            {t("admin.pageOf").replace("{current}", String(currentPage)).replace("{total}", String(totalPages))}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary-sm"
          >
            {t("admin.next")}
          </button>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

type UserBooking = {
  id: string;
  bookingNumber: string;
  unit: { id: string; name: string; property: { id: string; name: string } };
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
};

// User Details Modal Component
function UserDetailsModal({ user, onClose, onStatusUpdate }: any) {
  const { t, language } = useLanguage();
  const [newStatus, setNewStatus] = useState(user.status);
  const [showBookingHistory, setShowBookingHistory] = useState(false);
  const [userBookings, setUserBookings] = useState<UserBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const handleStatusChange = () => {
    if (newStatus !== user.status) {
      onStatusUpdate(user.id, newStatus);
    }
  };

  const handleViewBookingHistory = async () => {
    if (showBookingHistory) {
      setShowBookingHistory(false);
      return;
    }
    setShowBookingHistory(true);
    if (userBookings.length > 0) return; // already loaded
    setLoadingBookings(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/bookings?userId=${user.id}&pageSize=50`));
      const data = await res.json();
      if (res.ok && data.bookings) {
        setUserBookings(data.bookings);
      } else {
        setUserBookings([]);
      }
    } catch {
      setUserBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-foreground">
            {t("admin.userDetails")}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>

        <div className="grid gap-6">
          {/* User Information */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">{t("admin.userInformation")}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("admin.nameField")}</span>
                <p className="text-foreground">
                  {user.firstName} {user.lastName}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("admin.emailField")}</span>
                <p className="text-foreground">{user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("admin.phoneField")}</span>
                <p className="text-foreground">{user.phone || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("admin.memberSince")}</span>
                <p className="text-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("admin.totalBookingsField")}</span>
                <p className="text-foreground">{user._count?.bookings || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("admin.currentStatusField")}</span>
                <p className="text-foreground">{user.status}</p>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">{t("admin.statusManagement")}</h4>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t("admin.userStatus")}
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="ACTIVE">{t("admin.statusActive")}</option>
                  <option value="INACTIVE">{t("admin.statusInactive")}</option>
                  <option value="SUSPENDED">{t("admin.statusSuspended")}</option>
                </select>
              </div>
              <button
                onClick={handleStatusChange}
                disabled={newStatus === user.status}
                className="btn-primary"
              >
                {t("admin.updateStatus")}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">{t("admin.quickActions")}</h4>
            <button
              onClick={handleViewBookingHistory}
              disabled={loadingBookings}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {loadingBookings ? (
                <span className="animate-pulse">{t("admin.loading")}</span>
              ) : (
                <>
                  <Calendar size={18} />
                  {t("admin.viewBookingHistory")}
                  {showBookingHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </>
              )}
            </button>

            {/* Booking history list */}
            {showBookingHistory && !loadingBookings && (
              <div className="mt-4 border border-border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium text-sm text-foreground">
                  {t("admin.bookingHistoryFor").replace("{name}", `${user.firstName} ${user.lastName}`)}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {userBookings.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      {t("admin.noBookingsForUser")}
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {userBookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {b.unit?.property?.name ?? "—"} · {b.unit?.name ?? "—"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {b.checkInDate ? new Date(b.checkInDate).toLocaleDateString() : "—"} → {b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString() : "—"}
                              {b.nights ? ` · ${b.nights} ${t("admin.nights")}` : ""}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                b.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                                b.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                                "bg-amber-100 text-amber-700"
                              }`}>
                                {b.status}
                              </span>
                              {b.paymentStatus && (
                                <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                                  {b.paymentStatus}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-primary">
                              {formatCurrency(b.totalPrice ?? 0, language)}
                            </p>
                            <a
                              href={`/booking/${b.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 justify-end mt-1"
                            >
                              <ExternalLink size={12} />
                              {t("admin.viewDetails")}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-6">
          <button onClick={onClose} className="btn-secondary">
            {t("admin.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

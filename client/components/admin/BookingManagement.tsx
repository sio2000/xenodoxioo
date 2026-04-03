import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import { Search, Filter, Eye, Calendar, Users, DollarSign, Clock, ArrowRight, CreditCard } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";
import { formatStayDate, stayLocale } from "@/lib/stay-dates";
import { AdminPaginationBar } from "@/components/admin/AdminPaginationBar";

function formatTimestampLocal(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface Booking {
  id: string;
  bookingNumber: string;
  unit: {
    id: string;
    name: string;
    property: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
  totalPrice: number;
  totalPaid: number;
  remainingAmount: number;
  depositAmount: number;
  paymentType: string;
  scheduledChargeDate?: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export default function BookingManagement() {
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const BOOKINGS_PAGE_SIZE = 5;

  useEffect(() => {
    fetchBookings();
  }, [currentPage, statusFilter, searchTerm]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: String(BOOKINGS_PAGE_SIZE),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(apiUrl(`/api/admin/bookings?${params}`));
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(apiUrl(`/api/admin/bookings/${bookingId}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchBookings();
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error("Failed to update booking status:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "text-green-700 bg-green-50 border-green-200";
      case "PENDING": return "text-amber-700 bg-amber-50 border-amber-200";
      case "CANCELLED": return "text-red-700 bg-red-50 border-red-200";
      case "CHECKED_IN": return "text-blue-700 bg-blue-50 border-blue-200";
      case "CHECKED_OUT": return "text-gray-700 bg-gray-50 border-gray-200";
      case "COMPLETED": return "text-emerald-800 bg-emerald-50 border-emerald-200";
      case "NO_SHOW": return "text-red-700 bg-red-50 border-red-200";
      default: return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
      case "PAID_FULL": return "text-green-700 bg-green-50 border-green-200";
      case "DEPOSIT_PAID": return "text-blue-700 bg-blue-50 border-blue-200";
      case "PENDING": return "text-amber-700 bg-amber-50 border-amber-200";
      case "FAILED": return "text-red-700 bg-red-50 border-red-200";
      case "REFUNDED": return "text-purple-700 bg-purple-50 border-purple-200";
      default: return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded mb-6"></div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {t("admin.bookingManagement")}
        </h2>
        <span className="text-sm text-muted-foreground">
          {bookings.length === 1 ? t("admin.bookingCountSingular") : t("admin.bookingsCount").replace("{count}", String(bookings.length))}
        </span>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder={t("admin.searchBookings")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="ALL">{t("admin.allStatus")}</option>
              <option value="PENDING">{t("admin.statusPending")}</option>
              <option value="CONFIRMED">{t("admin.statusConfirmed")}</option>
              <option value="CHECKED_IN">{t("admin.statusCheckedIn")}</option>
              <option value="CHECKED_OUT">{t("admin.statusCheckedOut")}</option>
              <option value="CANCELLED">{t("admin.statusCancelled")}</option>
              <option value="NO_SHOW">{t("admin.statusNoShow")}</option>
              <option value="COMPLETED">{t("admin.statusCompleted")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Cards */}
      <div className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedBooking(booking)}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Left: Booking # + Guest */}
              <div className="flex-shrink-0 lg:w-[200px]">
                <div className="text-xs text-muted-foreground font-mono">{booking.bookingNumber}</div>
                <div className="font-semibold text-foreground mt-0.5">
                  {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : booking.guestName || "Guest"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {booking.user ? booking.user.email : booking.guestEmail || ""}
                </div>
              </div>

              {/* Room/Unit */}
              <div className="flex-shrink-0 lg:w-[140px]">
                <div className="text-xs text-muted-foreground mb-0.5">{t("admin.room")}</div>
                <div className="font-medium text-foreground text-sm">{booking.unit.name}</div>
              </div>

              {/* Dates: Check-in → Check-out */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} className="text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground">{formatStayDate(booking.checkInDate, stayLocale(language))}</span>
                  <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-foreground">{formatStayDate(booking.checkOutDate, stayLocale(language))}</span>
                  <span className="text-muted-foreground text-xs">({booking.nights}n)</span>
                </div>
                {/* Deposit: scheduled balance charge date */}
                {booking.paymentType === "DEPOSIT" && booking.remainingAmount > 0 && booking.scheduledChargeDate && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 mt-1">
                    <Clock size={12} className="flex-shrink-0" />
                    <span>{t("admin.balanceDue").replace("{amount}", formatCurrency(booking.remainingAmount, language)).replace("{date}", formatStayDate(booking.scheduledChargeDate ?? "", stayLocale(language)))}</span>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="flex-shrink-0 lg:w-[130px] lg:text-right">
                <div className="flex items-center lg:justify-end gap-1">
                  <CreditCard size={14} className="text-muted-foreground" />
                  <span className="font-bold text-foreground">
                    {formatCurrency(booking.totalPaid || 0, language)}
                  </span>
                </div>
                {booking.paymentType === "DEPOSIT" && booking.remainingAmount > 0 ? (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("admin.ofTotal").replace("{amount}", formatCurrency(booking.totalPrice, language))}
                  </div>
                ) : booking.totalPaid > 0 ? (
                  <div className="text-xs text-green-600 mt-0.5">{t("admin.fullyPaid")}</div>
                ) : null}
              </div>

              {/* Status Badges */}
              <div className="flex-shrink-0 flex flex-col gap-1.5 lg:w-[120px] items-start lg:items-end">
                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                  {(booking.status || "").replace("_", " ")}
                </span>
                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border ${getPaymentStatusColor(booking.paymentStatus)}`}>
                  {(booking.paymentStatus || "").replace("_", " ")}
                </span>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title={t("admin.viewDetails")}
                >
                  <Eye size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookings.length === 0 && !loading && (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">{t("admin.noBookings")}</p>
        </div>
      )}

      <AdminPaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPrev={() => setCurrentPage(Math.max(1, currentPage - 1))}
        onNext={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        className="mt-6"
      />

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

function BookingDetailsModal({ booking, onClose, onStatusUpdate }: { booking: Booking; onClose: () => void; onStatusUpdate: (id: string, s: string) => void }) {
  const { language, t } = useLanguage();
  const [newStatus, setNewStatus] = useState(booking.status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {booking.bookingNumber}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.created")} {formatTimestampLocal(booking.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="grid gap-5">
          {/* Guest + Property side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("admin.guestLabel")}</h4>
              <p className="font-semibold text-foreground">
                {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : booking.guestName || t("admin.guestDefault")}
              </p>
              <p className="text-sm text-muted-foreground">{booking.user ? booking.user.email : booking.guestEmail || "—"}</p>
              <p className="text-sm text-muted-foreground">{booking.guestPhone || "—"}</p>
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <Users size={14} />
                <span>{booking.guests === 1 ? t("admin.guestCountSingular") : t("admin.guestCount").replace("{count}", String(booking.guests))}</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("admin.propertySection")}</h4>
              <p className="font-semibold text-foreground">{booking.unit.name}</p>
              <p className="text-sm text-muted-foreground">{booking.unit.property.name}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("admin.stayDates")}</h4>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-primary/10 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground">{t("admin.checkIn")}</div>
                <div className="font-bold text-foreground">{formatStayDate(booking.checkInDate, stayLocale(language))}</div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground" />
              <div className="bg-primary/10 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground">{t("admin.checkOut")}</div>
                <div className="font-bold text-foreground">{formatStayDate(booking.checkOutDate, stayLocale(language))}</div>
              </div>
              <div className="ml-2 text-sm text-muted-foreground">{booking.nights === 1 ? t("admin.nightCountSingular") : t("admin.nightCount").replace("{count}", String(booking.nights))}</div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("admin.paymentSection")}</h4>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("admin.paymentType")}</span>
                <span className="font-semibold text-foreground">
                  {booking.paymentType === "DEPOSIT" ? t("admin.depositPayment") : t("admin.fullPaymentType")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("admin.totalPrice")}</span>
                <span className="text-foreground">{formatCurrency(booking.totalPrice, language)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("admin.amountPaid")}</span>
                <span className="font-bold text-green-600">{formatCurrency(booking.totalPaid || 0, language)}</span>
              </div>
              {booking.remainingAmount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("admin.remainingBalance")}</span>
                    <span className="font-bold text-amber-600">{formatCurrency(booking.remainingAmount, language)}</span>
                  </div>
                  {booking.scheduledChargeDate && (
                    <div className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 -mx-1">
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <Clock size={14} />
                        {t("admin.autoChargeDate")}
                      </span>
                      <span className="font-bold text-amber-700">{formatStayDate(booking.scheduledChargeDate ?? "", stayLocale(language))}</span>
                    </div>
                  )}
                </>
              )}
              <div className="border-t border-border pt-2.5 flex justify-between items-center">
                <span className="text-muted-foreground">{t("admin.paymentStatus")}</span>
                <span className="font-semibold text-foreground">
                  {(booking.paymentStatus || "").replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("admin.statusManagement")}</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground text-sm"
                >
                  <option value="PENDING">{t("admin.statusPending")}</option>
                  <option value="CONFIRMED">{t("admin.statusConfirmed")}</option>
                  <option value="CHECKED_IN">{t("admin.statusCheckedIn")}</option>
                  <option value="CHECKED_OUT">{t("admin.statusCheckedOut")}</option>
                  <option value="CANCELLED">{t("admin.statusCancelled")}</option>
                  <option value="NO_SHOW">{t("admin.statusNoShow")}</option>
                  <option value="COMPLETED">{t("admin.statusCompleted")}</option>
                </select>
              </div>
              <button
                onClick={() => { if (newStatus !== booking.status) onStatusUpdate(booking.id, newStatus); }}
                disabled={newStatus === booking.status}
                className="btn-primary whitespace-nowrap"
              >
                {t("admin.update")}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-5">
          <button onClick={onClose} className="btn-secondary">
            {t("admin.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

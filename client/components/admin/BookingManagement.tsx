import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";
import { Search, Filter, Eye, Edit, Trash2, Calendar, Users, DollarSign } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import formatCurrency from "@/lib/currency";

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

  useEffect(() => {
    fetchBookings();
  }, [currentPage, statusFilter, searchTerm]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: "20",
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
      case "CONFIRMED": return "text-green-600 bg-green-100";
      case "PENDING": return "text-yellow-600 bg-yellow-100";
      case "CANCELLED": return "text-red-600 bg-red-100";
      case "CHECKED_IN": return "text-blue-600 bg-blue-100";
      case "CHECKED_OUT": return "text-gray-600 bg-gray-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "PAID": return "text-green-600 bg-green-100";
      case "DEPOSIT_PAID": return "text-blue-600 bg-blue-100";
      case "PENDING": return "text-yellow-600 bg-yellow-100";
      case "FAILED": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
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
          Booking Management
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
                placeholder="Search bookings..."
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
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Booking #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Guest</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Property</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Dates</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Total</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-foreground">
                    {booking.bookingNumber}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div>
                      <div className="font-medium">
                        {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : booking.guestName || 'Guest User'}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {booking.user ? booking.user.email : booking.guestEmail || 'No email'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div>
                      <div className="font-medium">{booking.unit.property.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {booking.unit.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-muted-foreground" />
                      <div>
                        <div>{new Date(booking.checkInDate).toLocaleDateString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {booking.nights} nights
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign size={14} className="text-muted-foreground" />
                      {formatCurrency(booking.totalPrice, language)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {(booking.status || '').replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus)}`}>
                      {(booking.paymentStatus || '').replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="btn-secondary-sm"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn-secondary-sm"
                        title="Edit Booking"
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

        {bookings.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No bookings found</p>
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
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="btn-secondary-sm"
          >
            Next
          </button>
        </div>
      )}

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

// Booking Details Modal Component
function BookingDetailsModal({ booking, onClose, onStatusUpdate }: any) {
  const [newStatus, setNewStatus] = useState(booking.status);

  const handleStatusChange = () => {
    if (newStatus !== booking.status) {
      onStatusUpdate(booking.id, newStatus);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-foreground">
            Booking Details - {booking.bookingNumber}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>

        <div className="grid gap-6">
          {/* Guest Information */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">Guest Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="text-foreground">
                  {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : booking.guestName || 'Guest'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="text-foreground">{booking.user ? booking.user.email : booking.guestEmail || 'No email'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="text-foreground">{booking.guestPhone || 'Not provided'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Guests:</span>
                <p className="text-foreground">{booking.guests} guests</p>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">Property Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Property:</span>
                <p className="text-foreground">{booking.unit.property.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Unit:</span>
                <p className="text-foreground">{booking.unit.name}</p>
              </div>
            </div>
          </div>

          {/* Booking Information */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">Booking Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Check-in:</span>
                <p className="text-foreground">
                  {new Date(booking.checkInDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Check-out:</span>
                <p className="text-foreground">
                  {new Date(booking.checkOutDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Nights:</span>
                <p className="text-foreground">{booking.nights} nights</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Price:</span>
                <p className="text-foreground font-semibold">
                  {formatCurrency(booking.totalPrice, 'en')}
                </p>
              </div>
            </div>
          </div>

          {/* Status Management */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-3">Status Management</h4>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Booking Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="CHECKED_IN">Checked In</option>
                  <option value="CHECKED_OUT">Checked Out</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="NO_SHOW">No Show</option>
                </select>
              </div>
              <button
                onClick={handleStatusChange}
                disabled={newStatus === booking.status}
                className="btn-primary"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-6">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

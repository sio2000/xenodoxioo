/**
 * Dedicated function for admin dashboard stats.
 * Ensures all bookings (including custom URL / offer) are counted — no path routing issues.
 */
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

const ACTIVE_STATUSES = ["CONFIRMED", "COMPLETED", "CHECKED_IN", "CHECKED_OUT", "NO_SHOW"];

const unauthorized = (error: string) => ({
  statusCode: 401,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ success: false, error }),
});

export const handler = async (
  event: {
    queryStringParameters?: Record<string, string>;
    headers?: Record<string, string | undefined>;
  } = {}
) => {
  // Require a valid admin JWT — these stats expose revenue/occupancy/users.
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
  if (!token) return unauthorized("Unauthorized");
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Server auth not configured" }),
    };
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role?: string };
    if (payload.role !== "ADMIN") return unauthorized("Admin access required");
  } catch {
    return unauthorized("Invalid or expired token");
  }

  const qs = event?.queryStringParameters || {};
  const now = new Date();
  let year = qs.year ? parseInt(qs.year, 10) : now.getFullYear();
  let month = qs.month ? (parseInt(qs.month, 10) - 1) : now.getMonth();
  if (isNaN(year) || year < 2020 || year > 2030) year = now.getFullYear();
  if (isNaN(month) || month < 0 || month > 11) month = now.getMonth();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: "Missing Supabase config" }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Occupancy: only PAID — bookings (CONFIRMED, etc.) + used custom offers
    const [bookingsResult, offersResult, usersResult, propertiesResult, unitsResult, inquiriesRpcResult] = await Promise.all([
      supabase.from("bookings").select("status, unit_id, check_in_date, check_out_date, total_paid, total_price"),
      supabase.from("custom_checkout_offers").select("unit_id, check_in_date, check_out_date").not("used_at", "is", null),
      supabase.from("users").select("id, status", { count: "exact" }),
      supabase.from("properties").select("id, name"),
      supabase.from("units").select("id, name, property_id").eq("is_active", true).order("name"),
      supabase.rpc("count_unread_inquiries"),
    ]);

    const bookings = bookingsResult.data || [];
    const customOffers = (offersResult as any)?.data ?? [];
    const users = usersResult.data || [];
    const properties = propertiesResult.data || [];
    const units = unitsResult.data || [];
    const totalUsers = usersResult.count ?? users.length;

    const confirmedBookings = bookings.filter((b: any) => ACTIVE_STATUSES.includes(b.status));
    const occupancyBookings = confirmedBookings;
    const totalRevenue = bookings
      .filter((b: any) => ACTIVE_STATUSES.includes(b.status))
      .reduce((sum: number, b: any) => sum + (parseFloat(b.total_paid) || parseFloat(b.total_price) || 0), 0);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStartStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const monthEndStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const parseDate = (s: unknown): { y: number; m: number; d: number } | null => {
      if (s == null) return null;
      const str = typeof s === "string" ? s : s instanceof Date ? s.toISOString() : String(s);
      const m = str.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return { y: +m[1], m: +m[2] - 1, d: +m[3] };
      return null;
    };
    const dateToStr = (y: number, m: number, d: number) =>
      `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // Occupancy: only PAID — bookings + used custom offers
    const bookedDaysByUnitId = new Map<string, Set<string>>();
    const addRangeToUnit = (unitId: string, checkIn: string, checkOut: string) => {
      if (!unitId) return;
      const ci = parseDate(checkIn);
      const co = parseDate(checkOut);
      if (!ci || !co) return;
      let unitSet = bookedDaysByUnitId.get(unitId);
      if (!unitSet) {
        unitSet = new Set<string>();
        bookedDaysByUnitId.set(unitId, unitSet);
      }
      for (let yy = ci.y, mm = ci.m, dd = ci.d; yy < co.y || mm < co.m || dd < co.d; ) {
        const dayStr = dateToStr(yy, mm, dd);
        if (dayStr >= monthStartStr && dayStr <= monthEndStr) unitSet.add(dayStr);
        dd++;
        if (dd > new Date(yy, mm + 1, 0).getDate()) {
          dd = 1;
          mm++;
          if (mm > 11) {
            mm = 0;
            yy++;
          }
        }
      }
    };
    occupancyBookings.forEach((b: any) => {
      addRangeToUnit(b.unit_id ?? b.unitId ?? "", b.check_in_date ?? b.checkInDate ?? "", b.check_out_date ?? b.checkOutDate ?? "");
    });
    customOffers.forEach((o: any) => {
      addRangeToUnit(o.unit_id ?? o.unitId ?? "", o.check_in_date ?? o.checkInDate ?? "", o.check_out_date ?? o.checkOutDate ?? "");
    });

    // Group by unit for display (per-room occupancy)
    const occupancyByProperty = units.map((unit: any) => {
      const bookedDays = bookedDaysByUnitId.get(unit.id)?.size ?? 0;
      const occupancyPercentage = daysInMonth > 0 ? Math.round((bookedDays / daysInMonth) * 100) : 0;
      return {
        id: unit.id,
        name: unit.name,
        bookedDays,
        daysInMonth,
        occupancyPercentage,
      };
    });

    let unreadInquiriesCount = 0;
    if (!inquiriesRpcResult.error && typeof inquiriesRpcResult.data === "number") {
      unreadInquiriesCount = inquiriesRpcResult.data;
    } else {
      const fallback = await supabase
        .from("inquiries")
        .select("*", { count: "exact", head: true })
        .in("status", ["NEW", "GUEST_REPLIED"]);
      unreadInquiriesCount = fallback.count ?? 0;
    }

    const stats = {
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      pendingBookings: bookings.filter((b: any) => b.status === "PENDING").length,
      cancelledBookings: bookings.filter((b: any) => b.status === "CANCELLED").length,
      totalRevenue,
      totalUsers,
      propertiesCount: properties.length,
      occupancyByProperty,
      activeUsers: (users as any[]).filter((u: any) => u?.status === "ACTIVE").length || totalUsers,
      unreadInquiriesCount,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
      body: JSON.stringify({ success: true, data: stats }),
    };
  } catch (err: any) {
    console.error("[admin-stats] Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: err?.message || "Stats failed" }),
    };
  }
};

/**
 * Shared types between client and server
 * Used for API contracts and type safety
 */

// ==================== AUTH ====================

export interface RegisterRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'CUSTOMER' | 'ADMIN';
  };
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken?: string;
  error?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ==================== PROPERTIES ====================

export interface PropertyDetailResponse {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  mainImage: string;
  galleryImages: string[];
  units: UnitResponse[];
  amenities: AmenityResponse[];
  rating: number;
  reviewCount: number;
}

export interface UnitResponse {
  id: string;
  name: string;
  description?: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  basePrice: number;
  cleaningFee: number;
  images: string[];
}

export interface AmenityResponse {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface PropertiesListResponse {
  properties: PropertyDetailResponse[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== BOOKINGS ====================

export interface CheckAvailabilityRequest {
  unitId: string;
  checkInDate: string; // ISO date
  checkOutDate: string; // ISO date
  guests: number;
}

export interface CheckAvailabilityResponse {
  isAvailable: boolean;
  reason?: string;
}

export interface CreateBookingRequest {
  unitId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
  couponCode?: string;
}

export interface PriceCalculationResponse {
  basePrice: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  discountAmount: number;
  taxes: number;
  totalPrice: number;
  depositAmount: number; // 25%
  balanceAmount: number; // 75%
}

export interface BookingResponse {
  id: string;
  bookingNumber: string;
  unitId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  status: string;
  totalPrice: number;
  depositAmount: number;
  balanceAmount: number;
  guestName: string;
  guestEmail: string;
  createdAt: string;
}

export interface BookingsListResponse {
  bookings: BookingResponse[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== PAYMENTS ====================

export interface CreatePaymentIntentRequest {
  bookingId: string;
  paymentType: 'DEPOSIT' | 'BALANCE' | 'FULL';
  amount: number;
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface ConfirmPaymentRequest {
  bookingId: string;
  paymentIntentId: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  booking?: BookingResponse;
  error?: string;
}

export interface RefundPaymentRequest {
  bookingId: string;
  reason?: string;
}

export interface RefundPaymentResponse {
  success: boolean;
  refundAmount?: number;
  message?: string;
  error?: string;
}

export interface PaymentHistoryResponse {
  payments: Array<{
    id: string;
    amount: number;
    type: string;
    status: string;
    createdAt: string;
    stripeChargeId?: string;
  }>;
}

// ==================== ADMIN ====================

export interface AdminStatsResponse {
  totalBookings: number;
  totalRevenue: number;
  recentBookings: BookingResponse[];
  occupancyByProperty: Array<{
    propertyName: string;
    occupancyPercentage: number;
  }>;
}

export interface CreatePropertyRequest {
  name: string;
  description: string;
  location: string;
  city: string;
  country: string;
  mainImage: string;
  galleryImages?: string[];
  amenities?: Array<{ name: string; description?: string; icon?: string }>;
}

export interface UpdatePropertyRequest {
  name?: string;
  description?: string;
  location?: string;
  city?: string;
  mainImage?: string;
  galleryImages?: string[];
}

export interface CreateUnitRequest {
  propertyId: string;
  name: string;
  description?: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  basePrice: number;
  cleaningFee?: number;
  images?: string[];
}

export interface BlockDateRequest {
  propertyId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface SeasonalPricingRequest {
  propertyId: string;
  name: string;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  minStayDays?: number;
}

export interface CouponRequest {
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  minBookingAmount?: number;
  maxUses?: number;
}

// ==================== USER PROFILE ====================

export interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ==================== ERROR & SUCCESS ====================

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface DemoResponse {
  message: string;
}

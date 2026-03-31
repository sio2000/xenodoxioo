
-- =====================================================
-- LEONIDION HOUSES - SQLITE TO SUPABASE MIGRATION
-- Generated: 2026-03-03T03:56:17.886Z
-- Baseline: 2026-03-03T03:50:42.596Z
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS "AdminLog" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "PasswordReset" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "DateBlockage" CASCADE;
DROP TABLE IF EXISTS "SeasonalPricing" CASCADE;
DROP TABLE IF EXISTS "Amenity" CASCADE;
DROP TABLE IF EXISTS "Unit" CASCADE;
DROP TABLE IF EXISTS "Property" CASCADE;
DROP TABLE IF EXISTS "Coupon" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- =====================================================
-- TABLE CREATION
-- =====================================================

-- Create User table
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Create unique index on User email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Create Property table
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "mainImage" TEXT NOT NULL,
    "galleryImages" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Property slug
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- Create Unit table
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "maxGuests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "beds" INTEGER NOT NULL,
    "basePrice" FLOAT NOT NULL,
    "cleaningFee" FLOAT NOT NULL DEFAULT 0,
    "images" TEXT[],
    "minStayDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for Unit
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Booking table
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT,
    "checkInDate" TIMESTAMP(3) NOT NULL,
    "checkOutDate" TIMESTAMP(3) NOT NULL,
    "nights" INTEGER NOT NULL,
    "basePrice" FLOAT NOT NULL,
    "totalNights" INTEGER NOT NULL,
    "subtotal" FLOAT NOT NULL,
    "cleaningFee" FLOAT NOT NULL DEFAULT 0,
    "taxes" FLOAT NOT NULL DEFAULT 0,
    "discountAmount" FLOAT NOT NULL DEFAULT 0,
    "depositAmount" FLOAT NOT NULL DEFAULT 0,
    "balanceAmount" FLOAT NOT NULL DEFAULT 0,
    "totalPrice" FLOAT NOT NULL,
    "guests" INTEGER NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "totalPaid" FLOAT NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "balancePaid" BOOLEAN NOT NULL DEFAULT false,
    "balanceChargeDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeCustomerId" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Booking bookingNumber
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- Create foreign key constraints for Booking
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Payment table
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" FLOAT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentType" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeCustomerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "description" TEXT,
    "isRefundable" BOOLEAN NOT NULL DEFAULT true,
    "refundAmount" FLOAT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraints for Payment
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Coupon table
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" FLOAT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "minBookingAmount" FLOAT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Coupon code
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- Create SeasonalPricing table
CREATE TABLE "SeasonalPricing" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "pricePerNight" FLOAT NOT NULL,
    "minStayDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonalPricing_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for SeasonalPricing
ALTER TABLE "SeasonalPricing" ADD CONSTRAINT "SeasonalPricing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Amenity table
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for Amenity
ALTER TABLE "Amenity" ADD CONSTRAINT "Amenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create DateBlockage table
CREATE TABLE "DateBlockage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DateBlockage_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for DateBlockage
ALTER TABLE "DateBlockage" ADD CONSTRAINT "DateBlockage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Session table
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes for Session
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");

-- Create foreign key constraint for Session
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create PasswordReset table
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- Create unique index on PasswordReset token
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- Create foreign key constraint for PasswordReset
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Review table
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraints for Review
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create AdminLog table
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "changes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint for AdminLog
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================
-- DATA INSERTION
-- =====================================================

-- Insert Users
INSERT INTO "User" ("id", "email", "firstName", "lastName", "password", "role", "status", "isEmailVerified", "emailVerificationToken", "passwordResetToken", "passwordResetExpires", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cmm8fqdxe0000iwlcxavrc7la', 'admin@booking.com', 'Admin', 'User', '$2b$10$JsEWzGwFYUe4CKDMJ78K4.WMKL1IFg5HdgBIZUhEyrpjcsJ1wPyjS', 'ADMIN', 'ACTIVE', false, NULL, NULL, NULL, NULL, '2026-03-02T00:22:56.258Z', '2026-03-02T00:22:56.258Z');
INSERT INTO "User" ("id", "email", "firstName", "lastName", "password", "role", "status", "isEmailVerified", "emailVerificationToken", "passwordResetToken", "passwordResetExpires", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cmm8fqdz90001iwlcm8vpul5w', 'customer@booking.com', 'John', 'Doe', '$2b$10$tc5zqGggDkKkFcBvxmHne.YV2MCMqvqt.VW.QQxI02BtttzYNzhWu', 'CUSTOMER', 'ACTIVE', false, NULL, NULL, NULL, NULL, '2026-03-02T00:22:56.326Z', '2026-03-02T00:22:56.326Z');
INSERT INTO "User" ("id", "email", "firstName", "lastName", "password", "role", "status", "isEmailVerified", "emailVerificationToken", "passwordResetToken", "passwordResetExpires", "lastLoginAt", "createdAt", "updatedAt") VALUES ('cmm8gzwsm0003nbsbfzmnf023', 'wibavid922@hutudns.com', 'natal', 'nadel', '$2b$10$kpiGd35sArZCVJPcS6Zr6O3d4oeNnLKsZ2q98rEhu7MnTGXYCb22i', 'CUSTOMER', 'ACTIVE', false, NULL, NULL, NULL, NULL, '2026-03-02T00:58:20.231Z', '2026-03-02T00:58:20.231Z');

-- Insert Properties
INSERT INTO "Property" ("id", "name", "description", "location", "city", "country", "slug", "mainImage", "galleryImages", "isActive", "createdAt", "updatedAt") VALUES ('cmm8k0twj0000w4o5jpn49rev', 'Lykoskufi 1', 'undefined', 'Arcadia', 'Leonidion', 'Greece', 'lykoskufi-1', '/uploads/mainImage-1772418181980-300596449.jpg', '{}', true, '2026-03-02T02:23:01.987Z', '2026-03-02T02:27:59.776Z');
INSERT INTO "Property" ("id", "name", "description", "location", "city", "country", "slug", "mainImage", "galleryImages", "isActive", "createdAt", "updatedAt") VALUES ('cmm8k60or0003w4o5fekr1hiv', 'Lykoskufi 2', 'undefined', 'Arcadia', 'Leonidion', 'Greece', 'lykoskufi-2', '/uploads/mainImage-1772418424055-383530146.jpg', '{}', true, '2026-03-02T02:27:04.060Z', '2026-03-02T02:27:04.060Z');
INSERT INTO "Property" ("id", "name", "description", "location", "city", "country", "slug", "mainImage", "galleryImages", "isActive", "createdAt", "updatedAt") VALUES ('cmm8k8z2l0006w4o5dtpkw46o', 'Lykoskufi 5', 'undefined', 'Arcadia', 'Leonidion', 'Greece', 'lykoskufi-5', '/uploads/mainImage-1772418561929-485202986.avif', '{}', true, '2026-03-02T02:29:21.933Z', '2026-03-02T02:29:21.933Z');
INSERT INTO "Property" ("id", "name", "description", "location", "city", "country", "slug", "mainImage", "galleryImages", "isActive", "createdAt", "updatedAt") VALUES ('cmm8kbe8n0009w4o5vbfgfok0', 'Big Bungalow', 'undefined', 'Arcadia', 'Leonidion', 'Greece', 'big-bungalow', '/uploads/mainImage-1772461082161-265535525.jpg', '{}', true, '2026-03-02T02:31:14.904Z', '2026-03-02T14:18:02.170Z');
INSERT INTO "Property" ("id", "name", "description", "location", "city", "country", "slug", "mainImage", "galleryImages", "isActive", "createdAt", "updatedAt") VALUES ('cmm8kcrmt000cw4o5yiplpnt6', 'Small Bungalow', 'undefined', 'Arcadia', 'Leonidion', 'Greece', 'small-bungalow', '/uploads/mainImage-1772462473660-980903232.jpg', '{}', true, '2026-03-02T02:32:18.917Z', '2026-03-02T14:41:13.668Z');
INSERT INTO "Property" ("id", "name", "description", "location", "city", "country", "slug", "mainImage", "galleryImages", "isActive", "createdAt", "updatedAt") VALUES ('cmm8kdzvb000fw4o5zimfjccx', 'Ogra house', 'undefined', 'Arcadia', 'Leonidion', 'Greece', 'ogra-house', '/uploads/mainImage-1772465392013-366762628.jpg', '{}', true, '2026-03-02T02:33:16.247Z', '2026-03-02T15:29:52.020Z');

-- Insert Units
INSERT INTO "Unit" ("id", "propertyId", "name", "slug", "description", "maxGuests", "bedrooms", "bathrooms", "beds", "basePrice", "cleaningFee", "images", "minStayDays", "isActive", "createdAt", "updatedAt") VALUES ('cmm8k1s9x0002w4o5p63yrkf2', 'cmm8k0twj0000w4o5jpn49rev', 'Lykoskufi 1', 'lykoskufi-1', 'Το Lykoskufi 1 ευρισκεται σε αποσταση 40 μετρων απο την παραλια, η οποια ειναι προσβασιμη μεσω μονοπατιου με σκαλια σε 5 λεπτα. Τοσο απο το εσωτερικο, οσο και απο τη σκεπαστη βεραντα, η θεα στη θαλασσα ειναι ανεμποδιστη.
Αποτελειται απο ενα καθιστικο,λουτρο, πληρως εξοπλισμενη κουζινα και ενα υπνοδωματιο με ενα διπλο κρεβατι με 2 ξεχωριστα στρωματα για μεγαλυτερη ανεση. Μπορει να φιλοξενησει 2 ατομα.', 2, 2, 3, 1, 100, 30, ARRAY['/uploads/images-1772418226500-525554115.jpg', '/uploads/images-1772418226500-878560324.jpg', '/uploads/images-1772418226501-548511614.jpg', '/uploads/images-1772418226501-752098521.png', '/uploads/images-1772418226501-595319251.jpg', '/uploads/images-1772418226515-541063168.jpg', '/uploads/images-1772418226519-891695137.jpg'], 1, true, '2026-03-02T02:23:46.533Z', '2026-03-02T02:23:46.533Z');
INSERT INTO "Unit" ("id", "propertyId", "name", "slug", "description", "maxGuests", "bedrooms", "bathrooms", "beds", "basePrice", "cleaningFee", "images", "minStayDays", "isActive", "createdAt", "updatedAt") VALUES ('cmm8k6mmy0005w4o5gqzxg0yk', 'cmm8k60or0003w4o5fekr1hiv', 'Lykoskufi 2', 'lykoskufi-2', 'Το Lykoskufi 2 ευρισκεται σε αποσταση 45 μετρων απο την παραλια, η οποια ειναι προσβασιμη σε 5 λεπτα μεσω ενος μονοπατιου με σκαλια. Τοσο απο το εσωτερικο, οσο και απο τη σκεπαστη βεραντα, η θεα στη θαλασσα ειναι ανεμποδιστη.
Αποτελειται απο δυο επιπεδα, - στο ισογειο ειναι το καθιστικο, η κουζινα, ενα λουτρο με ντους και ενα υπνοδωματιο με ενα διπλο κρεβατι με 2 ξεχωριστα στρωματα, στον οροφο ενα υπνοδωματιο επισης με διπλο κρεβατι με 2 μονα στρωματα, ενα ανοικτο παταρι με ενα μονό κρεβατι και ενα λουτρο με μπανιερα. Μπορει να φιλοξενησει μεχρι 5 ατομα.', 5, 5, 2, 1, 140, 20, ARRAY['/uploads/images-1772418452491-638849038.jpg', '/uploads/images-1772418452491-547559297.jpg', '/uploads/images-1772418452491-409047756.jpg', '/uploads/images-1772418452491-997492684.avif', '/uploads/images-1772418452496-141216362.avif'], 1, true, '2026-03-02T02:27:32.506Z', '2026-03-02T02:27:32.506Z');
INSERT INTO "Unit" ("id", "propertyId", "name", "slug", "description", "maxGuests", "bedrooms", "bathrooms", "beds", "basePrice", "cleaningFee", "images", "minStayDays", "isActive", "createdAt", "updatedAt") VALUES ('cmm8ka0zh0008w4o5br56k8pm', 'cmm8k8z2l0006w4o5dtpkw46o', 'Lykoskufi 5', 'lykoskufi-5', 'Το Lykoskufi 5 αποτελει τη ναυαρχιδα των καταλυματων μας.  Ειναι κτισμενο σε δεσποζουσα θεση σε αποσταση 30 μετρων απο την παραλια, η οποια ειναι προσβασιμη απο ενα μονοπατι με σκαλια σε 3 λεπτα. Απο το εσωτερικο και απο ολους τους εξωτερικους χωρους η θεα στη θαλασσα ειναι πανοραμικη. 
Αποτελειται απο καθιστικο, κουζινα, 5 υπνοδωματια, 4 λουτρα, ενα WC επισκεπτων και ανεξαρτητο χωρο πλυντηριου - στεγνωτηριου.
Το σπιτι ειναι κατασκευασμενο με επιλεγμενα υλικα, αριστα διακοσμημενο με ποιοτικα επιπλα και πληρως εξοπλισμενο, με κεντρικη θερμανση και κλιματισμο με αντλια θερμοτητος. Για αποκλειστικη χρηση του σπιτιου υπαρχει μια πισινα, μια ηλεκτρικη ψησταρια και ενα κορυφαιας ποιοτητας πιανο με ουρα. Μπορει να φιλοξενησει μεχρι 10 ατομα.', 10, 10, 3, 1, 150, 50, ARRAY['/uploads/images-1772418611049-404542356.jpg', '/uploads/images-1772418611049-617692771.jpg', '/uploads/images-1772418611049-326489170.jpg', '/uploads/images-1772418611049-534415516.jpg', '/uploads/images-1772418611049-959885619.jpg', '/uploads/images-1772418611049-335875172.jpg'], 1, true, '2026-03-02T02:30:11.069Z', '2026-03-02T02:30:11.069Z');
INSERT INTO "Unit" ("id", "propertyId", "name", "slug", "description", "maxGuests", "bedrooms", "bathrooms", "beds", "basePrice", "cleaningFee", "images", "minStayDays", "isActive", "createdAt", "updatedAt") VALUES ('cmm8kbw1z000bw4o5qa59i60y', 'cmm8kbe8n0009w4o5vbfgfok0', 'Big Bungalow', 'big-bungalow', 'Το Big Bungalow ευρισκεται σε αποσταση 35 μετρων απο τη θαλασσα και η παραλια ειναι προσβασιμη μεσω μονοπατιου με σκαλια σε 3 λεπτα. Αποτελειται απο ενα χωρο καθιστικου με δυο κρεβατια και ενα μικρο υπνοδωματιο ενα  κρεβατι πλατους 1.30μ, και μπορει να φιλοξενησει μεχρι 4 ατομα
Απο τις τρεις πλευρες το κτισμα περιβαλλεται απο το εδαφος, ενω η ανατολικη πλευρα του ειναι ανοικτη προς τη θαλασσα. Η πλευρα αυτη  ειναι εξοπλισμενη εν μερει με υαλοπινακες και εν μερει με αντικουνουπικο πλεγμα και κουρτινες συσκοτισης. Με αυτη τη βιοκλιματικη σχεδιαση επιτυγχανεται ενα μειωμενο ενεργειακο αποτυπωμα, το σπιτι διαθετει μονον εναν ανεμιστηρα στο καθιστικο και ενα κλιματιστικο στο υπνοδωματιο. 
Κατα τα αλλα, υπαρχουν ολα τα απαραιτητα για μιαν ανετη διαμονη, με πληρες λουτρο, κουζινα και πλυντηριο ρουχων.
Τοσο απο το εσωτερικο, οσο και απο τη βεραντα, η θεα στη θαλασσα ειναι απροσκοπτη.
Το Bungalow ειναι ιδανικο για παραθεριστες που αγαπουν το απεριττο και την επαφη με τη φυση.', 4, 3, 2, 1, 220, 50, ARRAY['/uploads/images-1772461068395-785466717.jpg', '/uploads/images-1772461068396-880616286.jpg', '/uploads/images-1772461068411-859493489.jpg', '/uploads/images-1772461068415-201835401.jpg', '/uploads/images-1772461068421-911266449.jpg', '/uploads/images-1772461068431-317709392.jpg', '/uploads/images-1772461068435-498877261.jpg', '/uploads/images-1772461068441-779309143.jpg', '/uploads/images-1772461068445-917228380.jpg'], 1, true, '2026-03-02T02:31:37.991Z', '2026-03-02T14:17:48.466Z');
INSERT INTO "Unit" ("id", "propertyId", "name", "slug", "description", "maxGuests", "bedrooms", "bathrooms", "beds", "basePrice", "cleaningFee", "images", "minStayDays", "isActive", "createdAt", "updatedAt") VALUES ('cmm8kdbpb000ew4o5nadge3v8', 'cmm8kcrmt000cw4o5yiplpnt6', 'Small Bungalow', 'small-bungalow', 'Το Small Bungalow ευρισκεται σε αποσταση 35 μετρων απο τη θαλασσα και η παραλια ειναι προσβασιμη μεσω μονοπατιου με σκαλια σε 4 λεπτα. Αποτελειται απο ενα χωρο με ενα διπλο και ενα μονο κρεβατι, και μπορει να φιλοξενησει μεχρι 3 ατομα. 
Απο τις τρεις πλευρες το κτισμα περιβαλλεται απο το εδαφος, ενω η ανατολικη πλευρα του ειναι ανοικτη προς τη θαλασσα. Η πλευρα αυτη ειναι εξοπλισμενη εν μερει με υαλοπινακες και εν μερει με αντικουνουπικο πλεγμα και κουρτινες συσκοτισης. Με αυτη τη βιοκλιματικη σχεδιαση επιτυγχανεται ενα μειωμενο ενεργειακο αποτυπωμα, το σπιτι διαθετει μονον εναν ανεμιστηρα. 
Κατα τα αλλα, υπαρχουν ολα τα απαραιτητα για μιαν ανετη διαμονη με πληρες λουτρο, κουζινα και πλυντηριο ρουχων.
Τοσο απο το εσωτερικο, οσο και απο τη βεραντα, η θεα στη θαλασσα ειναι απροσκοπτη.
Το Bungalow ειναι ιδανικο για παραθεριστες που ζητουν την απλοτητα και τη στενη επαφη με τη φυση.', 3, 3, 1, 1, 250, 50, ARRAY['/uploads/images-1772462458614-209961488.jpg', '/uploads/images-1772462458615-511300977.jpg', '/uploads/images-1772462458615-337618217.jpg', '/uploads/images-1772462458622-165454149.jpg', '/uploads/images-1772462458624-127098961.jpg', '/uploads/images-1772462458637-300148281.jpg', '/uploads/images-1772462458641-18805791.jpg'], 1, true, '2026-03-02T02:32:44.927Z', '2026-03-02T14:40:58.675Z');
INSERT INTO "Unit" ("id", "propertyId", "name", "slug", "description", "maxGuests", "bedrooms", "bathrooms", "beds", "basePrice", "cleaningFee", "images", "minStayDays", "isActive", "createdAt", "updatedAt") VALUES ('cmm8kehwy000hw4o5wh3bhuk6', 'cmm8kdzvb000fw4o5zimfjccx', 'Ogra house', 'ogra-house', 'Tο Ogra house καταλαμβανει το ισογειο μιας μεγαλης κατοικιας και  αποτελειται απο ενα τεραστιο καθιστικο, κουζινα, 4 υπνοδωματια και 3 λουτρα. Μπορει να φιλοξενησει μεχρι 10 ατομα. Ιδανικο για μεγαλες οικογενειες και παρεες φιλων.
Τοσο απο το εσωτερικο, οσο και απο την μεγαλη αυλη, η θεα προς τη θαλασσα ειναι απροσκοπτη. 
Η αποκλειστικη παραλια ειναι προσβασιμη σε 6 λεπτα με τα ποδια μεσω ενος μονοπατιου με σκαλοπατια. Το σπιτι ειναι πολυ ανετο και  αριστα εξοπλισμενο, με κεντρικη θερμανση και κλιματισμο.
', 4, 4, 3, 1, 100, 50, ARRAY['/uploads/images-1772465372372-787674598.jpg', '/uploads/images-1772465372372-328026422.jpg', '/uploads/images-1772465372381-489834416.jpg', '/uploads/images-1772465372385-62135235.jpg', '/uploads/images-1772465372385-852837641.jpg', '/uploads/images-1772465372385-538900061.jpg', '/uploads/images-1772465372396-616219497.jpg', '/uploads/images-1772465372410-230352185.jpg', '/uploads/images-1772465372417-368464586.jpg', '/uploads/images-1772465372417-348741560.jpg', '/uploads/images-1772465372419-699241484.jpg', '/uploads/images-1772465372419-765381832.jpg', '/uploads/images-1772465372430-216157708.jpg', '/uploads/images-1772465372434-989179854.jpg', '/uploads/images-1772465372434-350727031.jpg', '/uploads/images-1772465372434-570583846.jpg', '/uploads/images-1772465372434-524984873.jpg', '/uploads/images-1772465372434-822468254.jpg', '/uploads/images-1772465372435-995203932.jpg', '/uploads/images-1772465372435-271846582.jpg', '/uploads/images-1772465372448-580251597.jpg', '/uploads/images-1772465372456-948619502.jpg', '/uploads/images-1772465372464-906717486.jpg', '/uploads/images-1772465372464-318039214.jpg', '/uploads/images-1772465372481-547316934.jpg', '/uploads/images-1772465372481-797436126.jpg', '/uploads/images-1772465372494-481262592.jpg'], 1, true, '2026-03-02T02:33:39.634Z', '2026-03-02T15:29:32.510Z');

-- Insert Coupons
INSERT INTO "Coupon" ("id", "code", "description", "discountType", "discountValue", "validFrom", "validUntil", "minBookingAmount", "maxUses", "usedCount", "isActive", "createdAt", "updatedAt") VALUES ('cmm8imxhr0000i34wf1472i3x', 'SUMMER', NULL, 'FIXED', 10, '2026-03-02T08:00:00.000Z', '2027-03-03T07:59:59.000Z', null, null, 0, true, '2026-03-02T01:44:13.839Z', '2026-03-02T01:44:13.839Z');
INSERT INTO "Coupon" ("id", "code", "description", "discountType", "discountValue", "validFrom", "validUntil", "minBookingAmount", "maxUses", "usedCount", "isActive", "createdAt", "updatedAt") VALUES ('cmm9cstrp0000uoiikaxnykhx', 'DADA', NULL, 'FIXED', 100, '2026-03-02T08:00:00.000Z', '2027-04-24T06:59:59.000Z', null, null, 0, true, '2026-03-02T15:48:37.429Z', '2026-03-02T15:48:37.429Z');
INSERT INTO "Coupon" ("id", "code", "description", "discountType", "discountValue", "validFrom", "validUntil", "minBookingAmount", "maxUses", "usedCount", "isActive", "createdAt", "updatedAt") VALUES ('cmma1vbfa0000nayw27xm4719', 'SA', NULL, 'PERCENTAGE', 10, '2026-03-03T08:00:00.000Z', '2027-03-04T07:59:59.000Z', null, null, 0, true, '2026-03-03T03:30:24.023Z', '2026-03-03T03:30:24.023Z');

-- Insert Bookings
INSERT INTO "Booking" ("id", "bookingNumber", "unitId", "userId", "checkInDate", "checkOutDate", "nights", "basePrice", "totalNights", "subtotal", "cleaningFee", "taxes", "discountAmount", "depositAmount", "balanceAmount", "totalPrice", "guests", "guestName", "guestEmail", "guestPhone", "totalPaid", "paymentStatus", "depositPaid", "balancePaid", "balanceChargeDate", "status", "stripeCustomerId", "cancellationReason", "cancelledAt", "createdAt", "updatedAt") VALUES ('cmm9bknwn0002ek10xg446qpj', 'BK-1772464456966-MCML7T', 'cmm8kbw1z000bw4o5qa59i60y', NULL, '2026-03-17T07:00:00.000Z', '2026-03-18T07:00:00.000Z', 1, 220, 1, 220, 50, 40.5, 0, 0, 0, 310.5, 2, 'Theocharis Panagiotis Siozos', 'xsiwzos@gmail.com', '6900000000', 0, 'PENDING', false, false, NULL, 'PENDING', NULL, NULL, NULL, '2026-03-02T15:14:16.967Z', '2026-03-02T15:14:16.967Z');



-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify row counts
SELECT 'User' as table_name, COUNT(*) as row_count FROM "User"
UNION ALL
SELECT 'Property', COUNT(*) FROM "Property"
UNION ALL
SELECT 'Unit', COUNT(*) FROM "Unit"
UNION ALL
SELECT 'Booking', COUNT(*) FROM "Booking"
UNION ALL
SELECT 'Payment', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'Coupon', COUNT(*) FROM "Coupon"
UNION ALL
SELECT 'SeasonalPricing', COUNT(*) FROM "SeasonalPricing"
UNION ALL
SELECT 'Amenity', COUNT(*) FROM "Amenity"
UNION ALL
SELECT 'DateBlockage', COUNT(*) FROM "DateBlockage"
UNION ALL
SELECT 'AdminLog', COUNT(*) FROM "AdminLog"
ORDER BY table_name;

-- Verify critical data integrity
SELECT 'Properties with slugs' as check_name, COUNT(*) as count FROM "Property" WHERE slug IS NOT NULL AND slug != ''
UNION ALL
SELECT 'Units with slugs', COUNT(*) FROM "Unit" WHERE slug IS NOT NULL AND slug != ''
UNION ALL
SELECT 'Properties with main images', COUNT(*) FROM "Property" WHERE "mainImage" IS NOT NULL AND "mainImage" != ''
UNION ALL
SELECT 'Active coupons', COUNT(*) FROM "Coupon" WHERE "isActive" = true
UNION ALL
SELECT 'Bookings with prices', COUNT(*) FROM "Booking" WHERE "totalPrice" > 0;

-- Migration completed successfully
SELECT 'MIGRATION COMPLETED' as status, NOW() as completion_time;

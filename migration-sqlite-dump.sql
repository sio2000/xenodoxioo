PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO User VALUES('cmm8fqdxe0000iwlcxavrc7la','admin@booking.com','Admin','User','$2b$10$JsEWzGwFYUe4CKDMJ78K4.WMKL1IFg5HdgBIZUhEyrpjcsJ1wPyjS','ADMIN','ACTIVE',0,NULL,NULL,NULL,NULL,1772410976258,1772410976258);
INSERT INTO User VALUES('cmm8fqdz90001iwlcm8vpul5w','customer@booking.com','John','Doe','$2b$10$tc5zqGggDkKkFcBvxmHne.YV2MCMqvqt.VW.QQxI02BtttzYNzhWu','CUSTOMER','ACTIVE',0,NULL,NULL,NULL,NULL,1772410976326,1772410976326);
INSERT INTO User VALUES('cmm8gzwsm0003nbsbfzmnf023','wibavid922@hutudns.com','natal','nadel','$2b$10$kpiGd35sArZCVJPcS6Zr6O3d4oeNnLKsZ2q98rEhu7MnTGXYCb22i','CUSTOMER','ACTIVE',0,NULL,NULL,NULL,NULL,1772413100231,1772413100231);
CREATE TABLE IF NOT EXISTS "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "mainImage" TEXT NOT NULL,
    "galleryImages" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO Property VALUES('cmm8k0twj0000w4o5jpn49rev','Lykoskufi 1','undefined','Arcadia','Leonidion','Greece','lykoskufi-1','/uploads/mainImage-1772418181980-300596449.jpg','[]',1,1772418181987,1772418479776);
INSERT INTO Property VALUES('cmm8k60or0003w4o5fekr1hiv','Lykoskufi 2','undefined','Arcadia','Leonidion','Greece','lykoskufi-2','/uploads/mainImage-1772418424055-383530146.jpg','[]',1,1772418424060,1772418424060);
INSERT INTO Property VALUES('cmm8k8z2l0006w4o5dtpkw46o','Lykoskufi 5','undefined','Arcadia','Leonidion','Greece','lykoskufi-5','/uploads/mainImage-1772418561929-485202986.avif','[]',1,1772418561933,1772418561933);
INSERT INTO Property VALUES('cmm8kbe8n0009w4o5vbfgfok0','Big Bungalow','undefined','Arcadia','Leonidion','Greece','big-bungalow','/uploads/mainImage-1772461082161-265535525.jpg','[]',1,1772418674904,1772461082170);
INSERT INTO Property VALUES('cmm8kcrmt000cw4o5yiplpnt6','Small Bungalow','undefined','Arcadia','Leonidion','Greece','small-bungalow','/uploads/mainImage-1772462473660-980903232.jpg','[]',1,1772418738917,1772462473668);
INSERT INTO Property VALUES('cmm8kdzvb000fw4o5zimfjccx','Ogra house','undefined','Arcadia','Leonidion','Greece','ogra-house','/uploads/mainImage-1772465392013-366762628.jpg','[]',1,1772418796247,1772465392020);
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentType" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeChargeId" TEXT,
    "stripeCustomerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" DATETIME,
    "scheduledFor" DATETIME,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "description" TEXT,
    "isRefundable" BOOLEAN NOT NULL DEFAULT true,
    "refundAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Session sample rows removed: contained JWT session tokens (never commit)
CREATE TABLE IF NOT EXISTS "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "maxGuests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "beds" INTEGER NOT NULL,
    "basePrice" REAL NOT NULL,
    "cleaningFee" REAL NOT NULL DEFAULT 0,
    "images" TEXT NOT NULL DEFAULT '[]',
    "minStayDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO Unit VALUES('cmm8k1s9x0002w4o5p63yrkf2','cmm8k0twj0000w4o5jpn49rev','Lykoskufi 1','lykoskufi-1',replace(replace('Το Lykoskufi 1 ευρισκεται σε αποσταση 40 μετρων απο την παραλια, η οποια ειναι προσβασιμη μεσω μονοπατιου με σκαλια σε 5 λεπτα. Τοσο απο το εσωτερικο, οσο και απο τη σκεπαστη βεραντα, η θεα στη θαλασσα ειναι ανεμποδιστη.\r\nΑποτελειται απο ενα καθιστικο,λουτρο, πληρως εξοπλισμενη κουζινα και ενα υπνοδωματιο με ενα διπλο κρεβατι με 2 ξεχωριστα στρωματα για μεγαλυτερη ανεση. Μπορει να φιλοξενησει 2 ατομα.','\r',char(13)),'\n',char(10)),2,2,3,1,100.0,30.0,'["/uploads/images-1772418226500-525554115.jpg","/uploads/images-1772418226500-878560324.jpg","/uploads/images-1772418226501-548511614.jpg","/uploads/images-1772418226501-752098521.png","/uploads/images-1772418226501-595319251.jpg","/uploads/images-1772418226515-541063168.jpg","/uploads/images-1772418226519-891695137.jpg"]',1,1,1772418226533,1772418226533);
INSERT INTO Unit VALUES('cmm8k6mmy0005w4o5gqzxg0yk','cmm8k60or0003w4o5fekr1hiv','Lykoskufi 2','lykoskufi-2',replace(replace('Το Lykoskufi 2 ευρισκεται σε αποσταση 45 μετρων απο την παραλια, η οποια ειναι προσβασιμη σε 5 λεπτα μεσω ενος μονοπατιου με σκαλια. Τοσο απο το εσωτερικο, οσο και απο τη σκεπαστη βεραντα, η θεα στη θαλασσα ειναι ανεμποδιστη.\r\nΑποτελειται απο δυο επιπεδα, - στο ισογειο ειναι το καθιστικο, η κουζινα, ενα λουτρο με ντους και ενα υπνοδωματιο με ενα διπλο κρεβατι με 2 ξεχωριστα στρωματα, στον οροφο ενα υπνοδωματιο επισης με διπλο κρεβατι με 2 μονα στρωματα, ενα ανοικτο παταρι με ενα μονό κρεβατι και ενα λουτρο με μπανιερα. Μπορει να φιλοξενησει μεχρι 5 ατομα.','\r',char(13)),'\n',char(10)),5,5,2,1,140.0,20.0,'["/uploads/images-1772418452491-638849038.jpg","/uploads/images-1772418452491-547559297.jpg","/uploads/images-1772418452491-409047756.jpg","/uploads/images-1772418452491-997492684.avif","/uploads/images-1772418452496-141216362.avif"]',1,1,1772418452506,1772418452506);
INSERT INTO Unit VALUES('cmm8ka0zh0008w4o5br56k8pm','cmm8k8z2l0006w4o5dtpkw46o','Lykoskufi 5','lykoskufi-5',replace(replace('Το Lykoskufi 5 αποτελει τη ναυαρχιδα των καταλυματων μας.  Ειναι κτισμενο σε δεσποζουσα θεση σε αποσταση 30 μετρων απο την παραλια, η οποια ειναι προσβασιμη απο ενα μονοπατι με σκαλια σε 3 λεπτα. Απο το εσωτερικο και απο ολους τους εξωτερικους χωρους η θεα στη θαλασσα ειναι πανοραμικη. \r\nΑποτελειται απο καθιστικο, κουζινα, 5 υπνοδωματια, 4 λουτρα, ενα WC επισκεπτων και ανεξαρτητο χωρο πλυντηριου - στεγνωτηριου.\r\nΤο σπιτι ειναι κατασκευασμενο με επιλεγμενα υλικα, αριστα διακοσμημενο με ποιοτικα επιπλα και πληρως εξοπλισμενο, με κεντρικη θερμανση και κλιματισμο με αντλια θερμοτητος. Για αποκλειστικη χρηση του σπιτιου υπαρχει μια πισινα, μια ηλεκτρικη ψησταρια και ενα κορυφαιας ποιοτητας πιανο με ουρα. Μπορει να φιλοξενησει μεχρι 10 ατομα.','\r',char(13)),'\n',char(10)),10,10,3,1,150.0,50.0,'["/uploads/images-1772418611049-404542356.jpg","/uploads/images-1772418611049-617692771.jpg","/uploads/images-1772418611049-326489170.jpg","/uploads/images-1772418611049-534415516.jpg","/uploads/images-1772418611049-959885619.jpg","/uploads/images-1772418611049-335875172.jpg"]',1,1,1772418611069,1772418611069);
INSERT INTO Unit VALUES('cmm8kbw1z000bw4o5qa59i60y','cmm8kbe8n0009w4o5vbfgfok0','Big Bungalow','big-bungalow',replace(replace('Το Big Bungalow ευρισκεται σε αποσταση 35 μετρων απο τη θαλασσα και η παραλια ειναι προσβασιμη μεσω μονοπατιου με σκαλια σε 3 λεπτα. Αποτελειται απο ενα χωρο καθιστικου με δυο κρεβατια και ενα μικρο υπνοδωματιο ενα  κρεβατι πλατους 1.30μ, και μπορει να φιλοξενησει μεχρι 4 ατομα\r\nΑπο τις τρεις πλευρες το κτισμα περιβαλλεται απο το εδαφος, ενω η ανατολικη πλευρα του ειναι ανοικτη προς τη θαλασσα. Η πλευρα αυτη  ειναι εξοπλισμενη εν μερει με υαλοπινακες και εν μερει με αντικουνουπικο πλεγμα και κουρτινες συσκοτισης. Με αυτη τη βιοκλιματικη σχεδιαση επιτυγχανεται ενα μειωμενο ενεργειακο αποτυπωμα, το σπιτι διαθετει μονον εναν ανεμιστηρα στο καθιστικο και ενα κλιματιστικο στο υπνοδωματιο. \r\nΚατα τα αλλα, υπαρχουν ολα τα απαραιτητα για μιαν ανετη διαμονη, με πληρες λουτρο, κουζινα και πλυντηριο ρουχων.\r\nΤοσο απο το εσωτερικο, οσο και απο τη βεραντα, η θεα στη θαλασσα ειναι απροσκοπτη.\r\nΤο Bungalow ειναι ιδανικο για παραθεριστες που αγαπουν το απεριττο και την επαφη με τη φυση.','\r',char(13)),'\n',char(10)),4,3,2,1,220.0,50.0,'["/uploads/images-1772461068395-785466717.jpg","/uploads/images-1772461068396-880616286.jpg","/uploads/images-1772461068411-859493489.jpg","/uploads/images-1772461068415-201835401.jpg","/uploads/images-1772461068421-911266449.jpg","/uploads/images-1772461068431-317709392.jpg","/uploads/images-1772461068435-498877261.jpg","/uploads/images-1772461068441-779309143.jpg","/uploads/images-1772461068445-917228380.jpg"]',1,1,1772418697991,1772461068466);
INSERT INTO Unit VALUES('cmm8kdbpb000ew4o5nadge3v8','cmm8kcrmt000cw4o5yiplpnt6','Small Bungalow','small-bungalow',replace(replace('Το Small Bungalow ευρισκεται σε αποσταση 35 μετρων απο τη θαλασσα και η παραλια ειναι προσβασιμη μεσω μονοπατιου με σκαλια σε 4 λεπτα. Αποτελειται απο ενα χωρο με ενα διπλο και ενα μονο κρεβατι, και μπορει να φιλοξενησει μεχρι 3 ατομα. \r\nΑπο τις τρεις πλευρες το κτισμα περιβαλλεται απο το εδαφος, ενω η ανατολικη πλευρα του ειναι ανοικτη προς τη θαλασσα. Η πλευρα αυτη ειναι εξοπλισμενη εν μερει με υαλοπινακες και εν μερει με αντικουνουπικο πλεγμα και κουρτινες συσκοτισης. Με αυτη τη βιοκλιματικη σχεδιαση επιτυγχανεται ενα μειωμενο ενεργειακο αποτυπωμα, το σπιτι διαθετει μονον εναν ανεμιστηρα. \r\nΚατα τα αλλα, υπαρχουν ολα τα απαραιτητα για μιαν ανετη διαμονη με πληρες λουτρο, κουζινα και πλυντηριο ρουχων.\r\nΤοσο απο το εσωτερικο, οσο και απο τη βεραντα, η θεα στη θαλασσα ειναι απροσκοπτη.\r\nΤο Bungalow ειναι ιδανικο για παραθεριστες που ζητουν την απλοτητα και τη στενη επαφη με τη φυση.','\r',char(13)),'\n',char(10)),3,3,1,1,250.0,50.0,'["/uploads/images-1772462458614-209961488.jpg","/uploads/images-1772462458615-511300977.jpg","/uploads/images-1772462458615-337618217.jpg","/uploads/images-1772462458622-165454149.jpg","/uploads/images-1772462458624-127098961.jpg","/uploads/images-1772462458637-300148281.jpg","/uploads/images-1772462458641-18805791.jpg"]',1,1,1772418764927,1772462458675);
INSERT INTO Unit VALUES('cmm8kehwy000hw4o5wh3bhuk6','cmm8kdzvb000fw4o5zimfjccx','Ogra house','ogra-house',replace(replace('Tο Ogra house καταλαμβανει το ισογειο μιας μεγαλης κατοικιας και  αποτελειται απο ενα τεραστιο καθιστικο, κουζινα, 4 υπνοδωματια και 3 λουτρα. Μπορει να φιλοξενησει μεχρι 10 ατομα. Ιδανικο για μεγαλες οικογενειες και παρεες φιλων.\r\nΤοσο απο το εσωτερικο, οσο και απο την μεγαλη αυλη, η θεα προς τη θαλασσα ειναι απροσκοπτη. \r\nΗ αποκλειστικη παραλια ειναι προσβασιμη σε 6 λεπτα με τα ποδια μεσω ενος μονοπατιου με σκαλοπατια. Το σπιτι ειναι πολυ ανετο και  αριστα εξοπλισμενο, με κεντρικη θερμανση και κλιματισμο.\r\n','\r',char(13)),'\n',char(10)),4,4,3,1,100.0,50.0,'["/uploads/images-1772465372372-787674598.jpg","/uploads/images-1772465372372-328026422.jpg","/uploads/images-1772465372381-489834416.jpg","/uploads/images-1772465372385-62135235.jpg","/uploads/images-1772465372385-852837641.jpg","/uploads/images-1772465372385-538900061.jpg","/uploads/images-1772465372396-616219497.jpg","/uploads/images-1772465372410-230352185.jpg","/uploads/images-1772465372417-368464586.jpg","/uploads/images-1772465372417-348741560.jpg","/uploads/images-1772465372419-699241484.jpg","/uploads/images-1772465372419-765381832.jpg","/uploads/images-1772465372430-216157708.jpg","/uploads/images-1772465372434-989179854.jpg","/uploads/images-1772465372434-350727031.jpg","/uploads/images-1772465372434-570583846.jpg","/uploads/images-1772465372434-524984873.jpg","/uploads/images-1772465372434-822468254.jpg","/uploads/images-1772465372435-995203932.jpg","/uploads/images-1772465372435-271846582.jpg","/uploads/images-1772465372448-580251597.jpg","/uploads/images-1772465372456-948619502.jpg","/uploads/images-1772465372464-906717486.jpg","/uploads/images-1772465372464-318039214.jpg","/uploads/images-1772465372481-547316934.jpg","/uploads/images-1772465372481-797436126.jpg","/uploads/images-1772465372494-481262592.jpg"]',1,1,1772418819634,1772465372510);
CREATE TABLE IF NOT EXISTS "AdminLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT,
    "changes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "DateBlockage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DateBlockage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "SeasonalPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "pricePerNight" REAL NOT NULL,
    "minStayDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeasonalPricing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "minBookingAmount" REAL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO Coupon VALUES('cmm8imxhr0000i34wf1472i3x','SUMMER',NULL,'FIXED',10.0,1772438400000,1804060799000,NULL,NULL,0,1,1772415853839,1772415853839);
INSERT INTO Coupon VALUES('cmm9cstrp0000uoiikaxnykhx','DADA',NULL,'FIXED',100.0,1772438400000,1808549999000,NULL,NULL,0,1,1772466517429,1772466517429);
INSERT INTO Coupon VALUES('cmma1vbfa0000nayw27xm4719','SA',NULL,'PERCENTAGE',10.0,1772524800000,1804147199000,NULL,NULL,0,1,1772508624023,1772508624023);
CREATE TABLE IF NOT EXISTS "Amenity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Amenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingNumber" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT,
    "checkInDate" DATETIME NOT NULL,
    "checkOutDate" DATETIME NOT NULL,
    "nights" INTEGER NOT NULL,
    "basePrice" REAL NOT NULL,
    "totalNights" INTEGER NOT NULL,
    "subtotal" REAL NOT NULL,
    "cleaningFee" REAL NOT NULL DEFAULT 0,
    "taxes" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "balanceAmount" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL,
    "guests" INTEGER NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT,
    "totalPaid" REAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "balancePaid" BOOLEAN NOT NULL DEFAULT false,
    "balanceChargeDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripeCustomerId" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO Booking VALUES('cmm9bknwn0002ek10xg446qpj','BK-1772464456966-MCML7T','cmm8kbw1z000bw4o5qa59i60y',NULL,1773730800000,1773817200000,1,220.0,1,220.0,50.0,40.5,0.0,0.0,0.0,310.5,2,'Theocharis Panagiotis Siozos','xsiwzos@gmail.com','6900000000',0.0,'PENDING',0,0,NULL,'PENDING',NULL,NULL,NULL,1772464456967,1772464456967);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");
COMMIT;

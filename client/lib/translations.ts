export type Language = "en" | "fr" | "de" | "el";

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.properties": "Properties",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.signIn": "Sign In",
    "nav.bookNow": "Book Now",

    // Homepage
    "home.hero.title": "Discover Your Perfect Greek Escape",
    "home.hero.subtitle":
      "Luxury villa rentals in Leonidion. Book your dream vacation today and experience authentic Greek hospitality.",
    "home.search.checkIn": "Check In",
    "home.search.checkOut": "Check Out",
    "home.search.guests": "Guests",
    "home.search.button": "Search",
    "home.featured.title": "Featured Properties",
    "home.featured.subtitle":
      "Handpicked villas offering the best in luxury and comfort",
    "home.featured.viewAll": "View All Properties",
    "home.why.title": "Why Book With LEONIDIONHOUSES",
    "home.trust.title": "Trusted by Thousands of Guests",
    "home.trust.description":
      "Since 2015, we've been providing unforgettable vacation experiences in Leonidion. Join our growing community of satisfied travelers.",
    "home.cta.title": "Ready to Plan Your Escape?",
    "home.cta.subtitle":
      "Explore our beautiful properties and book your perfect getaway in Leonidion today.",

    // Properties
    "properties.title": "Luxury Villas in Leonidion",
    "properties.available": "properties available",
    "properties.filter.price": "Price per Night",
    "properties.filter.bedrooms": "Bedrooms",
    "properties.filter.clearFilters": "Clear Filters",
    "properties.noResults": "No properties match your filters.",

    // Property Detail
    "property.aboutTitle": "About this property",
    "property.amenities": "Amenities",
    "property.whyLove": "Why guests love this place",
    "property.reviews": "Guest Reviews",
    "property.totalPrice": "Total",
    "property.freeCancel": "Free cancellation before 60 days",
    "property.securePayment": "Secure payment with Stripe",
    "property.cleaningIncluded": "Professional cleaning included",

    // Checkout
    "checkout.title": "Complete Your Booking",
    "checkout.subtitle": "Review your details and secure your reservation",
    "checkout.guestInfo": "Guest Information",
    "checkout.billingAddress": "Billing Address",
    "checkout.payment": "Payment Information",
    "checkout.firstName": "First Name",
    "checkout.lastName": "Last Name",
    "checkout.email": "Email",
    "checkout.phone": "Phone",
    "checkout.address": "Address",
    "checkout.city": "City",
    "checkout.zipCode": "Zip Code",
    "checkout.country": "Country",
    "checkout.cardNumber": "Card Number",
    "checkout.expiryDate": "Expiry Date",
    "checkout.cvv": "CVV",
    "checkout.agreeTerms":
      "I agree to the Cancellation Policy and Terms of Service",
    "checkout.sendUpdates":
      "Send me booking confirmation and important updates to my email",
    "checkout.completeBooking": "Complete Booking",
    "checkout.depositNote":
      "Only {amount} will be charged now. Remaining {balance} will be charged 30 days before arrival.",
    "checkout.summary": "Booking Summary",
    "checkout.property": "Property",
    "checkout.checkInOut": "Check-in - Check-out",
    "checkout.guests": "Number of Guests",
    "checkout.perNight": "per night",
    "checkout.cleaningFee": "Cleaning fee",
    "checkout.taxes": "Taxes & fees",
    "checkout.depositDue": "Deposit due",
    "checkout.balance": "Balance (75%) - Due 30 days before",

    // Auth
    "auth.welcomeBack": "Welcome Back",
    "auth.signInMessage": "Sign in to your LEONIDIONHOUSES account",
    "auth.rememberMe": "Remember me",
    "auth.forgotPassword": "Forgot password?",
    "auth.signInButton": "Sign In",
    "auth.signingIn": "Signing In...",
    "auth.signInGoogle": "Sign in with Google",
    "auth.noAccount": "Don't have an account?",
    "auth.createOne": "Create one",

    "auth.createAccount": "Create Account",
    "auth.joinMessage": "Join LEONIDIONHOUSES and start booking",
    "auth.agreeTerms": "I agree to the Terms of Service and Privacy Policy",
    "auth.createButton": "Create Account",
    "auth.creatingAccount": "Creating Account...",
    "auth.haveAccount": "Already have an account?",
    "auth.signIn": "Sign in",

    // Dashboard
    "dashboard.title": "My Account",
    "dashboard.myBookings": "My Bookings",
    "dashboard.profileSettings": "Profile Settings",
    "dashboard.preferences": "Preferences",
    "dashboard.logout": "Logout",
    "dashboard.noBookings": "No bookings yet",
    "dashboard.browseProperties": "Browse Properties",
    "dashboard.viewDetails": "View Details",
    "dashboard.cancelBooking": "Cancel Booking",
    "dashboard.saveChanges": "Save Changes",
    "dashboard.savePreferences": "Save Preferences",
    "dashboard.emailNotifications": "Email Notifications",
    "dashboard.bookingConfirmations": "Booking confirmations and reminders",
    "dashboard.marketingEmails": "Marketing Emails",
    "dashboard.specialOffers": "Special offers and new properties",
    "dashboard.smsNotifications": "SMS Notifications",
    "dashboard.smsUpdates": "Important booking updates via SMS",

    // Admin
    "admin.title": "Admin Panel",
    "admin.subtitle": "Manage your villa rental business",
    "admin.dashboard": "Dashboard",
    "admin.bookings": "Bookings",
    "admin.pricing": "Pricing & Discounts",
    "admin.properties": "Properties",
    "admin.users": "Users",
    "admin.settings": "Settings",
    "admin.totalBookings": "Total Bookings",
    "admin.revenue": "Revenue (This Month)",
    "admin.totalUsers": "Total Users",
    "admin.occupancy": "Occupancy Rate",
    "admin.recentBookings": "Recent Bookings",
    "admin.occupancyByProperty": "Occupancy by Property",
    "admin.editEmailTemplates": "Edit Email Templates",
    "admin.editCancellation": "Edit Cancellation Policy",
    "admin.editTaxSettings": "Edit Tax Settings",
    "admin.configureStripe": "Configure Stripe",

    // Common
    "common.required": "required",
    "common.optional": "optional",
    "common.select": "Select",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.back": "Back",
    "common.guest": "Guest",
    "common.guests": "Guests",
    "common.night": "night",
    "common.nights": "nights",
    "common.perNight": "/night",
  },

  fr: {
    "nav.properties": "Propriétés",
    "nav.about": "À propos",
    "nav.contact": "Contact",
    "nav.signIn": "Se connecter",
    "nav.bookNow": "Réserver maintenant",

    "home.hero.title": "Découvrez votre escapade grecque parfaite",
    "home.hero.subtitle":
      "Location de villas de luxe à Léonidion. Réservez vos vacances de rêve dès aujourd'hui et vivez l'hospitalité grecque authentique.",
    "home.search.checkIn": "Arrivée",
    "home.search.checkOut": "Départ",
    "home.search.guests": "Clients",
    "home.search.button": "Rechercher",
    "home.featured.title": "Propriétés vedettes",
    "home.featured.subtitle":
      "Villas sélectionnées offrant le meilleur en luxe et confort",
    "home.featured.viewAll": "Voir toutes les propriétés",
    "home.why.title": "Pourquoi réserver chez LEONIDIONHOUSES",
    "home.trust.title": "De confiance auprès de milliers de clients",
    "home.trust.description":
      "Depuis 2015, nous offrons des expériences de vacances inoubliables à Léonidion. Rejoignez notre communauté croissante de voyageurs satisfaits.",
    "home.cta.title": "Prêt à planifier votre escapade?",
    "home.cta.subtitle":
      "Explorez nos belles propriétés et réservez vos vacances parfaites à Léonidion dès aujourd'hui.",

    "properties.title": "Villas de luxe à Léonidion",
    "properties.available": "propriétés disponibles",
    "properties.filter.price": "Prix par nuit",
    "properties.filter.bedrooms": "Chambres",
    "properties.filter.clearFilters": "Effacer les filtres",
    "properties.noResults": "Aucune propriété ne correspond à vos filtres.",

    "checkout.title": "Terminez votre réservation",
    "checkout.subtitle":
      "Vérifiez vos informations et sécurisez votre réservation",
    "checkout.completeBooking": "Terminer la réservation",

    "auth.welcomeBack": "Bienvenue",
    "auth.signInMessage": "Connectez-vous à votre compte LEONIDIONHOUSES",
    "auth.signInButton": "Se connecter",

    "dashboard.title": "Mon compte",
    "dashboard.myBookings": "Mes réservations",
    "dashboard.logout": "Déconnexion",

    "admin.title": "Panneau d'administration",
    "admin.subtitle": "Gérez votre entreprise de location de villas",
  },

  de: {
    "nav.properties": "Objekte",
    "nav.about": "Über uns",
    "nav.contact": "Kontakt",
    "nav.signIn": "Anmelden",
    "nav.bookNow": "Jetzt buchen",

    "home.hero.title": "Entdecke deinen perfekten griechischen Rückzugsort",
    "home.hero.subtitle":
      "Luxusvilla-Mietungen in Leonidion. Buche deinen Traumurlaub heute und erlebe authentische griechische Gastfreundschaft.",
    "home.search.checkIn": "Anreise",
    "home.search.checkOut": "Abreise",
    "home.search.guests": "Gäste",
    "home.search.button": "Suchen",
    "home.featured.title": "Ausgewählte Objekte",
    "home.featured.subtitle":
      "Handverlesene Villen mit dem Besten an Luxus und Komfort",
    "home.featured.viewAll": "Alle Objekte ansehen",
    "home.why.title": "Warum bei LEONIDIONHOUSES buchen",
    "home.trust.title": "Vertraut von Tausenden von Gästen",
    "home.trust.description":
      "Seit 2015 bieten wir unvergessliche Urlaubserlebnisse in Leonidion. Treten Sie unserer wachsenden Gemeinschaft zufriedener Reisender bei.",
    "home.cta.title": "Bereit, deinen Rückzugsort zu planen?",
    "home.cta.subtitle":
      "Erkunde unsere wunderschönen Objekte und buche deinen perfekten Urlaub in Leonidion noch heute.",

    "properties.title": "Luxusvillas in Leonidion",
    "properties.available": "Objekte verfügbar",
    "properties.filter.price": "Preis pro Nacht",
    "properties.filter.bedrooms": "Schlafzimmer",
    "properties.filter.clearFilters": "Filter löschen",
    "properties.noResults": "Keine Objekte entsprechen deinen Filtern.",

    "checkout.title": "Schließe deine Buchung ab",
    "checkout.subtitle":
      "Überprüfe deine Daten und bestätige deine Reservierung",
    "checkout.completeBooking": "Buchung abschließen",

    "auth.welcomeBack": "Willkommen zurück",
    "auth.signInMessage": "Melden dich bei deinem LEONIDIONHOUSES-Konto an",
    "auth.signInButton": "Anmelden",

    "dashboard.title": "Mein Konto",
    "dashboard.myBookings": "Meine Buchungen",
    "dashboard.logout": "Abmelden",

    "admin.title": "Admin-Dashboard",
    "admin.subtitle": "Verwalte dein Villenvermietungsgeschäft",
  },

  el: {
    "nav.properties": "Ακίνητα",
    "nav.about": "Σχετικά",
    "nav.contact": "Επικοινωνία",
    "nav.signIn": "Σύνδεση",
    "nav.bookNow": "Κάντε κράτηση τώρα",

    "home.hero.title": "Ανακαλύψτε την τέλεια ελληνική σας διαφυγή",
    "home.hero.subtitle":
      "Ενοικίαση πολυτελών βιλών στη Λεωνίδιο. Κάντε κράτηση για τις διακοπές των ονείρων σας σήμερα και απολαύστε την αυθεντική ελληνική φιλοξενία.",
    "home.search.checkIn": "Άφιξη",
    "home.search.checkOut": "Αναχώρηση",
    "home.search.guests": "Επισκέπτες",
    "home.search.button": "Αναζήτηση",
    "home.featured.title": "Προτεινόμενα ακίνητα",
    "home.featured.subtitle":
      "Επιλεγμένες βίλες που προσφέρουν το καλύτερο σε πολυτέλεια και άνεση",
    "home.featured.viewAll": "Προβολή όλων των ακινήτων",
    "home.why.title": "Γιατί να κάνετε κράτηση στο LEONIDIONHOUSES",
    "home.trust.title": "Αξιόπιστο από χιλιάδες επισκέπτες",
    "home.trust.description":
      "Από το 2015, παρέχουμε αξέχαστες εμπειρίες διακοπών στη Λεωνίδιο. Προσχωρήστε στην αυξανόμενη κοινότητα ικανοποιημένων ταξιδιωτών.",
    "home.cta.title": "Έτοιμος να σχεδιάσεις τη διαφυγή σου;",
    "home.cta.subtitle":
      "Εξερευνήστε τα όμορφα ακίνητά μας και κάντε κράτηση για τις τέλειες διακοπές σας στη Λεωνίδιο σήμερα.",

    "properties.title": "Πολυτελείς βίλες στη Λεωνίδιο",
    "properties.available": "διαθέσιμα ακίνητα",
    "properties.filter.price": "Τιμή ανά νύχτα",
    "properties.filter.bedrooms": "Κρεβατοκάμαρες",
    "properties.filter.clearFilters": "Διαγραφή φίλτρων",
    "properties.noResults": "Κανένα ακίνητο δεν ταιριάζει με τα φίλτρά σας.",

    "checkout.title": "Ολοκληρώστε την κράτησή σας",
    "checkout.subtitle":
      "Ελέγξτε τα στοιχεία σας και ασφαλίστε την κράτησή σας",
    "checkout.completeBooking": "Ολοκλήρωση κράτησης",

    "auth.welcomeBack": "Καλώς ήρθατε πίσω",
    "auth.signInMessage": "Συνδεθείτε στο λογαριασμό σας LEONIDIONHOUSES",
    "auth.signInButton": "Σύνδεση",

    "dashboard.title": "Ο λογαριασμός μου",
    "dashboard.myBookings": "Οι κρατήσεις μου",
    "dashboard.logout": "Αποσύνδεση",

    "admin.title": "Πίνακας διοίκησης",
    "admin.subtitle": "Διαχειρίστε την επιχείρησή σας ενοικίασης βιλών",
  },
};

export function t(key: string, lang: Language = "en"): string {
  return translations[lang][key] || key;
}

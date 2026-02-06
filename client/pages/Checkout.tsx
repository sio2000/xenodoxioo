import Layout from "@/components/Layout";
import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { CreditCard, Lock } from "lucide-react";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  const propertyId = searchParams.get("property");

  // Mock property data
  const property = {
    id: 1,
    name: "The Lykoskufi Villas - Villa A",
    price: 280,
    cleaningFee: 50,
    nights: 3,
  };

  const subtotal = property.price * property.nights;
  const depositAmount = Math.round(subtotal * 0.25);
  const tax = Math.round((subtotal + property.cleaningFee) * 0.15);
  const total = subtotal + property.cleaningFee + tax;

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zipCode: "",
    country: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate Stripe payment
    setTimeout(() => {
      setIsProcessing(false);
      // In production, redirect to confirmation page
      alert(
        "Booking confirmed! Confirmation email will be sent to " +
          formData.email,
      );
    }, 2000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Layout>
      <div className="container-max py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            to={`/properties/${propertyId}`}
            className="text-primary hover:text-primary/80 mb-4 inline-block"
          >
            ← Back to property
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Complete Your Booking
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Review your details and secure your reservation
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Guest Information */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  Guest Information
                </h2>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  Billing Address
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        placeholder="New York"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Zip Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Country *
                    </label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    >
                      <option value="">Select a country</option>
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="GR">Greece</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <CreditCard size={24} />
                  Payment Information
                </h2>

                <div className="p-4 bg-primary/5 rounded-lg mb-4 flex items-center gap-2">
                  <Lock size={18} className="text-primary" />
                  <p className="text-sm text-foreground">
                    Your payment information is encrypted and secure. We use
                    Stripe for secure processing.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Expiry Date *
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Policies */}
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" required className="mt-1 w-4 h-4" />
                  <span className="text-sm text-foreground">
                    I agree to the{" "}
                    <a href="#" className="text-primary hover:underline">
                      Cancellation Policy
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-primary hover:underline">
                      Terms of Service
                    </a>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4" />
                  <span className="text-sm text-foreground">
                    Send me booking confirmation and important updates to my
                    email
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary w-full justify-center text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing Payment..." : "Complete Booking"}
              </button>

              <p className="text-xs text-muted-foreground text-center">
                Only ${depositAmount} will be charged now. Remaining $
                {total - depositAmount} will be charged 30 days before arrival.
              </p>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-bold text-foreground mb-6">
                Booking Summary
              </h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Property</p>
                  <p className="font-semibold text-foreground">
                    {property.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Check-in - Check-out
                  </p>
                  <p className="font-semibold text-foreground">
                    Dec 15 - Dec 18 (3 nights)
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Number of Guests
                  </p>
                  <p className="font-semibold text-foreground">2 guests</p>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6 pb-6 border-b border-border text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {property.nights} nights × ${property.price}
                  </span>
                  <span className="font-semibold text-foreground">
                    ${subtotal}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cleaning fee</span>
                  <span className="font-semibold text-foreground">
                    ${property.cleaningFee}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Taxes & fees (15%)
                  </span>
                  <span className="font-semibold text-foreground">${tax}</span>
                </div>
              </div>

              {/* Total */}
              <div className="mb-6">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-3xl font-bold text-primary">
                    ${total}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deposit due: ${depositAmount}
                </p>
              </div>

              {/* Payment Schedule */}
              <div className="bg-primary/5 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-foreground mb-3 text-sm">
                  Payment Schedule
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit (25%)</span>
                    <span className="font-semibold text-foreground">
                      ${depositAmount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Balance (75%) - Due 30 days before
                    </span>
                    <span className="font-semibold text-foreground">
                      ${total - depositAmount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 text-xs text-muted-foreground border-t border-border pt-4">
                <p>✓ Secure Stripe payment</p>
                <p>✓ Free cancellation within 60 days</p>
                <p>✓ Money-back guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

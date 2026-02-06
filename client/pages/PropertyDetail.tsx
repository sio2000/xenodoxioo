import Layout from "@/components/Layout";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  Bed,
  Bath,
  Users,
  MapPin,
  Wifi,
  Utensils,
  Wind,
  Tv,
  Waves,
  Heart,
} from "lucide-react";
import { useState } from "react";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  // Property data (in production, fetch from API)
  const property = {
    id: 1,
    name: "The Lykoskufi Villas - Villa A",
    property: "The Lykoskufi Villas",
    description:
      "Experience pure luxury in our stunning seaside villa. This magnificent property features modern amenities combined with traditional Greek architecture. Wake up to breathtaking sea views, relax by your private pool, and enjoy the authentic Mediterranean lifestyle.",
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    basePrice: 280,
    cleaningFee: 50,
    price: 280,
    rating: 4.9,
    reviews: 56,
    location: "Leonidion, Peloponnese, Greece",
    images: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=600&fit=crop",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=600&fit=crop",
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=600&fit=crop",
    ],
    amenities: [
      { icon: Wifi, label: "WiFi", description: "High-speed internet" },
      {
        icon: Wind,
        label: "Air Conditioning",
        description: "Full AC in all rooms",
      },
      { icon: Utensils, label: "Full Kitchen", description: "Fully equipped" },
      { icon: Tv, label: "Smart TV", description: "Entertainment system" },
      {
        icon: Waves,
        label: "Private Pool",
        description: "Heated pool available",
      },
      {
        icon: MapPin,
        label: "Beach Access",
        description: "5 min walk to beach",
      },
    ],
    highlights: [
      "Stunning sea views from all bedrooms",
      "Modern kitchen with top appliances",
      "Spacious living areas with luxury furniture",
      "Private terrace with BBQ area",
      "Dedicated parking space",
      "Professional cleaning service",
    ],
  };

  const handleBooking = () => {
    // Navigate to checkout with dates
    window.location.href = `/checkout?property=${id}`;
  };

  return (
    <Layout>
      {/* Image Gallery */}
      <div className="bg-black relative">
        <div className="container-max">
          <div className="grid md:grid-cols-4 gap-2 py-6">
            {/* Main Image */}
            <div className="md:col-span-2 relative rounded-lg overflow-hidden h-96 md:h-[500px]">
              <img
                src={property.images[selectedImage]}
                alt={property.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-white/90 transition-colors"
              >
                <Heart
                  size={20}
                  className={
                    isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
                  }
                />
              </button>
            </div>

            {/* Thumbnail Gallery */}
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-2 gap-2">
              {property.images.map((image, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`rounded-lg overflow-hidden h-32 md:h-24 transition-all ${
                    selectedImage === idx ? "ring-4 ring-accent" : ""
                  }`}
                >
                  <img
                    src={image}
                    alt={`View ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-max py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-2">
                {property.property}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {property.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={18}
                        className="fill-accent text-accent"
                      />
                    ))}
                  </div>
                  <span className="font-semibold">{property.rating}</span>
                  <span className="text-muted-foreground">
                    ({property.reviews} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin size={16} />
                  <span>{property.location}</span>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bedrooms</p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bed size={24} className="text-primary" />
                  {property.bedrooms}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Bathrooms</p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bath size={24} className="text-primary" />
                  {property.bathrooms}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Max Guests</p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Users size={24} className="text-primary" />
                  {property.maxGuests}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                About this property
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Amenities
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {property.amenities.map((amenity, idx) => {
                  const Icon = amenity.icon;
                  return (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Icon size={32} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {amenity.label}
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {amenity.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Highlights */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Why guests love this place
              </h2>
              <ul className="space-y-3">
                {property.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-foreground">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reviews Section */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Guest Reviews
              </h2>
              <div className="space-y-6">
                {[
                  {
                    author: "Sarah M.",
                    rating: 5,
                    text: "Absolutely stunning villa! The views are incredible and the location is perfect. Highly recommend!",
                    date: "2 weeks ago",
                  },
                  {
                    author: "John D.",
                    rating: 5,
                    text: "Best vacation ever. Everything was clean, well-maintained, and exactly as described.",
                    date: "1 month ago",
                  },
                ].map((review, idx) => (
                  <div key={idx} className="pb-6 border-b border-border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground">
                        {review.author}
                      </h4>
                      <span className="text-muted-foreground text-sm">
                        {review.date}
                      </span>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className="fill-accent text-accent"
                        />
                      ))}
                    </div>
                    <p className="text-foreground">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Booking Widget */}
          <div className="lg:col-span-1">
            {/* Price & Booking */}
            <div className="sticky top-20 bg-card border border-border rounded-lg p-6 shadow-lg">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-primary">
                    ${property.price}
                  </span>
                  <span className="text-muted-foreground">/night</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Includes taxes and fees
                </p>
              </div>

              {/* Calendar */}
              <AvailabilityCalendar />

              {/* Price Breakdown */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2 text-sm mb-6">
                <div className="flex justify-between text-foreground">
                  <span>1 night × ${property.basePrice}</span>
                  <span>${property.basePrice}</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>Cleaning fee</span>
                  <span>${property.cleaningFee}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                  <span>Total</span>
                  <span>${property.basePrice + property.cleaningFee}</span>
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={handleBooking}
                className="btn-primary w-full justify-center mb-3"
              >
                Book Now
              </button>

              {/* Trust Badges */}
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>✓ Free cancellation before 60 days</p>
                <p>✓ Secure payment with Stripe</p>
                <p>✓ Professional cleaning included</p>
              </div>
            </div>

            {/* More Properties */}
            <div className="mt-8">
              <h3 className="font-bold text-foreground mb-4">
                Other properties
              </h3>
              <Link
                to="/properties"
                className="block p-4 border border-border rounded-lg hover:border-primary transition-colors"
              >
                <p className="font-semibold text-foreground mb-2">
                  View More Villas
                </p>
                <p className="text-muted-foreground text-sm">
                  Browse our entire collection
                </p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

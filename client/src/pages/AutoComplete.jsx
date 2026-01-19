// use this in DashRestaurant - restaurant creation module 



import { useState } from "react";
import AddressAutocomplete from "./AddressAutocomplete";

export default function DashRestaurants() {
  const [location, setLocation] = useState(null);

  const handleSubmit = async () => {
    const payload = {
      name: "Soho Brew Cafe",
      categories: ["CATEGORY_ID"],
      address: {
        addressLine1: "12 Dean Street",
        areaLocality: "Soho",
        city: "London",
        postcode: "W1D 3RS",
        country: "United Kingdom",
      },
      location, // { lat, lng }
    };

    await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
  };

  return (
    <>
      <AddressAutocomplete onSelect={setLocation} />
      <button onClick={handleSubmit}>Create Restaurant</button>
    </>
  );
}

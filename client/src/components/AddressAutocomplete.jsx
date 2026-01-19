import { Autocomplete } from "@react-google-maps/api";
import { useRef } from "react";

export default function AddressAutocomplete({ onSelect }) {
  const autoRef = useRef(null);

  const onLoad = (autocomplete) => {
    autoRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    const place = autoRef.current.getPlace();

    if (!place.geometry) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    onSelect({
      lat,
      lng,
      formattedAddress: place.formatted_address,
      components: place.address_components,
    });
  };

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
      <input
        type="text"
        placeholder="Enter restaurant location"
        className="border p-2 w-full"
      />
    </Autocomplete>
  );
}

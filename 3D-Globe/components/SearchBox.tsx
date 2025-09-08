"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useAppStore } from "@/store/useAppStore";
import { iso2ToIso3, findCountryByName } from "@/lib/countryMap";
import toast from "react-hot-toast";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

export function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setSelected = useAppStore((s) => s.setSelectedIso3);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    const loader = new Loader({
      apiKey,
      libraries: ["places"]
    });

    loader
      .load()
      .then(() => {
        if (!inputRef.current) return;

        const ac = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["(regions)"],
          fields: ["address_components", "geometry", "name"]
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place || !place.address_components) {
            toast.error("No details for that query.");
            return;
          }

          const countryComp = place.address_components.find(
            (c: google.maps.GeocoderAddressComponent) => c.types.includes("country")
          );

          const iso2 = countryComp?.short_name;
          const name = countryComp?.long_name ?? place.name ?? "";
          const iso3 = iso2 ? iso2ToIso3(iso2) : findCountryByName(name);

          if (!iso3) {
            toast.error("Sorry, couldn't locate that country.");
            return;
          }

          const lat = place.geometry?.location?.lat?.() ?? 0;
          const lon = place.geometry?.location?.lng?.() ?? 0;

          // This triggers the camera via the store's registered callback
          setSelected(iso3, { lat, lon });
        });

        setReady(true);
      })
      .catch(() => setReady(false));
  }, [setSelected]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="input"
        placeholder="Search countries or cities…"
        aria-label="Search countries or cities"
        disabled={!ready}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60">
        <span className="kbd">⌘K</span>
      </div>
    </div>
  );
}

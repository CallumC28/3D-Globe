// Lazy import world-atlas data in client/runtime-friendly way.
import countries110 from "world-atlas/countries-110m.json" assert { type: "json" };

export function getCountries110m() {
  return countries110 as unknown as {
    type: "Topology";
    objects: { countries: any };
    arcs: any[];
    transform: any;
  };
}

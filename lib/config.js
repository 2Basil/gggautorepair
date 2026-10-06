// Edit this file to rebrand the site for your garage.
export const GARAGE = {
  name: "PitStop Garage",
  tagline: "Honest repairs. Live updates. Zero surprises.",
  phone: "+91 98765 43210",
  email: "hello@pitstopgarage.in",
  address: "Plot 12, Service Road, Your City",
  gstin: "", // add your GSTIN to print it on bills
  taxPct: 18,
  hours: "Mon–Sat 9:00 – 19:00",
};

export const CATEGORIES = ["Repairing", "Washing", "Modification", "Maintenance"];

export const CATEGORY_BLURB = {
  Repairing: "Brakes, engine, clutch, AC, suspension and electricals fixed right the first time.",
  Washing: "From a quick foam wash to deep interior detailing — your car, showroom fresh.",
  Modification: "Alloys, music systems, LED lighting, wraps and coatings that make it yours.",
  Maintenance: "Periodic servicing, oil changes, dent and paint to keep it running for years.",
};

export const VEHICLE_TYPES = {
  HATCHBACK: { label: "Hatchback", multiplier: 1.0 },
  SEDAN: { label: "Sedan", multiplier: 1.15 },
  SUV: { label: "SUV / MUV", multiplier: 1.35 },
  LUXURY: { label: "Luxury", multiplier: 1.8 },
};

export const FUELS = ["PETROL", "DIESEL", "CNG", "ELECTRIC", "HYBRID"];

// The order here is the order of the live tracker.
export const STEPS = [
  { key: "BOOKED", label: "Booked", title: "Request received", desc: "We have your request and will get started shortly." },
  { key: "REPAIRING", label: "Repairing", title: "Repair in progress", desc: "Our mechanics are working on your vehicle." },
  { key: "REPAIRED", label: "Repaired", title: "Repair completed", desc: "Work is done. Getting ready for testing." },
  { key: "TESTING", label: "Testing", title: "Road test & quality check", desc: "We are test-driving and double-checking everything." },
  { key: "READY", label: "Ready", title: "Tested & ready", desc: "Your final bill is ready. Come pick up your vehicle." },
  { key: "DELIVERED", label: "Delivered", title: "Delivered", desc: "Vehicle handed over. Thank you for choosing us!" },
];
export const STATUS_KEYS = [...STEPS.map((s) => s.key), "CANCELLED"];
export const STATUS_LABEL = Object.fromEntries([...STEPS.map((s) => [s.key, s.label]), ["CANCELLED", "Cancelled"]]);

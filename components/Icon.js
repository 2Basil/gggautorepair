const PATHS = {
  wrench: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  droplet: "M12 2.7s6 6.2 6 10.8a6 6 0 0 1-12 0C6 8.9 12 2.7 12 2.7z",
  sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9zM5 16l.7 1.6L7.3 18.3l-1.6.7L5 20.6l-.7-1.6L2.7 18.3l1.6-.7z",
  settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.2 4.5l1.8 1.4-2 3.4-2.1-.8a7.5 7.5 0 0 1-1.7 1l-.3 2.2H10l-.3-2.2a7.5 7.5 0 0 1-1.7-1l-2.1.8-2-3.4L5.7 13a7.7 7.7 0 0 1 0-2L3.9 9.6l2-3.4 2.1.8a7.5 7.5 0 0 1 1.7-1L10 3.8h4l.3 2.2a7.5 7.5 0 0 1 1.7 1l2.1-.8 2 3.4L18.3 11a7.7 7.7 0 0 1 0 2z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  user: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm-8 9a8 8 0 0 1 16 0",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3l-4.3-4.3",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-14v5l3 2",
  car: "M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16M3 16h18v3H3zM7 19v1.5M17 19v1.5M7 13h.01M17 13h.01",
  key: "M15 8a4 4 0 1 1-3.5 6L4 21.5V19H2v-2h2l5.5-5.5A4 4 0 0 1 15 8z",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3zm-3.5 9l2.5 2.5 4.5-5",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  logout: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
  print: "M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z",
  menu: "M4 7h16M4 12h16M4 17h16",
};

export default function Icon({ name, size = 20, stroke = 1.8, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={PATHS[name] || PATHS.wrench} />
    </svg>
  );
}

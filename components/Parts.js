// Line-art mechanic parts used by the animated background and the logo.

export function gearPath(cx, cy, teeth, rOut, rIn) {
  const step = (Math.PI * 2) / teeth;
  const p = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    d += `${i === 0 ? "M" : "L"}${p(rIn, a - step * 0.3)} L${p(rOut, a - step * 0.17)} L${p(rOut, a + step * 0.17)} L${p(rIn, a + step * 0.3)} `;
  }
  return d + "Z";
}

const lugs = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI * 2) / 12;
  const f = (r) => [(32 + r * Math.cos(a)).toFixed(2), (32 + r * Math.sin(a)).toFixed(2)];
  const [x1, y1] = f(21);
  const [x2, y2] = f(27);
  return `M${x1} ${y1} L${x2} ${y2}`;
}).join(" ");

const holes = Array.from({ length: 6 }, (_, i) => {
  const a = (i * Math.PI * 2) / 6;
  return [(32 + 18 * Math.cos(a)).toFixed(2), (32 + 18 * Math.sin(a)).toFixed(2)];
});

export const PART_NAMES = ["gear", "tyre", "wrench", "piston", "spark", "nut", "battery", "disc"];
export const SPINNERS = new Set(["gear", "tyre", "nut", "disc"]);

export function PartShape({ name }) {
  switch (name) {
    case "gear":
      return (
        <>
          <path d={gearPath(32, 32, 10, 29, 22)} />
          <circle cx="32" cy="32" r="9" />
        </>
      );
    case "tyre":
      return (
        <>
          <circle cx="32" cy="32" r="29" />
          <circle cx="32" cy="32" r="17" />
          <circle cx="32" cy="32" r="5" />
          <path d={lugs} />
        </>
      );
    case "wrench":
      return (
        <g transform="translate(-4 -4) scale(2.8)">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </g>
      );
    case "piston":
      return (
        <>
          <rect x="18" y="6" width="28" height="28" rx="4" />
          <path d="M18 14h28M18 20h28" />
          <path d="M32 34v14" />
          <circle cx="32" cy="54" r="6" />
          <circle cx="32" cy="54" r="1.5" />
        </>
      );
    case "spark":
      return (
        <>
          <rect x="25" y="4" width="14" height="10" rx="2" />
          <path d="M22 14h20v10H22z" />
          <path d="M28 24v22M36 24v22" />
          <path d="M28 46h8v8H28zM32 54v6" />
        </>
      );
    case "nut":
      return (
        <>
          <polygon points="32,5 55,18.5 55,45.5 32,59 9,45.5 9,18.5" />
          <circle cx="32" cy="32" r="11" />
        </>
      );
    case "battery":
      return (
        <>
          <rect x="6" y="20" width="52" height="32" rx="4" />
          <rect x="14" y="13" width="9" height="7" />
          <rect x="41" y="13" width="9" height="7" />
          <path d="M16 36h10M21 31v10M38 36h10" />
        </>
      );
    case "disc":
      return (
        <>
          <circle cx="32" cy="32" r="28" />
          <circle cx="32" cy="32" r="10" />
          {holes.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" />
          ))}
        </>
      );
    default:
      return null;
  }
}

export function PartIcon({ name, size = 24, stroke = 2.5, ...rest }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <PartShape name={name} />
    </svg>
  );
}

import { PartIcon, SPINNERS } from "./Parts";

// Mechanic parts that appear one by one in the background of every page and drift slowly.
const ITEMS = [
  ["gear", 4, 10, 96, 0, "#C8A86B"],
  ["tyre", 86, 8, 120, 1.2, "#B9A98A"],
  ["wrench", 20, 38, 84, 2.4, "#C8452B"],
  ["piston", 92, 34, 80, 3.6, "#B9A98A"],
  ["nut", 8, 62, 60, 4.8, "#C8A86B"],
  ["disc", 78, 62, 110, 6.0, "#B9A98A"],
  ["spark", 40, 8, 64, 7.2, "#C8452B"],
  ["battery", 62, 86, 84, 8.4, "#B9A98A"],
  ["gear", 30, 80, 130, 9.6, "#C8A86B"],
  ["tyre", 4, 88, 90, 10.8, "#C8452B"],
  ["wrench", 70, 14, 70, 12.0, "#B9A98A"],
  ["nut", 52, 48, 46, 13.2, "#C8A86B"],
  ["gear", 94, 80, 70, 14.4, "#B9A98A"],
  ["piston", 14, 20, 56, 15.6, "#C8A86B"],
];

export default function AmbientBG() {
  return (
    <div className="amb" aria-hidden="true">
      {ITEMS.map(([name, x, y, size, delay, color], i) => (
        <div
          key={i}
          className="amb-in"
          style={{ left: `${x}%`, top: `${y}%`, "--d": `${delay}s`, "--fx": `${i % 2 ? 120 : -120}px`, "--fy": `${i % 3 ? -80 : 80}px`, "--rot": `${(i % 2 ? 1 : -1) * 140}deg` }}
        >
          <div className="amb-float" style={{ "--d": `${delay}s`, "--fd": `${14 + (i % 5) * 3}s` }}>
            <PartIcon
              name={name}
              size={size}
              stroke={1.6}
              className={SPINNERS.has(name) ? "amb-spin" : ""}
              style={{ color, "--sd": `${40 + (i % 4) * 14}s`, "--dir": i % 2 ? "reverse" : "normal" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

import { gearPath } from "./Parts";

const BODY =
  "M70 302 L70 258 Q70 240 94 236 L204 222 C236 178 282 150 346 148 L452 148 C502 150 534 176 562 218 L664 234 Q716 242 718 270 L718 302 Z";

const p = (x, y, r, d) => ({ "--x": `${x}px`, "--y": `${y}px`, "--r": `${r}deg`, "--d": `${d}s` });

function Wheel({ cx, style }) {
  const spokes = [0, 72, 144, 216, 288];
  return (
    <g className="part" style={style}>
      <g transform={`translate(${cx} 290)`}>
        <g className="spin">
          <circle r="50" fill="#22262E" />
          <circle r="47" fill="none" stroke="#F7F1E3" strokeOpacity=".28" strokeWidth="3" strokeDasharray="5 9" />
          <circle r="42" fill="none" stroke="#3A3F49" strokeWidth="2" />
          <circle r="33" fill="url(#rimG)" stroke="#7C828C" strokeWidth="2" />
          {spokes.map((a) => (
            <path key={a} transform={`rotate(${a})`} d="M-5 -9 L-3.5 -30 L3.5 -30 L5 -9 Z" fill="#9EA4AE" stroke="#6B7079" strokeWidth="1" />
          ))}
          <circle r="9" fill="#6B7079" />
          <circle r="3.5" fill="#E9E1CE" />
        </g>
      </g>
    </g>
  );
}

export default function CarAssembly() {
  return (
    <svg className="car-svg" viewBox="0 0 800 380" role="img" aria-label="Car parts assembling into a finished car">
      <defs>
        <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E0583F" />
          <stop offset=".55" stopColor="#C8452B" />
          <stop offset="1" stopColor="#9E321D" />
        </linearGradient>
        <linearGradient id="glassG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DCEBEE" />
          <stop offset="1" stopColor="#8FB0B9" />
        </linearGradient>
        <radialGradient id="rimG" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#F4EEDD" />
          <stop offset="1" stopColor="#B7BDC6" />
        </radialGradient>
        <linearGradient id="brassG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3C887" />
          <stop offset="1" stopColor="#B38D45" />
        </linearGradient>
        <linearGradient id="beamG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFE7A0" stopOpacity=".75" />
          <stop offset="1" stopColor="#FFE7A0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sweepG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bodyClip">
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* road */}
      <ellipse className="car-shadow" cx="394" cy="344" rx="340" ry="11" fill="#22262E" />
      <line x1="0" y1="344" x2="800" y2="344" stroke="#22262E" strokeOpacity=".18" strokeWidth="2" />
      <line className="road-dash" x1="0" y1="362" x2="800" y2="362" stroke="#22262E" strokeOpacity=".22" strokeWidth="3" strokeDasharray="30 26" />

      {/* chassis, axles, exhaust */}
      <g className="part" style={p(0, 170, 0, 0)}>
        <path d="M78 304 H712" stroke="#22262E" strokeWidth="7" strokeLinecap="round" />
        <path d="M78 295 H712" stroke="#6B7079" strokeWidth="3" strokeLinecap="round" />
        {[150, 310, 470, 630].map((x) => (
          <path key={x} d={`M${x} 295 V304`} stroke="#22262E" strokeWidth="4" />
        ))}
        <path d="M190 290 H565" stroke="#8A909B" strokeWidth="7" strokeLinecap="round" />
        <path d="M72 298 H38" stroke="#6B7079" strokeWidth="9" strokeLinecap="round" />
      </g>

      {/* engine */}
      <g className="part" style={p(40, -230, 40, 1.1)}>
        <rect x="625" y="252" width="86" height="46" rx="7" fill="#8A909B" stroke="#22262E" strokeWidth="2.5" />
        <rect x="632" y="240" width="72" height="14" rx="3" fill="#6B7079" stroke="#22262E" strokeWidth="2" />
        {[640, 660, 680].map((x) => (
          <rect key={x} x={x} y="242" width="13" height="12" rx="2" fill="#C8452B" stroke="#22262E" strokeWidth="2" />
        ))}
        <circle cx="668" cy="276" r="11" fill="none" stroke="#22262E" strokeWidth="3" />
      </g>

      {/* gears */}
      <g className="part" style={p(-200, -210, 200, 1.7)}>
        <g className="spin" style={{ "--sd": "6s" }}>
          <path d={gearPath(300, 262, 12, 30, 24)} fill="url(#brassG)" stroke="#22262E" strokeWidth="2.5" />
          <circle cx="300" cy="262" r="8" fill="#F4EEDD" stroke="#22262E" strokeWidth="2" />
        </g>
      </g>
      <g className="part" style={p(-120, -260, -160, 2.1)}>
        <g className="spin" style={{ "--sd": "4s", animationDirection: "reverse" }}>
          <path d={gearPath(346, 250, 9, 20, 15)} fill="url(#brassG)" stroke="#22262E" strokeWidth="2.5" />
          <circle cx="346" cy="250" r="5" fill="#F4EEDD" stroke="#22262E" strokeWidth="2" />
        </g>
      </g>
      <g className="part" style={p(-260, -120, 120, 2.5)}>
        <g className="spin" style={{ "--sd": "8s", animationDirection: "reverse" }}>
          <path d={gearPath(255, 272, 8, 15, 11)} fill="url(#brassG)" stroke="#22262E" strokeWidth="2.5" />
          <circle cx="255" cy="272" r="4" fill="#F4EEDD" stroke="#22262E" strokeWidth="2" />
        </g>
      </g>

      {/* battery */}
      <g className="part" style={p(-260, 40, -30, 2.9)}>
        <rect x="92" y="266" width="52" height="30" rx="4" fill="#2F7D5B" stroke="#22262E" strokeWidth="2.5" />
        <rect x="100" y="260" width="9" height="6" fill="#22262E" />
        <rect x="127" y="260" width="9" height="6" fill="#22262E" />
        <path d="M104 281h10M109 276v10M124 281h10" stroke="#F4EEDD" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* body shell, glass, lights */}
      <g className="part" style={p(0, -260, 0, 4.2)}>
        <path d={BODY} fill="url(#bodyG)" stroke="#22262E" strokeWidth="3" strokeLinejoin="round" />
        <g clipPath="url(#bodyClip)">
          <circle cx="190" cy="290" r="62" fill="#22262E" />
          <circle cx="565" cy="290" r="62" fill="#22262E" />
          <path d="M70 262 H718" stroke="#F7F1E3" strokeOpacity=".35" strokeWidth="2" />
          <g className="sweep"><rect x="-200" y="130" width="120" height="190" fill="url(#sweepG)" transform="skewX(-18)" /></g>
        </g>
        <path d="M228 216 C252 184 288 166 342 164 L448 164 C484 166 510 186 534 216 Z" fill="url(#glassG)" stroke="#22262E" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M392 164 V216" stroke="#22262E" strokeWidth="3" />
        <path d="M270 212 L312 172" stroke="#fff" strokeOpacity=".55" strokeWidth="6" strokeLinecap="round" />
        <path d="M392 222 V302" stroke="#22262E" strokeOpacity=".55" strokeWidth="2" />
        <rect x="330" y="244" width="30" height="5" rx="2.5" fill="#F7F1E3" stroke="#22262E" strokeWidth="1.5" />
        <rect x="440" y="244" width="30" height="5" rx="2.5" fill="#F7F1E3" stroke="#22262E" strokeWidth="1.5" />
        <path d="M520 214 l24 4 l-3 11 l-24 -4 z" fill="#9E321D" stroke="#22262E" strokeWidth="2" />
        <path d="M562 218 L664 234" stroke="#22262E" strokeOpacity=".4" strokeWidth="2" />
        <rect x="68" y="252" width="10" height="22" rx="2" fill="#FF4A3D" stroke="#22262E" strokeWidth="1.5" />
        <path d="M664 246 L708 252 Q717 254 716 265 L668 259 Z" fill="#FFD66B" stroke="#22262E" strokeWidth="2" />
        <path className="beam" d="M716 256 L800 222 L800 306 L716 268 Z" fill="url(#beamG)" />
      </g>

      {/* wheels */}
      <Wheel cx={190} style={p(-380, 0, -720, 3.4)} />
      <Wheel cx={565} style={p(380, 0, 720, 3.8)} />
    </svg>
  );
}

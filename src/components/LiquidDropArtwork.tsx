import { useId } from "react";

// Bézier contours and reflections traced from rows 01 and 04 of “Жидкая навигация
// Zapruda Community.png”. Coordinates retain the proportions of the approved sheet.
const drops = {
  "soft-liquid": {
    outline:
      "M5 54C7 34 28 16 49 10C72 3 89 8 111 15C133 22 150 27 170 25C193 24 204 16 224 18C245 20 268 31 273 47C280 66 268 78 248 82C228 85 225 84 210 91C194 100 177 105 158 102C139 101 125 94 109 90C91 85 78 86 61 90C44 95 27 93 15 84C7 78 2 66 5 54Z",
    top: "M15 44C25 25 48 13 70 13C80 13 88 16 92 20C73 15 56 23 43 29C32 35 23 39 15 44Z",
    neck: "M129 23C147 29 165 31 182 27C197 25 209 19 224 21C219 24 207 27 194 30C168 36 150 32 129 23Z",
    floor:
      "M10 67C26 89 46 90 67 83C86 76 109 82 127 88C154 98 177 102 200 90C220 80 234 78 250 76C261 73 267 67 271 60C270 76 257 80 245 82C225 84 218 88 204 95C178 109 151 103 123 94C104 87 87 83 67 90C43 98 17 90 10 67Z",
    caustic:
      "M17 75C34 87 50 89 66 84C83 78 98 81 110 84M135 93C152 100 171 102 186 98M211 89C228 81 242 82 252 77",
  },
  "organic-drop": {
    outline:
      "M5 54C9 42 22 33 42 29C55 27 62 23 75 17C91 9 104 8 120 12C139 16 151 26 170 30C188 34 203 30 223 25C242 21 256 24 270 30C284 36 294 46 295 57C297 72 286 84 270 86C252 87 240 84 222 91C207 98 201 106 180 108C161 110 147 104 132 98C117 92 102 88 87 90C70 92 58 101 43 100C26 98 14 88 8 77C2 69 2 61 5 54Z",
    top: "M15 49C21 37 38 31 53 32C45 34 38 36 30 41C24 44 19 47 15 49ZM61 31C74 19 88 14 103 14C112 14 118 16 121 19C106 17 93 21 81 26C74 29 68 31 61 31Z",
    neck: "M142 19C164 30 178 37 203 31C222 28 237 23 254 26C249 28 236 30 224 34C195 41 171 39 142 19Z",
    floor:
      "M7 66C22 87 35 93 48 91C60 89 62 83 76 84C66 89 62 96 59 99C70 96 83 89 96 88C116 85 136 98 155 100C177 104 188 103 205 94C221 84 239 79 256 80C272 82 287 74 293 62C293 76 282 84 268 86C249 87 239 85 222 92C207 99 196 109 177 109C160 109 147 104 129 97C112 91 96 88 80 92C64 96 55 101 43 100C26 98 12 87 7 66Z",
    caustic:
      "M22 91C32 97 41 100 53 99M58 98C80 93 96 88 111 92C130 97 142 105 159 106M192 105C211 99 220 88 239 88M267 85C278 84 289 78 292 70",
  },
} as const;

export function LiquidDropArtwork() {
  const instance = useId();
  return (
    <span className="z-liquid-art" aria-hidden="true">
      <span className="z-liquid-classic" />
      {Object.entries(drops).map(([style, art]) => {
        const id = instance + style;
        const paint = (name: string) => "url(#" + id + "-" + name + ")";
        const soft = style === "soft-liquid";
        return (
          <svg
            key={style}
            data-liquid-art={style}
            viewBox={soft ? "0 0 280 111" : "0 4 300 112"}
            preserveAspectRatio="none"
            focusable="false"
          >
            <defs>
              <clipPath id={id + "-shape"}>
                <path d={art.outline} />
              </clipPath>
              <linearGradient id={id + "-body"} x2=".19" y2="1">
                <stop stopColor="#4d5d31" stopOpacity=".71" />
                <stop offset=".31" stopColor="#26331a" stopOpacity=".89" />
                <stop offset=".65" stopColor="#172011" stopOpacity=".86" />
                <stop offset="1" stopColor="#4b6029" stopOpacity=".8" />
              </linearGradient>
              <linearGradient id={id + "-edge"} x2=".28" y2="1">
                <stop stopColor="#dbecaa" stopOpacity=".87" />
                <stop offset=".27" stopColor="#96a865" stopOpacity=".63" />
                <stop offset=".56" stopColor="#435736" stopOpacity=".4" />
                <stop offset=".84" stopColor="#92ad55" stopOpacity=".8" />
                <stop offset="1" stopColor="#dcf88a" stopOpacity=".94" />
              </linearGradient>
              <linearGradient id={id + "-floor"} x2=".16" y2="1">
                <stop stopColor="#394c25" stopOpacity="0" />
                <stop offset=".39" stopColor="#9ab74c" stopOpacity=".1" />
                <stop offset=".83" stopColor="#aacc50" stopOpacity=".82" />
                <stop offset="1" stopColor="#e3ff8e" />
              </linearGradient>
              <linearGradient id={id + "-sheen"} x2=".4" y2="1">
                <stop stopColor="#f4fff2" />
                <stop offset=".36" stopColor="#c9d8ad" stopOpacity=".66" />
                <stop offset="1" stopColor="#809a61" stopOpacity="0" />
              </linearGradient>
              <radialGradient id={id + "-lens"} cx=".49" cy="1.05" r=".79">
                <stop stopColor="#b3de54" stopOpacity=".74" />
                <stop offset=".32" stopColor="#829c3d" stopOpacity=".48" />
                <stop offset="1" stopColor="#42682d" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={id + "-left"} cx=".015" cy=".58" r=".59">
                <stop stopColor="#a9c66a" stopOpacity=".7" />
                <stop offset=".34" stopColor="#647e37" stopOpacity=".26" />
                <stop offset="1" stopColor="#2c4c21" stopOpacity="0" />
              </radialGradient>
              <filter id={id + "-blur"} x="-.2" y="-.6" width="1.4" height="2.2">
                <feGaussianBlur stdDeviation={soft ? "3.6" : "4.3"} />
              </filter>
              <filter id={id + "-haze"} x="-.35" y="-.85" width="1.7" height="2.7">
                <feGaussianBlur stdDeviation="10" />
              </filter>
            </defs>
            <path d={art.outline} fill="#6d912c" filter={paint("haze")} className="z-liquid-halo" />
            <path d={art.outline} fill={paint("body")} className="z-liquid-body" />
            <g clipPath={paint("shape")}>
              <path d={art.outline} fill={paint("lens")} className="z-liquid-lens" />
              <path d={art.outline} fill={paint("left")} className="z-liquid-lens" />
              <path
                d={art.floor}
                fill={paint("floor")}
                filter={paint("blur")}
                className="z-liquid-rim"
              />
              <path d={art.floor} fill={paint("floor")} className="z-liquid-floor" />
              <path
                d={art.neck}
                fill={paint("sheen")}
                filter={paint("blur")}
                className="z-liquid-sheen"
              />
              <path d={art.top} fill={paint("sheen")} className="z-liquid-specular" />
              <path
                d={art.caustic}
                fill="none"
                stroke="#d7f38d"
                strokeWidth=".8"
                className="z-liquid-caustic"
              />
            </g>
            <path
              d={art.outline}
              fill="none"
              stroke={paint("edge")}
              strokeWidth="1.05"
              vectorEffect="non-scaling-stroke"
              className="z-liquid-edge"
            />
          </svg>
        );
      })}
    </span>
  );
}

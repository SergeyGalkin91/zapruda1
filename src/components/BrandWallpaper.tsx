/** Static decorative vectors. No animation, networking or user/location data. */
export function BrandWallpaper() {
  return (
    <div className="z-wallpaper" aria-hidden="true">
      <svg
        className="z-wallpaper-threads"
        viewBox="0 0 1200 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {Array.from({ length: 15 }, (_, i) => (
          <path
            key={i}
            d={`M-200 ${180 + i * 10} C180 ${-160 + i * 20} 260 ${520 + i * 6} 620 ${160 + i * 6} S1050 ${-40 + i * 15} 1400 ${40 + i * 12} M-100 ${1020 + i * 7} C240 ${650 + i * 7} 440 ${1210 + i * 10} 850 ${780 + i * 9} S1190 ${660 + i * 6} 1400 ${780 + i * 8}`}
            stroke="currentColor"
            strokeWidth=".8"
          />
        ))}
      </svg>
      <svg
        className="z-wallpaper-topographic"
        viewBox="0 0 1200 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            d={`M-80 ${50 + i * 48} C150 ${-130 + i * 42} 220 ${330 + i * 35} 460 ${90 + i * 45} S780 ${80 + i * 32} 1010 ${-150 + i * 55} S1310 ${190 + i * 25} 1340 ${240 + i * 50} M-90 ${750 + i * 30} C280 ${430 + i * 25} 360 ${960 + i * 25} 700 ${760 + i * 30} S1060 ${1100 + i * 30} 1290 ${790 + i * 35}`}
            stroke="currentColor"
            strokeWidth=".7"
          />
        ))}
      </svg>
    </div>
  );
}

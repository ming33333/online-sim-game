import { useId } from 'react';

/**
 * Shared Werdred metro map visuals: ground gradient + rail SVG (viewBox 0 0 100 100).
 * Parent supplies `relative` + sizing + `gameChromeMapCanvas` on the wrapper.
 */
export function WerdredMapTrackLayer() {
  const gradId = useId().replace(/:/g, '');
  return (
    <>
      <div
        className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-600/30 to-transparent pointer-events-none"
        aria-hidden
      />
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.75 }}
        aria-hidden
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#374151" />
          </linearGradient>
        </defs>
        <path
          d="M 12.5 12.5 L 37.5 12.5 L 37.5 62.5 L 62.5 62.5 M 37.5 62.5 L 37.5 87.5"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[[12.5, 12.5], [20, 12.5], [27.5, 12.5], [35, 12.5]].map(([x, y], i) => (
          <line key={`t${i}`} x1={x} y1={y - 2} x2={x} y2={y + 2} stroke="#4b5563" strokeWidth="1" strokeLinecap="round" />
        ))}
        {[[37.5, 22], [37.5, 32], [37.5, 42], [37.5, 52], [37.5, 70], [37.5, 80]].map(([x, y], i) => (
          <line key={`v${i}`} x1={x - 2} y1={y} x2={x + 2} y2={y} stroke="#4b5563" strokeWidth="1" strokeLinecap="round" />
        ))}
        {[[37.5, 62.5], [42, 62.5], [50, 62.5], [58, 62.5], [62.5, 62.5]].map(([x, y], i) => (
          <line key={`h${i}`} x1={x - 2} y1={y} x2={x + 2} y2={y} stroke="#4b5563" strokeWidth="1" strokeLinecap="round" />
        ))}
      </svg>
    </>
  );
}

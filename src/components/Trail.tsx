import { Icon } from "./Icon";

export type TrailStop = { id: string; icon: string; title: string; body: string };

const TOP = 8;
const BOTTOM = 50;
const MARKER_OFFSET = 4.6; // half the marker height, as a share of the track

function layout(count: number) {
  const first = 9;
  const last = 91;
  const step = count > 1 ? (last - first) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => ({
    x: first + step * i,
    y: i % 2 === 0 ? TOP : BOTTOM,
  }));
}

/** A smooth serpentine through the stops, drawn as the road they sit on. */
function road(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  const y = (p: { y: number }) => p.y + MARKER_OFFSET;
  let d = `M ${points[0].x} ${y(points[0])}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const mid = (curr.x - prev.x) / 2;
    d += ` C ${prev.x + mid} ${y(prev)}, ${curr.x - mid} ${y(curr)}, ${curr.x} ${y(curr)}`;
  }
  return d;
}

/**
 * The journey as a path: a winding road on wide screens, a vertical trail on
 * narrow ones — see `.trail` in globals.css.
 */
export function Trail({ stops }: { stops: TrailStop[] }) {
  const points = layout(stops.length);

  return (
    <div className="trail">
      <svg className="trail-road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path
          d={road(points)}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
          strokeOpacity="0.18"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={road(points)}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="2.5"
          strokeOpacity="0.55"
          strokeDasharray="1 9"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {stops.map((stop, i) => (
        <div
          key={stop.id}
          className="trail-stop"
          style={{ "--x": `${points[i].x}%`, "--y": `${points[i].y}%` } as React.CSSProperties}
        >
          <span className="trail-marker">
            <Icon name={stop.icon} className="h-5 w-5" />
            <span className="trail-step-no">{i + 1}</span>
          </span>
          <div>
            <p className="trail-title">{stop.title}</p>
            <p className="trail-body">{stop.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

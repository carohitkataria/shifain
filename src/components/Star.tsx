import { Icon } from "./Icon";

export type StarItem = { id: string; icon: string; title: string; body: string };

type Tone = "brand" | "leaf" | "saffron";

const TONES: Record<Tone, { icon: string; hub: string; ray: string }> = {
  brand: {
    icon: "bg-brand-tint text-brand-deep",
    hub: "from-brand to-brand-deep",
    ray: "var(--color-brand)",
  },
  leaf: {
    icon: "bg-leaf-tint text-leaf",
    hub: "from-leaf to-[#268038]",
    ray: "var(--color-leaf)",
  },
  saffron: {
    icon: "bg-saffron-tint text-saffron",
    hub: "from-saffron to-[#d9761a]",
    ray: "var(--color-saffron)",
  },
};

/** Point positions on an ellipse, starting at the top and going clockwise. */
function positions(count: number) {
  const rx = 38;
  const ry = 34;
  return Array.from({ length: count }, (_, i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180);
    return { x: 50 + rx * Math.cos(angle), y: 50 + ry * Math.sin(angle) };
  });
}

/**
 * A star cluster: one hub with every feature radiating out from it on its own
 * ray. Collapses to a connected spine on narrow screens — see `.star` in
 * globals.css.
 */
export function Star({
  items,
  hubLabel,
  hubIcon = "spark",
  tone = "brand",
}: {
  items: StarItem[];
  hubLabel: string;
  hubIcon?: string;
  tone?: Tone;
}) {
  const points = positions(items.length);
  const toneStyle = TONES[tone];

  return (
    <div className="star">
      <svg className="star-rays" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {points.map((point, i) => {
          const dx = point.x - 50;
          const dy = point.y - 50;
          return (
            <line
              key={items[i].id}
              x1={50 + dx * 0.17}
              y1={50 + dy * 0.17}
              x2={50 + dx * 0.72}
              y2={50 + dy * 0.72}
              stroke={toneStyle.ray}
              strokeWidth="1"
              strokeLinecap="round"
              strokeOpacity="0.32"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      <div className="star-hub-ring" aria-hidden="true" />

      <div className="star-hub">
        <span
          className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${toneStyle.hub} text-white shadow-lg shadow-brand/20`}
        >
          <Icon name={hubIcon} className="h-7 w-7" />
        </span>
        <span className="mt-2 block text-center text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
          {hubLabel}
        </span>
      </div>

      {items.map((item, i) => (
        <div
          key={item.id}
          className="star-node"
          style={{ "--x": `${points[i].x}%`, "--y": `${points[i].y}%` } as React.CSSProperties}
        >
          <div className="flex items-center gap-3">
            <span className={`star-icon ${toneStyle.icon}`}>
              <Icon name={item.icon} className="h-5 w-5" />
            </span>
          </div>
          <div>
            <p className="star-node-title">{item.title}</p>
            <p className="star-node-body mt-1">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

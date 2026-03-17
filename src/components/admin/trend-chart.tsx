type TrendPoint = {
  label: string;
  value: number;
};

type TrendSeries = {
  color: string;
  name: string;
  points: TrendPoint[];
};

type Props = {
  description: string;
  series: TrendSeries[];
  title: string;
};

function getLinePath(points: TrendPoint[], maxValue: number) {
  if (points.length === 0) {
    return "";
  }

  const width = 320;
  const height = 120;
  const step = points.length === 1 ? width : width / (points.length - 1);

  return points
    .map((point, index) => {
      const x = index * step;
      const normalized = maxValue === 0 ? 0 : point.value / maxValue;
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function TrendChart({ description, series, title }: Props) {
  const maxValue = Math.max(
    1,
    ...series.flatMap((item) => item.points.map((point) => point.value)),
  );
  const axisLabels = series[0]?.points ?? [];

  return (
    <div className="glass-panel rounded-[1.8rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-accent-strong">
            {title}
          </p>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {series.map((item) => (
            <span key={item.name} className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[1.4rem] border border-line bg-white p-4">
        <svg viewBox="0 0 320 120" className="h-40 w-full overflow-visible">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = 120 - ratio * 120;
            return (
              <line
                key={ratio}
                x1="0"
                x2="320"
                y1={y}
                y2={y}
                stroke="#e4ddd4"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {series.map((item) => (
            <path
              key={item.name}
              d={getLinePath(item.points, maxValue)}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
          <span>{axisLabels[0]?.label}</span>
          <span>{axisLabels[Math.floor(axisLabels.length / 2)]?.label}</span>
          <span>{axisLabels[axisLabels.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type NutritionEntry = {
  time: string;
  description: string;
};

type NutritionTimelineProps = {
  entries: NutritionEntry[];
  targetCarbs?: string;
  startFrame: number;
};

export const NutritionTimeline = ({
  entries,
  targetCarbs,
  startFrame,
}: NutritionTimelineProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const headerOpacity = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 40,
          right: 40,
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Nutrition Timeline
          </div>
          {targetCarbs && (
            <div
              style={{
                backgroundColor: "rgba(234, 88, 12, 0.2)",
                border: "1px solid rgba(234, 88, 12, 0.3)",
                borderRadius: 16,
                padding: "4px 12px",
                color: "#EA580C",
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {targetCarbs}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((entry, i) => {
            const entryFrame = localFrame - 8 - i * 10;
            if (entryFrame < 0) return null;

            const slideX = spring({
              frame: entryFrame,
              fps,
              config: { damping: 18, stiffness: 140 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: "rgba(10, 10, 10, 0.8)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  opacity: interpolate(slideX, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(slideX, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    color: "#EA580C",
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "ui-monospace, monospace",
                    minWidth: 80,
                  }}
                >
                  {entry.time}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 22,
                    fontWeight: 500,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {entry.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

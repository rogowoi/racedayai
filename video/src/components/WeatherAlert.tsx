import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type WeatherAlertProps = {
  temperature: string;
  adjustments: string[];
  startFrame: number;
  position?: "top" | "bottom";
};

export const WeatherAlert = ({
  temperature,
  adjustments,
  startFrame,
  position = "top",
}: WeatherAlertProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const slideIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const positionStyle =
    position === "top"
      ? { top: 100, left: 40, right: 40 }
      : { bottom: 200, left: 40, right: 40 };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          ...positionStyle,
          opacity: interpolate(slideIn, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(slideIn, [0, 1], [20, 0])}px)`,
          backgroundColor: "rgba(120, 53, 15, 0.85)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: 14,
          padding: "18px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 28 }}>⚠️</span>
          <div
            style={{
              color: "#fef3c7",
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Heat Alert — {temperature} forecast
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {adjustments.map((adj, i) => {
            const adjFrame = localFrame - 12 - i * 8;
            if (adjFrame < 0) return null;

            const adjOpacity = interpolate(adjFrame, [0, 8], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: adjOpacity,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#f59e0b",
                  }}
                />
                <div
                  style={{
                    color: "#fde68a",
                    fontSize: 24,
                    fontWeight: 500,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {adj}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

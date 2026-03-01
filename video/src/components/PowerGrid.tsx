import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type PowerTarget = {
  label: string;
  watts: string;
  ftp: string;
  highlight?: boolean;
};

type PowerGridProps = {
  targets: PowerTarget[];
  startFrame: number;
  position?: "top" | "bottom";
};

export const PowerGrid = ({
  targets,
  startFrame,
  position = "bottom",
}: PowerGridProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const containerOpacity = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const positionStyle =
    position === "top"
      ? { top: 100, left: 40, right: 40 }
      : { bottom: 220, left: 40, right: 40 };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          ...positionStyle,
          opacity: containerOpacity,
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
            marginBottom: 10,
          }}
        >
          Bike Power Targets
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
          }}
        >
          {targets.map((target, i) => {
            const cardFrame = localFrame - i * 6;
            if (cardFrame < 0) return <div key={i} style={{ flex: 1, height: 100 }} />;

            const scale = spring({
              frame: cardFrame,
              fps,
              config: { damping: 15, stiffness: 150 },
            });

            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: target.highlight
                    ? "rgba(234, 88, 12, 0.2)"
                    : "rgba(10, 10, 10, 0.8)",
                  border: target.highlight
                    ? "1px solid rgba(234, 88, 12, 0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  padding: "12px 8px",
                  textAlign: "center",
                  transform: `scale(${scale})`,
                }}
              >
                <div
                  style={{
                    color: target.highlight
                      ? "#EA580C"
                      : "rgba(255,255,255,0.5)",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "system-ui, sans-serif",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {target.label}
                </div>
                <div
                  style={{
                    color: target.highlight ? "#EA580C" : "#ffffff",
                    fontSize: 36,
                    fontWeight: 800,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {target.watts}
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 16,
                    fontWeight: 500,
                    fontFamily: "system-ui, sans-serif",
                    marginTop: 2,
                  }}
                >
                  {target.ftp}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type SplitRow = {
  label: string;
  value: string;
};

type SplitCardProps = {
  sport: string;
  sportColor: string;
  rows: SplitRow[];
  strategy?: string;
  startFrame: number;
  position?: "top" | "center" | "bottom";
};

export const SplitCard = ({
  sport,
  sportColor,
  rows,
  strategy,
  startFrame,
  position = "bottom",
}: SplitCardProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const slideUp = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const positionStyle =
    position === "top"
      ? { top: 100, left: 40, right: 40 }
      : position === "center"
        ? { top: "50%", left: 40, right: 40, transform: "translateY(-50%)" }
        : { bottom: 200, left: 40, right: 40 };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          ...positionStyle,
          opacity: interpolate(slideUp, [0, 1], [0, 1]),
          ...(position !== "center" && {
            transform: `translateY(${interpolate(slideUp, [0, 1], [30, 0])}px)`,
          }),
          backgroundColor: "rgba(10, 10, 10, 0.85)",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "18px 22px",
          borderLeft: `4px solid ${sportColor}`,
        }}
      >
        <div
          style={{
            color: sportColor,
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {sport}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, i) => {
            const rowFrame = localFrame - 6 - i * 5;
            if (rowFrame < 0)
              return <div key={i} style={{ height: 28 }} />;

            const rowOpacity = interpolate(rowFrame, [0, 6], [0, 1], {
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: rowOpacity,
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 24,
                    fontWeight: 500,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: 26,
                    fontWeight: 700,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>

        {strategy && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
              fontSize: 20,
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              fontStyle: "italic",
            }}
          >
            {strategy}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

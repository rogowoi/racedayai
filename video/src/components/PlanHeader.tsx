import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type PlanHeaderProps = {
  finishTime: string;
  confidence: number;
  raceName?: string;
  startFrame: number;
};

export const PlanHeader = ({
  finishTime,
  confidence,
  raceName,
  startFrame,
}: PlanHeaderProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const slideUp = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const confidenceOpacity = interpolate(
    localFrame,
    [20, 30],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const confidenceColor =
    confidence >= 80 ? "#22c55e" : confidence >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 40,
          right: 40,
          opacity: interpolate(slideUp, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(slideUp, [0, 1], [30, 0])}px)`,
          backgroundColor: "rgba(10, 10, 10, 0.85)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "20px 24px",
        }}
      >
        {raceName && (
          <div
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 20,
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 4,
            }}
          >
            {raceName}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div
              style={{
                color: "#EA580C",
                fontSize: 18,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              Predicted Finish
            </div>
            <div
              style={{
                color: "#ffffff",
                fontSize: 56,
                fontWeight: 800,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: -1,
              }}
            >
              {finishTime}
            </div>
          </div>

          <div
            style={{
              opacity: confidenceOpacity,
              backgroundColor: `${confidenceColor}20`,
              border: `1px solid ${confidenceColor}40`,
              borderRadius: 20,
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: confidenceColor,
              }}
            />
            <span
              style={{
                color: confidenceColor,
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {confidence}%{" "}
              {confidence >= 80 ? "High" : confidence >= 50 ? "Med" : "Low"}
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

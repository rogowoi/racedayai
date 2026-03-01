import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type WarningBadgeProps = {
  text: string;
  startFrame: number;
};

export const WarningBadge = ({ text, startFrame }: WarningBadgeProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 12, stiffness: 200 },
  });

  const pulse = Math.sin(localFrame * 0.15) * 0.05 + 1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 40,
          right: 40,
          transform: `scale(${scale * pulse})`,
          backgroundColor: "rgba(220, 38, 38, 0.85)",
          borderRadius: 12,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 36,
            lineHeight: 1,
          }}
        >
          ⚠
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 34,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.2,
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
} from "remotion";

type BrandBarProps = {
  showFrom?: number;
};

export const BrandBar = ({ showFrom = 0 }: BrandBarProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - showFrom;
  if (localFrame < 0) return null;

  const opacity = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          opacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {/* Orange accent line */}
        <div
          style={{
            width: 40,
            height: 3,
            backgroundColor: "#EA580C",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            color: "#ffffff",
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 1,
          }}
        >
          RaceDayAI
        </div>
        <div
          style={{
            width: 40,
            height: 3,
            backgroundColor: "#EA580C",
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

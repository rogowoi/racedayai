import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type DataOverlayProps = {
  text: string;
  subtext?: string;
  position?: "top" | "center" | "bottom";
  startFrame: number;
};

export const DataOverlay = ({
  text,
  subtext,
  position = "bottom",
  startFrame,
}: DataOverlayProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const slideUp = spring({
    frame: localFrame,
    fps,
    config: { damping: 20, stiffness: 120 },
  });

  const opacity = interpolate(localFrame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  const positionStyle =
    position === "top"
      ? { top: 120, left: 40, right: 40 }
      : position === "center"
        ? { top: "50%", left: 40, right: 40, transform: "translateY(-50%)" }
        : { bottom: 200, left: 40, right: 40 };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          ...positionStyle,
          opacity,
          transform: `translateY(${interpolate(slideUp, [0, 1], [30, 0])}px)`,
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          borderLeft: "3px solid #EA580C",
          borderRadius: 8,
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 42,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1.2,
          }}
        >
          {text}
        </div>
        {subtext && (
          <div
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 28,
              fontWeight: 400,
              fontFamily: "system-ui, sans-serif",
              marginTop: 6,
            }}
          >
            {subtext}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

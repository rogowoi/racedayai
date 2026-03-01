import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TextReveal } from "./TextReveal";

type CTASlideProps = {
  headline: string;
  subtext?: string;
  startFrame?: number;
};

export const CTASlide = ({
  headline,
  subtext,
  startFrame = 0,
}: CTASlideProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const bgOpacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  const logoScale = spring({
    frame: Math.max(0, localFrame - 30),
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const subtextOpacity = interpolate(
    localFrame,
    [45, 60],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(0, 0, 0, ${bgOpacity * 0.9})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <TextReveal
        text={headline}
        startFrame={startFrame + 10}
        fontSize={56}
        color="#ffffff"
        align="center"
      />

      {subtext && (
        <div
          style={{
            marginTop: 30,
            opacity: subtextOpacity,
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: 32,
            fontWeight: 400,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          {subtext}
        </div>
      )}

      {/* Logo */}
      <div
        style={{
          marginTop: 60,
          transform: `scale(${logoScale})`,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
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
            color: "#EA580C",
            fontSize: 36,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: 2,
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

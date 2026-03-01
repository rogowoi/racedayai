import {
  AbsoluteFill,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
  spring,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CinematicClip } from "../components/CinematicClip";
import { DataOverlay } from "../components/DataOverlay";
import { TextReveal } from "../components/TextReveal";
import { BrandBar } from "../components/BrandBar";

type FirstTriathlonProps = {
  nervousClipSrc: string;
  finishClipSrc: string;
};

// Race plan breakdown — mimics the app's per-sport plan view
const PlanBreakdown = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const segments = [
    {
      sport: "SWIM",
      color: "#0EA5E9",
      distance: "1.9 km",
      target: "1:45/100m",
      time: "33 min",
    },
    {
      sport: "T1",
      color: "#6B7280",
      distance: "",
      target: "Quick change",
      time: "2 min",
    },
    {
      sport: "BIKE",
      color: "#EA580C",
      distance: "90 km",
      target: "195W",
      time: "2:38",
    },
    {
      sport: "T2",
      color: "#6B7280",
      distance: "",
      target: "Rack & go",
      time: "1 min",
    },
    {
      sport: "RUN",
      color: "#10B981",
      distance: "21.1 km",
      target: "5:15/km",
      time: "1:51",
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          marginBottom: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: "#EA580C",
            fontSize: 16,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 2,
            fontFamily: "system-ui, sans-serif",
            marginBottom: 6,
          }}
        >
          Your AI Race Plan
        </div>
        <TextReveal
          text="Every step, mapped out"
          startFrame={5}
          fontSize={38}
          color="rgba(255,255,255,0.6)"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
        }}
      >
        {segments.map((seg, i) => {
          const segDelay = 15 + i * 12;
          const localFrame = frame - segDelay;
          if (localFrame < 0) return <div key={i} style={{ height: 64 }} />;

          const slideIn = spring({
            frame: localFrame,
            fps,
            config: { damping: 18, stiffness: 140 },
          });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderLeft: `4px solid ${seg.color}`,
                borderRadius: 10,
                padding: "12px 16px",
                opacity: interpolate(slideIn, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(slideIn, [0, 1], [60, 0])}px)`,
              }}
            >
              <div
                style={{
                  minWidth: 60,
                  color: seg.color,
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {seg.sport}
              </div>
              <div style={{ flex: 1 }}>
                {seg.distance && (
                  <div
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 18,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {seg.distance}
                  </div>
                )}
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 22,
                    fontWeight: 600,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {seg.target}
                </div>
              </div>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 26,
                  fontWeight: 800,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {seg.time}
              </div>
            </div>
          );
        })}
      </div>

      <BrandBar showFrom={80} />
    </AbsoluteFill>
  );
};

export const FirstTriathlon = ({
  nervousClipSrc,
  finishClipSrc,
}: FirstTriathlonProps) => {
  const { fps } = useVideoConfig();

  const shotDuration = 5 * fps;
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {/* Shot 1: Nervous athlete — anxiety text */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={nervousClipSrc} overlayOpacity={0.35} />
            <DataOverlay
              text="First race. No idea what to expect."
              subtext="You need a plan."
              position="center"
              startFrame={Math.round(1 * fps)}
            />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 2: Plan breakdown — per-sport targets */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <PlanBreakdown />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 3: Crossing finish line */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={finishClipSrc} overlayOpacity={0.2} />
            <DataOverlay
              text="Your first race. Nailed it."
              subtext="racedayai.com"
              position="center"
              startFrame={Math.round(0.8 * fps)}
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

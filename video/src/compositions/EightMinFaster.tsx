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
import { PlanHeader } from "../components/PlanHeader";
import { BrandBar } from "../components/BrandBar";

type EightMinFasterProps = {
  trainingClipSrc: string;
  raceClipSrc: string;
  finishClipSrc: string;
};

// Race execution ticker — metrics hitting targets one by one
const ExecutionTicker = ({ startFrame }: { startFrame: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const metrics = [
    { label: "Power", value: "195W", target: "73% FTP", delay: 0 },
    { label: "Nutrition", value: "On plan", target: "75g carbs/hr", delay: 12 },
    { label: "Hydration", value: "On plan", target: "500ml/hr", delay: 24 },
    { label: "Pace", value: "5:15/km", target: "On target", delay: 36 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 200,
        left: 40,
        right: 40,
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 16,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 2,
          fontFamily: "system-ui, sans-serif",
          marginBottom: 10,
        }}
      >
        Race Execution
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {metrics.map((metric, i) => {
          const metricFrame = localFrame - metric.delay;
          if (metricFrame < 0) return null;

          const slideIn = spring({
            frame: metricFrame,
            fps,
            config: { damping: 18, stiffness: 140 },
          });

          const checkFrame = metricFrame - 8;
          const checkOpacity =
            checkFrame > 0
              ? interpolate(checkFrame, [0, 6], [0, 1], {
                  extrapolateRight: "clamp",
                })
              : 0;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(10,10,10,0.8)",
                borderLeft: "3px solid #EA580C",
                borderRadius: 8,
                padding: "8px 14px",
                opacity: interpolate(slideIn, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(slideIn, [0, 1], [40, 0])}px)`,
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 20,
                  fontWeight: 500,
                  fontFamily: "system-ui, sans-serif",
                  minWidth: 110,
                }}
              >
                {metric.label}
              </span>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: "ui-monospace, monospace",
                  flex: 1,
                }}
              >
                {metric.value}
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 18,
                  fontFamily: "system-ui, sans-serif",
                  marginRight: 8,
                }}
              >
                {metric.target}
              </span>
              <span
                style={{
                  color: "#22c55e",
                  fontSize: 22,
                  fontWeight: 800,
                  opacity: checkOpacity,
                }}
              >
                ✓
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const EightMinFaster = ({
  trainingClipSrc,
  raceClipSrc,
  finishClipSrc,
}: EightMinFasterProps) => {
  const { fps } = useVideoConfig();

  const shotDuration = 5 * fps;
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {/* Shot 1: Training — "months of work" */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={trainingClipSrc} overlayOpacity={0.35} />
            <DataOverlay
              text="Months of training."
              subtext="Now execute it perfectly."
              position="center"
              startFrame={Math.round(1 * fps)}
            />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 2: Race execution — metrics ticking ✓ */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={raceClipSrc} overlayOpacity={0.3} />
            <ExecutionTicker startFrame={Math.round(0.3 * fps)} />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 3: Finish — PR reveal with plan header */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={finishClipSrc} overlayOpacity={0.3} />
            <PlanHeader
              finishTime="5:12:43"
              confidence={92}
              startFrame={Math.round(0.5 * fps)}
            />
            <DataOverlay
              text="8 minutes faster. New PR."
              position="bottom"
              startFrame={Math.round(2 * fps)}
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

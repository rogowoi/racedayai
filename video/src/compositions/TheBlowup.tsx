import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CinematicClip } from "../components/CinematicClip";
import { WarningBadge } from "../components/WarningBadge";
import { FailureOverlay } from "../components/FailureOverlay";
import { CTASlide } from "../components/CTASlide";

type TheBlowupProps = {
  strainClipSrc: string;
  bonkClipSrc: string;
};

export const TheBlowup = ({ strainClipSrc, bonkClipSrc }: TheBlowupProps) => {
  const { fps } = useVideoConfig();

  const shotDuration = 5 * fps;
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {/* Shot 1: Cyclist straining — over target power, burning matches */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={strainClipSrc} overlayOpacity={0.3} />
            <WarningBadge
              text="240W — 25W over target"
              startFrame={Math.round(0.8 * fps)}
            />
            <FailureOverlay
              startFrame={Math.round(2 * fps)}
              items={[
                {
                  title: "Blows up at km 60",
                  detail: "Went 15W over target on first climb",
                },
              ]}
            />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 2: Runner bonking — missed fueling, walking */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={bonkClipSrc} overlayOpacity={0.35} />
            <FailureOverlay
              startFrame={Math.round(0.5 * fps)}
              items={[
                {
                  title: "Bonked at mile 13",
                  detail: "Missed 2 fueling windows on bike",
                },
                {
                  title: "Walks the last 5K",
                  detail: "Didn't adjust for 31°C heat",
                },
              ]}
              result="+32 min slower than potential"
            />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 3: CTA */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <CTASlide
            headline="Your race plan should've prevented this."
            subtext="racedayai.com — Build yours in 3 minutes"
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

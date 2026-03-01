import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CinematicClip } from "../components/CinematicClip";
import { NutritionTimeline } from "../components/NutritionTimeline";
import { SplitCard } from "../components/SplitCard";
import { DataOverlay } from "../components/DataOverlay";
import { BrandBar } from "../components/BrandBar";

type NeverBonkProps = {
  gelClipSrc: string;
  aidStationClipSrc: string;
  strongRunnerClipSrc: string;
};

export const NeverBonk = ({
  gelClipSrc,
  aidStationClipSrc,
  strongRunnerClipSrc,
}: NeverBonkProps) => {
  const { fps } = useVideoConfig();

  const shotDuration = 5 * fps;
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {/* Shot 1: Grabbing gel — nutrition timeline overlay */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={gelClipSrc} overlayOpacity={0.25} />
            <NutritionTimeline
              targetCarbs="75g carbs/hr"
              entries={[
                { time: "T+0:15", description: "Gel #1 + 250ml water" },
                { time: "T+0:40", description: "Gel #2 + electrolytes" },
                { time: "T+1:05", description: "Gel #3 (60g total)" },
              ]}
              startFrame={Math.round(0.5 * fps)}
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 2: Aid station — hydration plan card */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={aidStationClipSrc} overlayOpacity={0.2} />
            <SplitCard
              sport="HYDRATION PLAN"
              sportColor="#0EA5E9"
              rows={[
                { label: "Bike", value: "500ml/hr" },
                { label: "Run", value: "200ml/hr" },
                { label: "Sodium", value: "800mg/hr" },
              ]}
              strategy="Timed nutrition = zero GI issues"
              startFrame={Math.round(0.8 * fps)}
              position="bottom"
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 3: Strong runner — fueled by data */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={strongRunnerClipSrc} overlayOpacity={0.25} />
            <DataOverlay
              text="Fueled by data, not guesswork."
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

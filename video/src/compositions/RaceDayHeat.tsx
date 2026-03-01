import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CinematicClip } from "../components/CinematicClip";
import { WeatherAlert } from "../components/WeatherAlert";
import { SplitCard } from "../components/SplitCard";
import { DataOverlay } from "../components/DataOverlay";
import { BrandBar } from "../components/BrandBar";

type RaceDayHeatProps = {
  heatClipSrc: string;
  controlledClipSrc: string;
  strongFinishClipSrc: string;
};

export const RaceDayHeat = ({
  heatClipSrc,
  controlledClipSrc,
  strongFinishClipSrc,
}: RaceDayHeatProps) => {
  const { fps } = useVideoConfig();

  const shotDuration = 5 * fps;
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {/* Shot 1: Scorching heat — weather alert card */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={heatClipSrc} overlayOpacity={0.15} />
            <WeatherAlert
              temperature="31°C"
              adjustments={[
                "Power target reduced by 5%",
                "Sodium increased to 800mg/hr",
                "Hydration: start 15 min earlier",
              ]}
              startFrame={Math.round(0.8 * fps)}
              position="top"
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 2: Cyclist controlled — adjusted plan card */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={controlledClipSrc} overlayOpacity={0.2} />
            <SplitCard
              sport="AI-ADJUSTED BIKE"
              sportColor="#f59e0b"
              rows={[
                { label: "Power", value: "185W (-5%)" },
                { label: "Sodium", value: "800mg/hr" },
                { label: "Fluid", value: "750ml/hr" },
              ]}
              strategy="Heat protocol: lower effort, higher intake"
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

        {/* Shot 3: Finishing strong — success result */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={strongFinishClipSrc} overlayOpacity={0.25} />
            <DataOverlay
              text="Adapted. Finished strong."
              subtext="Others walked — your plan adjusted."
              position="center"
              startFrame={Math.round(1 * fps)}
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

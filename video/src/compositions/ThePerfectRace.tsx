import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { CinematicClip } from "../components/CinematicClip";
import { SplitCard } from "../components/SplitCard";
import { PowerGrid } from "../components/PowerGrid";
import { PlanHeader } from "../components/PlanHeader";
import { BrandBar } from "../components/BrandBar";

type ThePerfectRaceProps = {
  swimClipSrc: string;
  bikeClipSrc: string;
  finishClipSrc: string;
};

export const ThePerfectRace = ({
  swimClipSrc,
  bikeClipSrc,
  finishClipSrc,
}: ThePerfectRaceProps) => {
  const { fps } = useVideoConfig();

  const shotDuration = 5 * fps;
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        {/* Shot 1: Swim — show swim split card */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={swimClipSrc} overlayOpacity={0.2} />
            <SplitCard
              sport="SWIM — 1.9 km"
              sportColor="#0EA5E9"
              rows={[
                { label: "Target Pace", value: "1:45/100m" },
                { label: "Est. Time", value: "33:15" },
              ]}
              strategy="Steady effort, draft when possible"
              startFrame={Math.round(1 * fps)}
              position="bottom"
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionDuration })}
        />

        {/* Shot 2: Bike — show power grid (Flats/Hills/Descents) */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={bikeClipSrc} overlayOpacity={0.25} />
            <PowerGrid
              targets={[
                { label: "Flats", watts: "195W", ftp: "73% FTP" },
                {
                  label: "Hills",
                  watts: "210W",
                  ftp: "79% FTP",
                  highlight: true,
                },
                { label: "Descents", watts: "165W", ftp: "62% FTP" },
              ]}
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

        {/* Shot 3: Finish — predicted time + confidence */}
        <TransitionSeries.Sequence durationInFrames={shotDuration}>
          <AbsoluteFill>
            <CinematicClip src={finishClipSrc} overlayOpacity={0.3} />
            <PlanHeader
              raceName="IRONMAN 70.3 Dubai"
              finishTime="5:12:43"
              confidence={92}
              startFrame={Math.round(0.5 * fps)}
            />
            <BrandBar showFrom={0} />
          </AbsoluteFill>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

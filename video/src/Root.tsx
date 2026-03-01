import { Composition, Folder } from "remotion";
import { TheBlowup } from "./compositions/TheBlowup";
import { ThePerfectRace } from "./compositions/ThePerfectRace";
import { RaceDayHeat } from "./compositions/RaceDayHeat";
import { FirstTriathlon } from "./compositions/FirstTriathlon";
import { NeverBonk } from "./compositions/NeverBonk";
import { EightMinFaster } from "./compositions/EightMinFaster";

// 9:16 vertical (TikTok/Reels)
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 15 * FPS; // 15 seconds

export const RemotionRoot = () => {
  return (
    <Folder name="Ads">
      {/* V1: The Blowup — Pain/Problem */}
      <Composition
        id="TheBlowup"
        component={TheBlowup}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          strainClipSrc: "stock-cyclist-climb.mp4",
          bonkClipSrc: "stock-runner-tired.mp4",
        }}
      />

      {/* V2: The Perfect Race — Aspiration */}
      <Composition
        id="ThePerfectRace"
        component={ThePerfectRace}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          swimClipSrc: "stock-swim-ocean.mp4",
          bikeClipSrc: "stock-cyclist-road.mp4",
          finishClipSrc: "stock-marathon-finish.mp4",
        }}
      />

      {/* V3: Race Day Heat — Weather Feature */}
      <Composition
        id="RaceDayHeat"
        component={RaceDayHeat}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          heatClipSrc: "stock-runner-beach.mp4",
          controlledClipSrc: "stock-cyclist-golden.mp4",
          strongFinishClipSrc: "stock-runner-tropical.mp4",
        }}
      />

      {/* V4: Your First Triathlon — Beginner */}
      <Composition
        id="FirstTriathlon"
        component={FirstTriathlon}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          nervousClipSrc: "stock-athlete-prep.mp4",
          finishClipSrc: "stock-marathon-finish.mp4",
        }}
      />

      {/* V5: Never Bonk Again — Nutrition Feature */}
      <Composition
        id="NeverBonk"
        component={NeverBonk}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          gelClipSrc: "stock-cyclist-road.mp4",
          aidStationClipSrc: "stock-drinking-water.mp4",
          strongRunnerClipSrc: "stock-runner-strong.mp4",
        }}
      />

      {/* V6: 8 Minutes Faster — PR/Result */}
      <Composition
        id="EightMinFaster"
        component={EightMinFaster}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          trainingClipSrc: "stock-pool-swim.mp4",
          raceClipSrc: "stock-cyclist-aerial.mp4",
          finishClipSrc: "stock-marathon-finish.mp4",
        }}
      />
    </Folder>
  );
};

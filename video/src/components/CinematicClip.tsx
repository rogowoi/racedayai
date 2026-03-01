import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";

type CinematicClipProps = {
  src: string;
  overlayOpacity?: number;
};

export const CinematicClip = ({
  src,
  overlayOpacity = 0.15,
}: CinematicClipProps) => {
  return (
    <AbsoluteFill>
      <Video
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        muted
      />
      {/* Subtle dark overlay for text readability */}
      <AbsoluteFill
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
      />
    </AbsoluteFill>
  );
};

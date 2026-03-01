import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type TextRevealProps = {
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  style?: React.CSSProperties;
};

export const TextReveal = ({
  text,
  startFrame,
  fontSize = 48,
  color = "#ffffff",
  align = "center",
  style,
}: TextRevealProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent:
          align === "center"
            ? "center"
            : align === "right"
              ? "flex-end"
              : "flex-start",
        gap: "0 12px",
        ...style,
      }}
    >
      {words.map((word, i) => {
        const wordDelay = startFrame + i * 3;
        const localFrame = frame - wordDelay;
        if (localFrame < 0) return <span key={i} style={{ opacity: 0, fontSize }}>{word}</span>;

        const progress = spring({
          frame: localFrame,
          fps,
          config: { damping: 20, stiffness: 150 },
        });

        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight: 700,
              fontFamily: "system-ui, sans-serif",
              color,
              opacity: progress,
              transform: `translateY(${interpolate(progress, [0, 1], [15, 0])}px)`,
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

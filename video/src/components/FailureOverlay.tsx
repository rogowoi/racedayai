import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type FailureItem = {
  title: string;
  detail: string;
};

type FailureOverlayProps = {
  items: FailureItem[];
  result?: string;
  startFrame: number;
};

export const FailureOverlay = ({
  items,
  result,
  startFrame,
}: FailureOverlayProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  const containerOpacity = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 180,
          left: 40,
          right: 40,
          opacity: containerOpacity,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => {
            const itemFrame = localFrame - 5 - i * 12;
            if (itemFrame < 0) return null;

            const slideIn = spring({
              frame: itemFrame,
              fps,
              config: { damping: 18, stiffness: 140 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  backgroundColor: "rgba(127, 29, 29, 0.8)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  opacity: interpolate(slideIn, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(slideIn, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1.2 }}>⚠</span>
                <div>
                  <div
                    style={{
                      color: "#fca5a5",
                      fontSize: 24,
                      fontWeight: 700,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      color: "rgba(252, 165, 165, 0.6)",
                      fontSize: 20,
                      fontWeight: 400,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {item.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {result && (
          <div
            style={{
              marginTop: 12,
              backgroundColor: "rgba(10, 10, 10, 0.8)",
              borderRadius: 10,
              padding: "10px 16px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: interpolate(
                localFrame - 5 - items.length * 12,
                [0, 10],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 22,
                fontWeight: 500,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Result:
            </span>
            <span
              style={{
                color: "#ef4444",
                fontSize: 26,
                fontWeight: 800,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {result}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

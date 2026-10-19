import { ReactNode, useCallback, useEffect, useRef } from "react";

const W = 300;
const H = 150;
const BRUSH = 36;
const REVEAL_FRACTION = 0.45;

interface Props {
  /** Shown under the foil once the server has returned the range. Null until then. */
  reveal: ReactNode | null;
  /** True once the server confirmed the reveal: the foil is removed completely. */
  cleared: boolean;
  /** Called once when enough foil is scratched off (or the button is pressed). */
  onScratched: () => void;
}

/** Canvas scratch foil. The range is not in the page until the server's scratch call has succeeded. */
export function ScratchCard({ reveal, cleared, onScratched }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const fired = useRef(false);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#b8c2c6");
    g.addColorStop(0.5, "#e6ecee");
    g.addColorStop(1, "#a9b4b9");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#4a5a60";
    ctx.font = "800 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scratch here", W / 2, H / 2 + 8);
  }, []);

  const fire = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    onScratched();
  }, [onScratched]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const scratchTo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !drawing.current) return;
    const p = point(e);
    const from = last.current ?? p;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = BRUSH;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    moves.current += 1;
    if (moves.current % 6 === 0 && !fired.current) {
      const px = ctx.getImageData(0, 0, W, H).data;
      let clear = 0;
      for (let i = 3; i < px.length; i += 16) if (px[i] === 0) clear += 1;
      if (clear / (px.length / 16) >= REVEAL_FRACTION) fire();
    }
  };

  return (
    <div>
      <div className="scratchwrap">
        <div className="scratchunder" aria-live="polite">
          {reveal ?? <p className="muted">Your reward is under the foil</p>}
        </div>
        {!cleared && (
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="scratchfoil"
            aria-hidden="true"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              last.current = null;
              scratchTo(e);
            }}
            onPointerMove={scratchTo}
            onPointerUp={() => { drawing.current = false; last.current = null; }}
            onPointerCancel={() => { drawing.current = false; last.current = null; }}
          />
        )}
      </div>
      {!cleared && (
        <p>
          <button type="button" className="linkbutton" onClick={fire}>Reveal without scratching</button>
        </p>
      )}
    </div>
  );
}

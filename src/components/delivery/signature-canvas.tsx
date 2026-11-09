"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eraser, PenLine, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

/**
 * Quadro de assinatura para tablet.
 *
 * Eventos de toque:
 * - Usamos Pointer Events (onPointerDown/Move/Up) em vez de mouse + touch
 *   separados. O navegador unifica dedo, caneta stylus e mouse no mesmo evento,
 *   então o mesmo código atende todos os dispositivos.
 * - `setPointerCapture` "prende" o ponteiro ao canvas: se o dedo sair da área
 *   durante o traço, os eventos continuam chegando e a linha não é cortada.
 * - `touch-action: none` impede que o gesto de desenhar role a página.
 * - `preventDefault` evita seleção de texto/scroll acidental no tablet.
 *
 * Captura em Base64:
 * - Ao soltar o dedo, `canvas.toDataURL("image/png")` gera um data URL
 *   (`data:image/png;base64,...`) que é enviado ao Server Action e validado no
 *   Zod/servidor. O canvas é resolvido em devicePixelRatio para o traço ficar
 *   nítido em telas retina, mas as coordenadas continuam em pixels CSS.
 */
export function SignatureCanvas({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const strokeWidthRef = useRef(2.5);
  const drawnValueRef = useRef<string | null>(null);

  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [hasInk, setHasInk] = useState(false);

  /** Reaplica configuração do contexto (a cor acompanha o tema atual). */
  const configureContext = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const color = getComputedStyle(canvas).color || "#0f172a";
    ctx.lineWidth = strokeWidthRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    return ctx;
  }, []);

  /**
   * Ajusta a resolução interna do canvas ao tamanho CSS e ao devicePixelRatio.
   * O snapshot preserva o que já foi desenhado quando a tela gira (tablet em
   * paisagem/retrato) ou o teclado virtual altera o layout.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const configure = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const snapshot = canvas.width > 0 ? canvas.toDataURL() : null;

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      configureContext(canvas);

      if (snapshot) {
        const image = new Image();
        image.onload = () => {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        };
        image.src = snapshot;
      }
    };

    configure();
    const observer = new ResizeObserver(configure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [configureContext]);

  /** Restaura a assinatura quando o canvas volta a montar (troca de aba). */
  useEffect(() => {
    if (value === drawnValueRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!value) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      drawnValueRef.current = "";
      setHasInk(false);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      drawnValueRef.current = value;
      setHasInk(true);
    };
    image.src = value;
  }, [value]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !event.isPrimary) return;
    event.preventDefault();

    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);

    const point = pointFromEvent(event);
    const ctx = configureContext(canvas);
    if (!ctx) return;

    drawingRef.current = true;
    lastPointRef.current = point;

    // Um toque simples sem arrastar também deixa um ponto de tinta.
    ctx.beginPath();
    ctx.arc(point.x, point.y, strokeWidthRef.current / 2, 0, Math.PI * 2);
    ctx.fill();

    setHasInk(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !event.isPrimary) return;
    event.preventDefault();

    const last = lastPointRef.current;
    if (!last) return;

    const point = pointFromEvent(event);
    const ctx = configureContext(event.currentTarget);
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    lastPointRef.current = null;

    const canvas = event.currentTarget;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (!hasInk && canvas.width === 0) return;

    // PNG transparente em Base64; o servidor valida o prefixo data:image/.
    const dataUrl = canvas.toDataURL("image/png");
    drawnValueRef.current = dataUrl;
    onChange(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    drawingRef.current = false;
    lastPointRef.current = null;
    drawnValueRef.current = "";
    setHasInk(false);
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-fg">
          <PenLine className="h-4 w-4 text-brand-strong" />
          Assine com o dedo ou caneta
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3">
            <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden="true" />
            <span className="sr-only">Espessura do traço</span>
            <input
              type="range"
              min={1}
              max={6}
              step={0.5}
              value={strokeWidth}
              onChange={(event) => {
                const next = Number(event.target.value);
                setStrokeWidth(next);
                strokeWidthRef.current = next;
              }}
              className="h-12 w-28 accent-brand sm:w-36"
              aria-label="Espessura do traço"
            />
            <span className="w-12 text-right text-xs font-semibold tabular-nums text-muted">
              {strokeWidth.toFixed(1)} px
            </span>
          </label>

          <button
            type="button"
            onClick={clear}
            disabled={disabled || !hasInk}
            className="flex h-12 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-fg active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface transition",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <canvas
          ref={canvasRef}
          className="relative z-10 block h-56 w-full touch-none cursor-crosshair sm:h-64"
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          aria-label="Área de assinatura digital"
          role="img"
        />

        {!hasInk ? (
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center gap-2 text-subtle">
            <PenLine className="h-7 w-7" />
            <p className="text-sm font-medium">Assine aqui</p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-8 left-6 right-6 z-0 border-b border-dashed border-line" />
      </div>

      <p className="text-xs text-muted">
        A imagem é capturada em Base64 ao soltar o dedo. Use o botão “Limpar” para refazer o
        traço.
      </p>
    </div>
  );
}

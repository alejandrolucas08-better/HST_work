"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Delete, Eraser, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_DIGITS = 6;

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * Teclado numérico virtual com alvos de 64px, vibração e tom curto.
 *
 * O PIN nunca é comparado no cliente: o servidor recebe o valor e confere o
 * hash bcrypt. Aqui fazemos apenas feedback visual/sonoro e limitamos o
 * tamanho para evitar digitação acidental.
 */
export function PinNumpad({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [sound, setSound] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      void audioRef.current?.close();
      audioRef.current = null;
    };
  }, []);

  const feedback = useCallback(() => {
    // Vibração é opcional no navegador (iOS não implementa; Android sim).
    navigator.vibrate?.(10);
    if (!sound) return;

    try {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;

      const ctx = audioRef.current ?? new AudioCtor();
      audioRef.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.value = 640 + value.length * 18;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.09);
    } catch {
      // Áudio é um extra; se o navegador bloquear, a validação continua.
    }
  }, [sound, value.length]);

  const pressDigit = (digit: string) => {
    if (disabled || value.length >= MAX_DIGITS) return;
    feedback();
    onChange(`${value}${digit}`);
  };

  const backspace = () => {
    if (disabled || value.length === 0) return;
    feedback();
    onChange(value.slice(0, -1));
  };

  const clear = () => {
    if (disabled || value.length === 0) return;
    feedback();
    onChange("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-fg">Digite o PIN pessoal</p>
        <button
          type="button"
          onClick={() => setSound((current) => !current)}
          aria-pressed={sound}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:bg-surface-muted hover:text-fg active:scale-95"
          title={sound ? "Desativar som das teclas" : "Ativar som das teclas"}
        >
          {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          <span className="sr-only">{sound ? "Desativar som" : "Ativar som"}</span>
        </button>
      </div>

      <motion.div
        animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "flex min-h-20 items-center justify-center gap-2.5 rounded-2xl border-2 bg-surface-muted px-4 py-4 sm:gap-3",
          error ? "border-danger" : "border-line",
        )}
        role="status"
        aria-live="polite"
        aria-label={`${value.length} de ${MAX_DIGITS} dígitos informados`}
        aria-invalid={Boolean(error)}
      >
        {Array.from({ length: MAX_DIGITS }).map((_, index) => {
          const filled = index < value.length;
          return (
            <motion.span
              key={index}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg font-bold sm:h-12 sm:w-12",
                filled
                  ? "border-brand bg-brand text-brand-contrast"
                  : "border-line-strong bg-surface text-subtle",
              )}
              animate={filled ? { scale: [0.8, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.18 }}
            >
              {filled ? "•" : ""}
            </motion.span>
          );
        })}
      </motion.div>

      {error ? (
        <p className="text-center text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-center text-xs text-muted">
          PIN de 4 a 6 dígitos. A validação do hash acontece no servidor.
        </p>
      )}

      <div className="mx-auto grid max-w-md grid-cols-3 gap-2.5 sm:gap-3" role="group" aria-label="Teclado numérico do PIN">
        {keys.map((key) => (
          <motion.button
            key={key}
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => pressDigit(key)}
            disabled={disabled || value.length >= MAX_DIGITS}
            className="flex h-16 select-none items-center justify-center rounded-2xl border border-line bg-surface text-2xl font-bold text-fg shadow-sm transition hover:bg-surface-muted active:bg-brand-soft disabled:opacity-40 sm:h-[4.25rem]"
            aria-label={`Dígito ${key}`}
          >
            {key}
          </motion.button>
        ))}

        <motion.button
          type="button"
          whileTap={{ scale: 0.93 }}
          onClick={clear}
          disabled={disabled || value.length === 0}
          className="flex h-16 items-center justify-center rounded-2xl border border-line bg-surface text-warning-strong transition hover:bg-warning-soft disabled:opacity-40 sm:h-[4.25rem]"
          aria-label="Limpar PIN"
        >
          <Eraser className="h-6 w-6" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.93 }}
          onClick={() => pressDigit("0")}
          disabled={disabled || value.length >= MAX_DIGITS}
          className="flex h-16 items-center justify-center rounded-2xl border border-line bg-surface text-2xl font-bold text-fg shadow-sm transition hover:bg-surface-muted disabled:opacity-40 sm:h-[4.25rem]"
          aria-label="Dígito 0"
        >
          0
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.93 }}
          onClick={backspace}
          disabled={disabled || value.length === 0}
          className="flex h-16 items-center justify-center rounded-2xl border border-line bg-surface text-muted transition hover:bg-surface-muted hover:text-fg disabled:opacity-40 sm:h-[4.25rem]"
          aria-label="Apagar último dígito"
        >
          <Delete className="h-6 w-6" />
        </motion.button>
      </div>
    </div>
  );
}

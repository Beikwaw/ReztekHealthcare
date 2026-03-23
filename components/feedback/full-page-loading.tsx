import { HeartPulse } from "lucide-react"

type FullPageLoadingProps = {
  text?: string
  subtitle?: string
}

/**
 * Medical-themed full-page loader: clinical gradient, glass card, heartbeat pulse, animated ECG strip.
 */
export function FullPageLoading({
  text = "Reztek Healthcare",
  subtitle = "Preparing your clinical workspace…",
}: FullPageLoadingProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0c1222] via-[#0f2847] to-[#0d3d3d] text-white">
      {/* Soft radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.55 0.14 185 / 0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, oklch(0.35 0.08 260 / 0.4), transparent 50%)",
        }}
      />
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Animated ECG strip */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 overflow-hidden opacity-[0.35]">
        <div className="medical-ecg-track flex h-full w-[200%]">
          <svg
            className="h-full w-1/2 shrink-0 text-teal-400/90"
            viewBox="0 0 800 120"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0,60 L80,60 L100,60 L115,35 L130,85 L145,20 L160,100 L175,60 L800,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="medical-ecg-path"
            />
          </svg>
          <svg
            className="h-full w-1/2 shrink-0 text-teal-400/90"
            viewBox="0 0 800 120"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0,60 L80,60 L100,60 L115,35 L130,85 L145,20 L160,100 L175,60 L800,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="medical-ecg-path"
            />
          </svg>
        </div>
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center px-6 text-center">
        <div className="mb-8 rounded-3xl border border-white/15 bg-white/[0.08] px-10 py-12 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="relative mx-auto mb-6 flex size-24 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full bg-teal-400/25 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <span className="absolute inset-2 rounded-full border border-teal-300/40" />
            <HeartPulse
              className="relative z-10 size-12 text-teal-300 drop-shadow-[0_0_12px_rgba(45,212,191,0.45)]"
              strokeWidth={1.75}
            />
          </div>
          <p className="text-lg font-semibold tracking-tight text-white/95">
            Loading…
          </p>
          <p className="mt-2 text-sm font-medium text-teal-200/90">{text}</p>
          <p className="mt-3 text-xs leading-relaxed text-white/55">{subtitle}</p>
          {/* Progress dots */}
          <div className="mt-8 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full bg-teal-400/80 medical-loading-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/35">
          Staff portal
        </p>
      </div>
    </div>
  )
}

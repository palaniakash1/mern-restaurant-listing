export default function ImageFrameLoader({
  progress = 0,
  label = 'Uploading image',
  className = 'rounded-2xl'
}) {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-black/45 backdrop-blur-[2px] ${className}`}
    >
      <div
        className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(182,40,40,0.8)_0%,rgba(143,163,30,0.96)_100%)] transition-[height] duration-300 ease-out"
        style={{ height: `${safeProgress}%` }}
      >
        <div className="absolute inset-0 translate-x-[-100%] animate-[shimmer_1.6s_linear_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.18)_50%,transparent_100%)]" />
      </div>
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/80">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold">{safeProgress}%</p>
        <div className="mt-4 h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300 ease-out"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

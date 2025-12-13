export default function ImageCircleLoader({ progress }) {
  // scale grows as upload progresses
  const scale = 0.6 + (progress / 100) * 0.5; // 0.6 → 1.1

  return (
    <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
      {/* FULL FILL CIRCLE */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-emerald-600`}
        style={{
          transform: `scale(${scale})`,
          transition: "transform 0.25s ease-out",
          opacity: 0.85,
        }}
      />

      {/* TEXT ON TOP */}
      <div className="relative z-10 text-white font-bold text-lg">
        {progress}%
      </div>
    </div>
  );
}

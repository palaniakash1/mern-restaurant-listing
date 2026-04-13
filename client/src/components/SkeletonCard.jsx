export function SkeletonCard({ variant = 'restaurant', count = 1 }) {
  const variants = {
    restaurant: (
      <div className="rounded-[1.5rem] border border-[#e6eccf] bg-white p-4 shadow-sm">
        <div className="aspect-[4/3] rounded-xl bg-[#edf4dc] animate-pulse" />
        <div className="mt-4 h-4 w-3/4 rounded bg-[#edf4dc] animate-pulse" />
        <div className="mt-2 h-3 w-1/2 rounded bg-[#edf4dc] animate-pulse" />
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-16 rounded-full bg-[#edf4dc] animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-[#edf4dc] animate-pulse" />
        </div>
      </div>
    ),
    category: (
      <div className="rounded-[1.5rem] border border-[#e6eccf] bg-white p-4 shadow-sm">
        <div className="relative h-40 rounded-xl bg-[#edf4dc] animate-pulse" />
        <div className="mt-4 h-4 w-3/4 rounded bg-[#edf4dc] animate-pulse" />
        <div className="mt-2 h-3 w-1/2 rounded bg-[#edf4dc] animate-pulse" />
      </div>
    ),
    menu: (
      <div className="rounded-[1.5rem] border border-[#e6eccf] bg-white shadow-sm overflow-hidden">
        <div className="relative h-48 rounded-t-xl bg-[#edf4dc] animate-pulse" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="h-5 w-3/4 rounded bg-[#edf4dc] animate-pulse" />
              <div className="mt-2 h-3 w-full rounded bg-[#edf4dc] animate-pulse" />
            </div>
            <div className="h-6 w-12 rounded bg-[#edf4dc] animate-pulse" />
          </div>
          <div className="mt-4 h-3 w-1/2 rounded bg-[#edf4dc] animate-pulse" />
        </div>
      </div>
    ),
    metric: (
      <div className="rounded-[1.5rem] border border-[#e6eccf] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-3 w-20 rounded bg-[#edf4dc] animate-pulse" />
            <div className="mt-3 h-8 w-16 rounded bg-[#edf4dc] animate-pulse" />
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#edf4dc] animate-pulse" />
        </div>
      </div>
    ),
    table: (
      <div className="rounded-[1.5rem] border border-[#e6eccf] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4 py-3 border-b border-[#e6eccf]">
          <div className="h-4 w-4 rounded bg-[#edf4dc] animate-pulse" />
          <div className="h-4 flex-1 rounded bg-[#edf4dc] animate-pulse" />
          <div className="h-4 w-24 rounded bg-[#edf4dc] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[#edf4dc] animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <div className="h-4 w-4 rounded bg-[#edf4dc] animate-pulse" />
            <div className="h-4 flex-1 rounded bg-[#edf4dc] animate-pulse" />
            <div className="h-4 w-24 rounded bg-[#edf4dc] animate-pulse" />
            <div className="h-4 w-20 rounded bg-[#edf4dc] animate-pulse" />
          </div>
        ))}
      </div>
    )
  };

  if (count === 1) {
    return variants[variant] || variants.restaurant;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{variants[variant] || variants.restaurant}</div>
      ))}
    </>
  );
}

export default SkeletonCard;

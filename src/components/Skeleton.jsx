// ── Skeleton primitives ────────────────────────────────────────
const Pulse = ({ className = '' }) => (
  <div className={`hc-shimmer rounded-lg ${className}`} />
)

// ── Dashboard skeleton ─────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Greeting header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <Pulse className="h-5 w-40" />
        <Pulse className="h-8 w-56" />
        <Pulse className="h-4 w-32" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Pulse className="h-4 w-20" />
              <Pulse className="w-9 h-9 rounded-xl" />
            </div>
            <Pulse className="h-7 w-24" />
            <Pulse className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Two column */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <Pulse className="h-5 w-32" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Pulse className="w-3 h-3 rounded-full flex-shrink-0" />
                <Pulse className="flex-1 h-4" />
                <Pulse className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <Pulse className="h-5 w-28" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Pulse className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Pulse className="h-4 w-3/4" />
                  <Pulse className="h-3 w-1/2" />
                </div>
                <Pulse className="h-5 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Rentals skeleton ───────────────────────────────────────────
export function RentalsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Pulse className="h-7 w-24" />
        <Pulse className="h-9 w-32 rounded-xl" />
      </div>

      {/* Calendar strip */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Pulse className="h-5 w-32" />
          <div className="flex gap-2">
            <Pulse className="w-7 h-7 rounded-lg" />
            <Pulse className="w-7 h-7 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <Pulse key={i} className="h-8 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Rental cards */}
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
            <Pulse className="w-14 h-14 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Pulse className="h-4 w-32" />
                <Pulse className="h-5 w-16 rounded-full" />
              </div>
              <Pulse className="h-3 w-24" />
              <Pulse className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Cameras skeleton ───────────────────────────────────────────
export function CamerasSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Pulse className="h-7 w-20" />
        <Pulse className="h-9 w-28 rounded-xl" />
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 text-center space-y-1.5">
            <Pulse className="h-6 w-8 mx-auto" />
            <Pulse className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Pulse key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <Pulse className="w-full aspect-[4/3]" />
            <div className="p-3 space-y-1.5">
              <Pulse className="h-4 w-3/4" />
              <Pulse className="h-3 w-1/2" />
              <Pulse className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Customers skeleton ─────────────────────────────────────────
export function CustomersSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Pulse className="h-7 w-20" />
          <Pulse className="h-3 w-40" />
        </div>
        <Pulse className="h-9 w-28 rounded-xl" />
      </div>

      {/* Search */}
      <Pulse className="h-10 w-full rounded-xl" />

      {/* Customer rows */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Pulse className="w-11 h-11 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="h-4 w-32" />
              <Pulse className="h-3 w-48" />
            </div>
            <div className="text-right space-y-1.5">
              <Pulse className="h-4 w-14 ml-auto" />
              <Pulse className="h-3 w-10 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Report skeleton ────────────────────────────────────────────
export function ReportSkeleton() {
  return (
    <div className="space-y-5">
      <Pulse className="h-8 w-32" />

      {/* Stats strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <Pulse className="h-5 w-40" />
        <div className="flex items-end gap-3 h-48">
          {[60, 85, 45, 90, 70, 100].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <Pulse className={`w-full rounded-t-lg`} style={{ height: `${h}%` }} />
              <Pulse className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <Pulse className="h-5 w-36" />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Pulse className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Pulse className="h-4 w-3/4" />
                  <Pulse className="h-3 w-1/2" />
                </div>
                <Pulse className="h-4 w-16" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

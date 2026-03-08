import { Skeleton } from "@/components/ui/skeleton";

const ProjectDetailSkeleton = () => (
  <div className="container relative mx-auto max-w-5xl px-4 pt-24 pb-20">
    {/* Back link */}
    <Skeleton className="mb-8 h-4 w-32" />

    {/* Hero */}
    <div className="mb-8 flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-[7px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>

    {/* Tags */}
    <div className="mb-8 flex gap-2">
      <Skeleton className="h-7 w-20 rounded-md" />
      <Skeleton className="h-7 w-28 rounded-md" />
      <Skeleton className="h-7 w-24 rounded-md" />
    </div>

    {/* Two-column */}
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  </div>
);

export default ProjectDetailSkeleton;

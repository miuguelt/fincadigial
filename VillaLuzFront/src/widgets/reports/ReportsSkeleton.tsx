import { Card, CardContent } from '@/shared/ui/card';

export function TabSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <div className="h-9 flex-1 bg-muted animate-pulse rounded-lg" />
                <div className="h-9 flex-1 bg-muted animate-pulse rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            <div className="h-5 w-1/3 bg-muted animate-pulse rounded" />
            <div className="h-8 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-8 w-full bg-muted animate-pulse rounded-lg" />
            <div className="h-8 w-2/3 bg-muted animate-pulse rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ReportCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-4">
            <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-muted animate-pulse rounded-lg" />
              <div className="h-8 flex-1 bg-muted animate-pulse rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default TabSkeleton;

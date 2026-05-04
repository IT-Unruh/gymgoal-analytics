export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="bg-gray-800 rounded animate-pulse"
      style={{ height }}
    />
  );
}

export function CardSkeleton() {
  return <div className="bg-gray-800 rounded-lg h-20 animate-pulse" />;
}

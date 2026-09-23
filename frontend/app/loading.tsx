import { PageMotionLoader } from "@/components/SkeletonShimmer";

export default function RootLoading() {
  return (
    <PageMotionLoader 
      title="Loading FastHire AI..." 
      subtitle="Connecting to career optimization intelligence..." 
    />
  );
}

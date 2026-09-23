import { PageMotionLoader } from "@/components/SkeletonShimmer";

export default function DashboardLoading() {
  return (
    <PageMotionLoader 
      title="Loading FastHire Workspace..." 
      subtitle="Preparing ATS scoring engine and optimization models..." 
    />
  );
}

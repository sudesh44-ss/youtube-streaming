import { Suspense } from "react";
import WatchClient from "./WatchClient";

interface PageProps {
  params: Promise<{ videoId: string }>;
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { videoId } = await params;
  const sp = searchParams ? await searchParams : {};
  const initialTitle = sp.title || "";

  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "3rem 1.25rem", textAlign: "center" }}>
          <div className="skeleton" style={{ width: "100%", maxWidth: "1000px", height: "500px", margin: "0 auto 2rem", borderRadius: "16px" }} />
          <div className="skeleton" style={{ width: "60%", height: "28px", margin: "0 auto 1rem" }} />
          <div className="skeleton" style={{ width: "40%", height: "20px", margin: "0 auto" }} />
        </div>
      }
    >
      <WatchClient videoId={videoId} initialTitle={initialTitle} />
    </Suspense>
  );
}

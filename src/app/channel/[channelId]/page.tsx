import { Suspense } from "react";
import { ChannelClient } from "./ChannelClient";

interface ChannelPageProps {
  params: Promise<{ channelId: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { channelId } = await params;

  return (
    <Suspense
      fallback={
        <div className="container" style={{ padding: "5rem 1.25rem", textAlign: "center" }}>
          <div className="skeleton" style={{ width: "100%", height: "200px", borderRadius: "16px", marginBottom: "2rem" }} />
          <div className="skeleton" style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 1rem" }} />
          <div className="skeleton" style={{ width: "240px", height: "24px", margin: "0 auto" }} />
        </div>
      }
    >
      <ChannelClient channelId={channelId} />
    </Suspense>
  );
}

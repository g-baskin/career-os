import { redirect } from "next/navigation";
import { requireAuthenticatedCareerUser } from "../api/_lib/auth";
import { listPersistentApplicationPackets } from "../api/_lib/persistent-state";

export const dynamic = "force-dynamic";

export default async function PacketDetailManagerPage() {
  const authUser = await requireAuthenticatedCareerUser();
  const packet = (await listPersistentApplicationPackets(authUser.userId))[0];

  if (packet) {
    redirect(`/application-packets/${packet.id}`);
  }

  return (
    <main className="main">
      <span className="badge">Application Packet Manager</span>
      <h1>Packet Detail</h1>
      <p className="muted">Packet detail opens from the packet list once a packet exists.</p>
      <div className="grid">
        <a className="card linked-card" href="/application-packets">
          <strong>Open Application Packets</strong>
          <p className="muted">Create or select a packet, then open the detail record.</p>
        </a>
        <a className="card linked-card" href="/#data-touchpoints">
          <strong>Seed Local Data</strong>
          <p className="muted">Run the local data flow to create a job, packet, relationship, resume draft, events, state, and snapshots.</p>
        </a>
      </div>
    </main>
  );
}

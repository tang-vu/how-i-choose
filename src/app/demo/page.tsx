import type { Metadata } from "next";

import { WorkspaceApp } from "@/components/workspace-app";

export const metadata: Metadata = {
  title: "Synthetic demo",
  description: "Reset and rehearse the synthetic Maya community-workshop scenario.",
};

export default function DemoPage() {
  return <WorkspaceApp />;
}

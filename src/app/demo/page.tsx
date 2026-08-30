import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Synthetic demo",
  description: "Reset and rehearse the synthetic Maya community-workshop scenario.",
};

export default function DemoPage() {
  return <AppShell demo />;
}

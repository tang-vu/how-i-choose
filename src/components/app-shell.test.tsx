import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  it("explains that the partner—not the person—is evaluated", () => {
    render(<AppShell />);

    expect(screen.getByRole("heading", { level: 1, name: /make your signals easier to follow/i })).toBeInTheDocument();
    expect(screen.getByText(/the audit checks whether the communication partner adapted/i)).toBeInTheDocument();
    expect(screen.getByText(/a communication-practice tool—not a consent system/i)).toBeInTheDocument();
  });

  it("labels Maya's route as synthetic", () => {
    render(<AppShell demo />);

    expect(screen.getByText("Synthetic judge demo")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /a calm rehearsal, ready to reset/i })).toBeInTheDocument();
  });
});

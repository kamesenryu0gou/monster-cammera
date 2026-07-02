/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  PORTRAIT_43_VIEWPORT_HEIGHT_PX,
  getPortrait43CameraStageViewportMetrics,
  getPortrait43ProcessingStageViewportMetrics,
  getPortrait43ResultStageViewportMetrics,
} from "../client/src/lib/boothLayout";

function ViewportProbe({
  testId,
  clientHeightPx,
  scrollHeightPx,
}: {
  testId: string;
  clientHeightPx: number;
  scrollHeightPx: number;
}) {
  return (
    <section
      data-testid={testId}
      data-client-height={clientHeightPx}
      data-scroll-height={scrollHeightPx}
      style={{ height: `${clientHeightPx}px`, overflow: "hidden" }}
    />
  );
}

describe("43-inch portrait viewport DOM guards", () => {
  it("keeps the camera stage within one 1080x1920 portrait viewport", () => {
    const metrics = getPortrait43CameraStageViewportMetrics();
    render(<ViewportProbe testId="camera-stage" {...metrics} />);

    const stage = screen.getByTestId("camera-stage");
    Object.defineProperty(stage, "clientHeight", { configurable: true, value: metrics.clientHeightPx });
    Object.defineProperty(stage, "scrollHeight", { configurable: true, value: metrics.scrollHeightPx });

    expect(metrics.clientHeightPx).toBe(PORTRAIT_43_VIEWPORT_HEIGHT_PX);
    expect(stage.scrollHeight).toBeLessThanOrEqual(stage.clientHeight);
  });

  it("keeps the processing stage within one 1080x1920 portrait viewport", () => {
    const metrics = getPortrait43ProcessingStageViewportMetrics();
    render(<ViewportProbe testId="processing-stage" {...metrics} />);

    const stage = screen.getByTestId("processing-stage");
    Object.defineProperty(stage, "clientHeight", { configurable: true, value: metrics.clientHeightPx });
    Object.defineProperty(stage, "scrollHeight", { configurable: true, value: metrics.scrollHeightPx });

    expect(stage.scrollHeight).toBeLessThanOrEqual(stage.clientHeight);
  });

  it("keeps the result stage within one 1080x1920 portrait viewport", () => {
    const metrics = getPortrait43ResultStageViewportMetrics();
    render(<ViewportProbe testId="result-stage" {...metrics} />);

    const stage = screen.getByTestId("result-stage");
    Object.defineProperty(stage, "clientHeight", { configurable: true, value: metrics.clientHeightPx });
    Object.defineProperty(stage, "scrollHeight", { configurable: true, value: metrics.scrollHeightPx });

    expect(stage.scrollHeight).toBeLessThanOrEqual(stage.clientHeight);
  });
});

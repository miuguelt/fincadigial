import { describe, expect, it } from "vitest";
import { summarizeGanaderiaToday } from "./GanaderiaTodayPanel";

describe("summarizeGanaderiaToday", () => {
  it("sums only today's milking and activity records", () => {
    const result = summarizeGanaderiaToday(
      [
        { type: "milking", date: "2026-08-17T06:00:00-05:00", raw: { liters: 8.5 } },
        { type: "transfer", date: "2026-08-17T08:00:00-05:00", raw: {} },
        { type: "milking", date: "2026-08-16T06:00:00-05:00", raw: { liters: 12 } },
      ],
      "2026-08-17",
    );

    expect(result).toEqual({ activityCount: 2, milkLiters: 8.5 });
  });

  it("handles missing dates and non-numeric production values", () => {
    const result = summarizeGanaderiaToday(
      [
        { type: "milking", date: null, raw: { liters: 10 } },
        { type: "milking", date: "2026-08-17", raw: { liters: undefined } },
      ],
      "2026-08-17",
    );

    expect(result).toEqual({ activityCount: 1, milkLiters: 0 });
  });
});

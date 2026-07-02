import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { PROMPT_VARIANTS } from "@shared/boothPrompts";
import { getTodayDateKey } from "./db";
import {
  assignUniqueVariants,
  buildA5PrintLayoutSvg,
  buildTransformationPrompt,
  BGM_TRACKS,
  DEFAULT_BGM_TRACK_ID,
  getMonthlyPassword,
  MONTHLY_PASSWORDS,
  padDisplayNumber,
  RESULT_AUTO_RETURN_MS,
} from "./boothLogic";

describe("booth numbering helpers", () => {
  it("uses the configured monthly passwords and a 13-second result wait", () => {
    expect(MONTHLY_PASSWORDS[1]).toBe("58429");
    expect(MONTHLY_PASSWORDS[2]).toBe("03716");
    expect(MONTHLY_PASSWORDS[12]).toBe("45270");
    expect(getMonthlyPassword(new Date("2026-02-10T09:00:00+09:00"))).toBe("03716");
    expect(getMonthlyPassword(new Date("2026-06-10T09:00:00+09:00"))).toBe("24698");
    expect(RESULT_AUTO_RETURN_MS).toBe(13000);
  });

  it("publishes OFF plus four selectable BGM tracks for the login screen", () => {
    expect(DEFAULT_BGM_TRACK_ID).toBe("off");
    expect(BGM_TRACKS).toHaveLength(5);
    expect(BGM_TRACKS[0]).toMatchObject({ id: "off", label: "OFF", url: null });
    expect(BGM_TRACKS.slice(1).map(track => track.label)).toEqual(["BGM1", "BGM2", "BGM3", "BGM4"]);
    expect(BGM_TRACKS.slice(1).every(track => typeof track.url === "string" && track.url.startsWith("/manus-storage/"))).toBe(true);
  });

  it("formats the date key as yyyymmdd", () => {
    const date = new Date("2026-05-27T10:11:12+09:00");
    expect(getTodayDateKey(date)).toBe("20260527");
  });

  it("pads display numbers to four digits", () => {
    expect(padDisplayNumber(1)).toBe("0001");
    expect(padDisplayNumber(42)).toBe("0042");
    expect(padDisplayNumber(1234)).toBe("1234");
  });
});

describe("print layout helper", () => {
  it("builds an A5 portrait SVG template with eight repeated square tiles", () => {
    const svg = buildA5PrintLayoutSvg("data:image/png;base64,abc123");
    expect(svg).toContain('viewBox="0 0 1748 2480"');
    expect((svg.match(/<image /g) ?? []).length).toBe(8);
  });

  it("can be rasterized into the saved PNG layout size", async () => {
    const svg = buildA5PrintLayoutSvg("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=");
    const pngBuffer = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();
    const metadata = await sharp(pngBuffer).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1748);
    expect(metadata.height).toBe(2480);
  });
});

describe("prompt assignment", () => {
  it("encodes the shared mascot-style anchors drawn from the reference direction", () => {
    expect(PROMPT_VARIANTS.A.prompt).toContain("front-readable mascot silhouette");
    expect(PROMPT_VARIANTS.B.prompt).toContain("hatchling-dragon read");
    expect(PROMPT_VARIANTS.C.prompt).toContain("glowing forest depth");
    expect(PROMPT_VARIANTS.D.prompt).toContain("dramatic cosmic pedestal or moonlit stage");
    expect(PROMPT_VARIANTS.E.prompt).toContain("bold candy-land color separation");
  });

  it("forces each variant to replace visible human skin with creature materials", () => {
    expect(PROMPT_VARIANTS.A.prompt).toContain("Replace any human skin with dense plush fur");
    expect(PROMPT_VARIANTS.B.prompt).toContain("Replace human skin tone with dragon hide");
    expect(PROMPT_VARIANTS.C.prompt).toContain("Replace any remaining human skin with moss-tinted hide");
    expect(PROMPT_VARIANTS.D.prompt).toContain("Replace human skin with moon-dusted creature skin");
    expect(PROMPT_VARIANTS.E.prompt).toContain("Replace any human skin with glossy candy skin");
  });

  it("pushes each variant away from human facial structure or body balance", () => {
    expect(PROMPT_VARIANTS.A.prompt).toContain("tiny beast muzzle");
    expect(PROMPT_VARIANTS.B.prompt).toContain("Do not leave a human child face with dragon accessories");
    expect(PROMPT_VARIANTS.C.prompt).toContain("never reads as a human person simply painted green");
    expect(PROMPT_VARIANTS.D.prompt).toContain("Avoid a human face under star makeup");
    expect(PROMPT_VARIANTS.E.prompt).toContain("instead of a human silhouette");
  });

  it("assigns unique variants when up to five subjects are detected", () => {
    const assigned = assignUniqueVariants([
      { subjectIndex: 1, positionLabel: "leftmost person", appearanceSummary: "blue shirt" },
      { subjectIndex: 2, positionLabel: "center person", appearanceSummary: "red shirt" },
      { subjectIndex: 3, positionLabel: "rightmost person", appearanceSummary: "white shirt" },
      { subjectIndex: 4, positionLabel: "back row left", appearanceSummary: "black jacket" },
      { subjectIndex: 5, positionLabel: "back row right", appearanceSummary: "yellow top" },
    ]);

    expect(assigned).toHaveLength(5);
    const uniqueCodes = new Set(assigned.map(subject => subject.variantCode));
    expect(uniqueCodes.size).toBe(5);
  });

  it("builds one combined prompt that pushes full creature redesign and a newly imagined monster world", () => {
    const assigned = assignUniqueVariants([
      { subjectIndex: 1, positionLabel: "leftmost person", appearanceSummary: "blue shirt" },
      { subjectIndex: 2, positionLabel: "rightmost person", appearanceSummary: "red shirt" },
    ]);

    const prompt = buildTransformationPrompt(assigned);

    expect(prompt).toContain("Apply a unique variant to each detected subject without duplication.");
    expect(prompt).toContain("clearly non-human silhouette");
    expect(prompt).toContain("not a human wearing horns, makeup, or a costume");
    expect(prompt).toContain("Prioritize a complete creature redesign with strong chibi monster silhouette over realistic human anatomy or costume-like accessories.");
    expect(prompt).toContain("premium storybook-mascot finish with plush volume");
    expect(prompt).toContain("Human-looking skin tone must not remain visible as the main surface.");
    expect(prompt).toContain("Visible skin must read as monster skin, fur, plush, scales, bark, fantasy hide, or other non-human material instead of ordinary human skin tone.");
    expect(prompt).toContain("If original human skin tone appears anywhere, convert it into the selected creature palette and surface texture rather than leaving realistic human skin.");
    expect(prompt).toContain("Do not keep realistic human nose bridge, lips, jawline, cheekbones, fingers, or human-length limbs as the dominant read.");
    expect(prompt).toContain("Favor creature paws, claws, mascot mitts, compact legs, muzzle-like facial simplification, and rounded monster body balance over a stylized human portrait.");
    expect(prompt).toContain("Generate one newly imagined background for the whole group so it feels like a cohesive monster world rather than the original location.");
    expect(prompt).toContain("Subject 1");
    expect(prompt).toContain("Subject 2");
    expect(prompt).toContain(assigned[0]!.variantName);
    expect(prompt).toContain(assigned[1]!.variantName);
  });
});

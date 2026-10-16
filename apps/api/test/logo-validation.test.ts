import { describe, expect, it } from "vitest";
import { detectLogoImage, logoBlobName, logoPath, ownLogoFile } from "../src/branding/logo-validation";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(16)]);
const svg = (body = "") => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${body}<rect width="10" height="10"/></svg>`);

describe("detectLogoImage", () => {
  it("accepts PNG, JPEG, WebP and plain SVG by their bytes", () => {
    expect(detectLogoImage(png)?.ext).toBe("png");
    expect(detectLogoImage(jpg)?.ext).toBe("jpg");
    expect(detectLogoImage(webp)?.ext).toBe("webp");
    expect(detectLogoImage(svg())?.ext).toBe("svg");
    expect(detectLogoImage(Buffer.from(`<?xml version="1.0"?>${svg().toString()}`))?.ext).toBe("svg");
  });

  it("rejects anything else, whatever it claims to be", () => {
    expect(detectLogoImage(Buffer.from("GIF89a" + "x".repeat(40)))).toBeNull();
    expect(detectLogoImage(Buffer.from("<html><body>hi</body></html>"))).toBeNull();
    expect(detectLogoImage(Buffer.from("MZ" + "x".repeat(40)))).toBeNull();
    expect(detectLogoImage(Buffer.alloc(4))).toBeNull();
  });

  it("rejects SVGs carrying scripts, handlers or active content", () => {
    expect(detectLogoImage(svg("<script>alert(1)</script>"))).toBeNull();
    expect(detectLogoImage(svg(`<rect onload="x()" />`))).toBeNull();
    expect(detectLogoImage(svg(`<a href="javascript:alert(1)"><text>x</text></a>`))).toBeNull();
    expect(detectLogoImage(svg("<foreignObject><div/></foreignObject>"))).toBeNull();
    expect(detectLogoImage(svg(`<image xlink:href="https://evil.example/x.png"/>`))).toBeNull();
  });
});

describe("logo paths", () => {
  const org = "0b2f2f7e-1d4a-4a55-9a64-0c1f3a1f2b3c";
  it("round-trips an uploaded path and ignores anything else", () => {
    const p = logoPath(org, 1760000000000, "png");
    expect(ownLogoFile(p, org)).toBe("1760000000000.png");
    expect(ownLogoFile(p, "11111111-1111-4111-8111-111111111111")).toBeNull();
    expect(ownLogoFile("https://example.org/logo.png", org)).toBeNull();
    expect(ownLogoFile(`/branding/${org}/logo/../../secret.png`, org)).toBeNull();
    expect(ownLogoFile(null, org)).toBeNull();
    // icons are a separate namespace from logos
    const i = logoPath(org, 1760000000001, "svg", "icon");
    expect(ownLogoFile(i, org, "icon")).toBe("1760000000001.svg");
    expect(ownLogoFile(i, org, "logo")).toBeNull();
    expect(logoBlobName("1760000000001.svg", "icon")).toBe("branding/icon-1760000000001.svg");
    expect(logoBlobName("1760000000001.svg")).toBe("branding/1760000000001.svg");
  });
});

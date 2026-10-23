import { describe, expect, it } from "vitest";
import { cleanManualPilUrl, emaProductInformationPdf, matchPill, mhraSearchUrl, pilLinksForReference, scorePharmaMatch, sourcePill } from "@universe/types";

describe("pharma leaflet links", () => {
  it("derives the EMA product information PDF from the EPAR page", () => {
    expect(emaProductInformationPdf("https://www.ema.europa.eu/en/medicines/human/EPAR/zarzio"))
      .toBe("https://www.ema.europa.eu/en/documents/product-information/zarzio-epar-product-information_en.pdf");
  });
  it("does not guess for veterinary, odd or missing URLs", () => {
    expect(emaProductInformationPdf("https://www.ema.europa.eu/en/medicines/veterinary/EPAR/x")).toBeNull();
    expect(emaProductInformationPdf("https://evil.example/en/medicines/human/EPAR/zarzio")).toBeNull();
    expect(emaProductInformationPdf(null)).toBeNull();
  });
  it("gives EMA entries a PDF and a page link, MHRA entries a search link-out", () => {
    const ema = pilLinksForReference({ source: "EMA", sourceKey: "EMEA/H/C/000917", sourceUrl: "https://www.ema.europa.eu/en/medicines/human/EPAR/zarzio" });
    expect(ema.map((l) => l.kind)).toEqual(["PIL_PDF", "EPAR_PAGE"]);
    const uk = pilLinksForReference({ source: "MHRA", sourceKey: "PL 00010/0757", sourceUrl: null });
    expect(uk[0].url).toBe(mhraSearchUrl("PL 00010/0757"));
    expect(uk[0].url).toContain("PL%2000010%2F0757");
  });
  it("accepts only https for a hand-entered leaflet", () => {
    expect(cleanManualPilUrl("https://example.org/pil.pdf")).toBe("https://example.org/pil.pdf");
    expect(cleanManualPilUrl("http://example.org/pil.pdf")).toBeNull();
    expect(cleanManualPilUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("pharma match scoring", () => {
  const ref = { name: "Zarzio", inn: "filgrastim", activeSubstances: "filgrastim", atcCode: "L03AA02" };
  it("scores brand + INN highly", () => {
    const r = scorePharmaMatch({ name: "Zarzio 30 MU/0.5 ml", brand: "Zarzio", inn: "Filgrastim" }, ref);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.basis).toEqual(expect.arrayContaining(["brand", "inn"]));
  });
  it("suggests on INN alone but weakly, and not on unrelated products", () => {
    expect(scorePharmaMatch({ name: "Filgrastim vial", inn: "filgrastim" }, ref).score).toBe(40);
    expect(scorePharmaMatch({ name: "Cryovial 2 ml", inn: null }, ref).score).toBe(0);
  });
  it("adds weight when ATC agrees", () => {
    expect(scorePharmaMatch({ name: "x", inn: "filgrastim", atcCode: "l03aa02" }, ref).score).toBe(55);
  });
});

describe("pills", () => {
  it("labels sources and states consistently", () => {
    expect(sourcePill("EMA").label).toBe("EMA");
    expect(matchPill("CONFIRMED").tone).toBe("good");
    expect(matchPill("NONE").label).toBe("Not linked");
  });
});

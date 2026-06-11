import companyLogoUrl from "@/assets/logo-emp.png";

export type PdfImageAsset = {
  dataUrl: string;
  width: number;
  height: number;
  format: "PNG" | "JPEG";
};

type PdfLogoOptions = {
  x?: number;
  y?: number;
  marginX?: number;
  maxWidth?: number;
  maxHeight?: number;
  align?: "left" | "right";
};

let companyLogoAssetPromise: Promise<PdfImageAsset | null> | null = null;

function inferDataUrlFormat(dataUrl: string): PdfImageAsset["format"] {
  const normalized = String(dataUrl || "").toLowerCase();
  return normalized.startsWith("data:image/jpeg") || normalized.startsWith("data:image/jpg")
    ? "JPEG"
    : "PNG";
}

export function getContainedImageSize(
  image: Pick<PdfImageAsset, "width" | "height">,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return {
    width: image.width * ratio,
    height: image.height * ratio,
  };
}

export function loadPdfImageAsset(url: string): Promise<PdfImageAsset | null> {
  if (!url || typeof Image === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        resolve(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/png");
      resolve({
        dataUrl,
        width,
        height,
        format: inferDataUrlFormat(dataUrl),
      });
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function getCompanyLogoAsset() {
  companyLogoAssetPromise ??= loadPdfImageAsset(companyLogoUrl);
  return companyLogoAssetPromise;
}

export function drawPdfCompanyLogo(
  doc: any,
  logoAsset: PdfImageAsset | null | undefined,
  options: PdfLogoOptions = {},
) {
  if (!logoAsset) return null;

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = options.marginX ?? 32;
  const maxWidth = options.maxWidth ?? 108;
  const maxHeight = options.maxHeight ?? 34;
  const size = getContainedImageSize(logoAsset, maxWidth, maxHeight);
  const x =
    options.x ??
    (options.align === "right" ? pageWidth - marginX - size.width : marginX);
  const y = options.y ?? 16;

  doc.addImage(
    logoAsset.dataUrl,
    logoAsset.format,
    x,
    y,
    size.width,
    size.height,
    undefined,
    "FAST",
  );

  return { x, y, width: size.width, height: size.height };
}

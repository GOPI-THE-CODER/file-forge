export function cropSignature(
    sourceCanvas,
    bounds
) {

  const signatureWidth = bounds.maxX - bounds.minX;
const signatureHeight = bounds.maxY - bounds.minY;

// Dynamic padding: 3% of the smaller dimension
const PADDING = Math.max(
    2,
    Math.round(Math.min(signatureWidth, signatureHeight) * 0.03)
);

    const x = Math.max(
        0,
        bounds.minX - PADDING
    );

    const y = Math.max(
        0,
        bounds.minY - PADDING
    );

    const width = Math.min(
        sourceCanvas.width - x,
        (bounds.maxX - bounds.minX) + PADDING * 2
    );

    const height = Math.min(
        sourceCanvas.height - y,
        (bounds.maxY - bounds.minY) + PADDING * 2
    );

    const croppedCanvas =
        document.createElement("canvas");

    croppedCanvas.width = width;
    croppedCanvas.height = height;

    const ctx =
        croppedCanvas.getContext("2d");

    ctx.drawImage(
        sourceCanvas,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height
    );

    return croppedCanvas;
}
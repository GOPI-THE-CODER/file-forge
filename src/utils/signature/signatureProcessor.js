import { detectSignatureBounds } from "./detector";
import { cropSignature } from "./cropper";
import { enhanceSignature } from "./enhancer";
import { resizeImage } from "./resizer";
import { exportPNG } from "./exporter";

export async function processSignature(
    imageElement,
    targetWidth,
    targetHeight
) {
    // Create source canvas
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(imageElement, 0, 0);

    // Read pixels
    const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Detect signature bounds
    const bounds = detectSignatureBounds(
        imageData,
        canvas.width,
        canvas.height
    );

    // Crop the signature
    const croppedCanvas = cropSignature(
        canvas,
        bounds
    );

    // Resize first
    const resizedCanvas = resizeImage(
        croppedCanvas,
        targetWidth,
        targetHeight
    );

    // Then enhance (currently this just returns the canvas)
    const enhancedCanvas = enhanceSignature(
        resizedCanvas
    );

    // Export PNG
    return exportPNG(enhancedCanvas);
}
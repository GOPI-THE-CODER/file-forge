export function resizeImage(
    sourceCanvas,
    targetWidth,
    targetHeight
) {

    let currentCanvas = sourceCanvas;

    // Reduce gradually while the image is much larger
    while (
        currentCanvas.width > targetWidth * 2 ||
        currentCanvas.height > targetHeight * 2
    ) {

        const tempCanvas = document.createElement("canvas");

        tempCanvas.width = Math.max(
            targetWidth,
            Math.floor(currentCanvas.width / 2)
        );

        tempCanvas.height = Math.max(
            targetHeight,
            Math.floor(currentCanvas.height / 2)
        );

        const tempCtx = tempCanvas.getContext("2d");

        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = "high";

        tempCtx.drawImage(
            currentCanvas,
            0,
            0,
            currentCanvas.width,
            currentCanvas.height,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
        );

        currentCanvas = tempCanvas;
    }

    const outputCanvas = document.createElement("canvas");

    outputCanvas.width = targetWidth;
    outputCanvas.height = targetHeight;

    const outCtx = outputCanvas.getContext("2d");

if (targetWidth <= 300 || targetHeight <= 80) {
    outCtx.imageSmoothingEnabled = false;
} else {
    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
}
    const scale = Math.min(
    targetWidth / currentCanvas.width,
    targetHeight / currentCanvas.height
);

    const drawWidth = currentCanvas.width * scale;
    const drawHeight = currentCanvas.height * scale;

    const x = (targetWidth - drawWidth) / 2;
    const y = (targetHeight - drawHeight) / 2;

    outCtx.clearRect(0, 0, targetWidth, targetHeight);

    outCtx.drawImage(
        currentCanvas,
        0,
        0,
        currentCanvas.width,
        currentCanvas.height,
        x,
        y,
        drawWidth,
        drawHeight
    );

    return outputCanvas;
}
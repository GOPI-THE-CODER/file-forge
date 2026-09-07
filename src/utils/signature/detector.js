export function detectSignatureBounds(imageData, width, height) {

    const data = imageData.data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    const WHITE_THRESHOLD = 245;

    for (let y = 0; y < height; y++) {

        for (let x = 0; x < width; x++) {

            const i = (y * width + x) * 4;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            const brightness = (r + g + b) / 3;

            const colorDistance =
                Math.abs(255 - r) +
                Math.abs(255 - g) +
                Math.abs(255 - b);

            const isInk =
                brightness < WHITE_THRESHOLD ||
                colorDistance > 30;

            if (!isInk) continue;

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }
    }

    if (maxX < 0) {
        throw new Error("No signature detected.");
    }

    return {
        minX,
        minY,
        maxX,
        maxY
    };
}
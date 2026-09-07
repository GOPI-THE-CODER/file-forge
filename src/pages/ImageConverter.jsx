import React, { useEffect, useState } from "react";

const ImageConverter = () => {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [originalSize, setOriginalSize] = useState(0);
  const [originalFormat, setOriginalFormat] = useState("");
  const [originalDimensions, setOriginalDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [format, setFormat] = useState("image/png");

  // Maximum practical quality.
  const [quality, setQuality] = useState(1);

  const [convertedImage, setConvertedImage] = useState(null);
  const [convertedSize, setConvertedSize] = useState(0);
  const [convertedDimensions, setConvertedDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [converting, setConverting] = useState(false);

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDimensions = (width, height) => {
    if (!width || !height) return "—";

    return `${width.toLocaleString()} × ${height.toLocaleString()} px`;
  };

  const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });

        URL.revokeObjectURL(objectUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read this image."));
      };

      img.src = objectUrl;
    });
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    try {
      const dimensions = await getImageDimensions(file);

      // Release previous preview.
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      setImageFile(file);
      setPreview(URL.createObjectURL(file));

      setOriginalSize(file.size);
      setOriginalFormat(file.type);
      setOriginalDimensions(dimensions);

      setConvertedImage(null);
      setConvertedSize(0);
      setConvertedDimensions({
        width: 0,
        height: 0,
      });
    } catch (error) {
      console.error(error);
      alert("Unable to read this image.");
    }
  };

  const convertImage = async () => {
    if (!imageFile || converting) return;

    setConverting(true);
    setConvertedImage(null);
    setConvertedSize(0);

    try {
      const objectUrl = URL.createObjectURL(imageFile);

      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = resolve;

        img.onerror = () => {
          reject(new Error("Failed to load the image."));
        };

        img.src = objectUrl;
      });

      /*
       * IMPORTANT:
       *
       * Use the original pixel dimensions.
       * We never resize the image here.
       */
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (!width || !height) {
        throw new Error("Invalid image dimensions.");
      }

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", {
        alpha: true,
        colorSpace: "srgb",
      });

      if (!ctx) {
        throw new Error("Your browser could not create a canvas.");
      }

      /*
       * High-quality image rendering.
       */
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      /*
       * White background is required when converting
       * transparent images to JPEG.
       */
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      /*
       * Draw at EXACT original pixel dimensions.
       */
      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      /*
       * Convert canvas directly to Blob.
       *
       * This is better than using a huge Base64 Data URL.
       */
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error("Image conversion failed.")
              );
            }
          },
          format,
          format === "image/png" ? undefined : quality
        );
      });

      const convertedUrl = URL.createObjectURL(blob);

      setConvertedImage(convertedUrl);
      setConvertedSize(blob.size);

      setConvertedDimensions({
        width,
        height,
      });

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Image conversion failed:", error);

      alert(
        error?.message ||
          "Image conversion failed. Please try another image."
      );
    } finally {
      setConverting(false);
    }
  };

  const downloadImage = () => {
    if (!convertedImage) return;

    const extension =
      format === "image/jpeg"
        ? "jpg"
        : format === "image/webp"
        ? "webp"
        : "png";

    const originalName =
      imageFile?.name
        ?.replace(/\.[^/.]+$/, "")
        || "fileforge-image";

    const link = document.createElement("a");

    link.href = convertedImage;

    link.download =
      `${originalName}-converted.${extension}`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const cleanupPreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    if (convertedImage) {
      URL.revokeObjectURL(convertedImage);
    }
  };

  useEffect(() => {
    return () => {
      cleanupPreview();
    };
  }, [preview, convertedImage]);

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <h1>🔄 Image Format Converter</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
      />

      {preview && (
        <>
          {/* Preview */}
          <div
            style={{
              marginTop: "20px",
            }}
          >
            <img
              src={preview}
              alt="Original preview"
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "500px",
                width: "auto",
                height: "auto",
                borderRadius: "10px",
              }}
            />
          </div>

          {/* Original information */}
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "10px",
            }}
          >
            <h3>Original File Details</h3>

            <p>
              <strong>Name:</strong>{" "}
              {imageFile?.name}
            </p>

            <p>
              <strong>Format:</strong>{" "}
              {originalFormat}
            </p>

            <p>
              <strong>Size:</strong>{" "}
              {formatBytes(originalSize)}
            </p>

            <p>
              <strong>Resolution:</strong>{" "}
              {formatDimensions(
                originalDimensions.width,
                originalDimensions.height
              )}
            </p>
          </div>

          {/* Output format */}
          <div
            style={{
              marginTop: "20px",
            }}
          >
            <label>
              <strong>Output Format:</strong>
            </label>

            <br />

            <select
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setConvertedImage(null);
                setConvertedSize(0);
              }}
              style={{
                padding: "10px",
                marginTop: "8px",
                width: "220px",
              }}
            >
              <option value="image/png">
                PNG — Lossless
              </option>

              <option value="image/jpeg">
                JPG — High Quality
              </option>

              <option value="image/webp">
                WEBP — High Quality
              </option>
            </select>
          </div>

          {/* Quality */}
          {(format === "image/jpeg" ||
            format === "image/webp") && (
            <div
              style={{
                marginTop: "20px",
              }}
            >
              <label>
                <strong>
                  Quality:{" "}
                  {Math.round(quality * 100)}%
                </strong>
              </label>

              <br />

              <input
                type="range"
                min="0.8"
                max="1"
                step="0.01"
                value={quality}
                onChange={(e) =>
                  setQuality(
                    Number(e.target.value)
                  )
                }
                style={{
                  width: "300px",
                  maxWidth: "100%",
                }}
              />

              <p>
                100% = maximum available encoding
                quality.
              </p>
            </div>
          )}

          {/* Convert */}
          <button
            onClick={convertImage}
            disabled={converting}
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              cursor: converting
                ? "wait"
                : "pointer",
            }}
          >
            {converting
              ? "Converting..."
              : "Convert Image"}
          </button>
        </>
      )}

      {/* Converted result */}
      {convertedImage && (
        <div
          style={{
            marginTop: "40px",
          }}
        >
          <h2>Converted Image</h2>

          <img
            src={convertedImage}
            alt="Converted"
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "500px",
              width: "auto",
              height: "auto",
              borderRadius: "10px",
            }}
          />

          <div
            style={{
              marginTop: "15px",
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "10px",
            }}
          >
            <p>
              <strong>Format:</strong>{" "}
              {format}
            </p>

            <p>
              <strong>Size:</strong>{" "}
              {formatBytes(convertedSize)}
            </p>

            <p>
              <strong>Resolution:</strong>{" "}
              {formatDimensions(
                convertedDimensions.width,
                convertedDimensions.height
              )}
            </p>

            <p>
              <strong>Resolution preserved:</strong>{" "}
              {originalDimensions.width ===
                convertedDimensions.width &&
              originalDimensions.height ===
                convertedDimensions.height
                ? "✓ Yes"
                : "⚠ No"}
            </p>
          </div>

          <button
            onClick={downloadImage}
            style={{
              marginTop: "10px",
              padding: "12px 24px",
              cursor: "pointer",
            }}
          >
            Download Converted Image
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageConverter;
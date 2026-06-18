import React, { useState } from "react";

const ImageConverter = () => {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [originalSize, setOriginalSize] = useState(0);
  const [originalFormat, setOriginalFormat] = useState("");

  const [format, setFormat] = useState("image/png");
  const [quality, setQuality] = useState(0.9);

  const [convertedImage, setConvertedImage] = useState(null);
  const [convertedSize, setConvertedSize] = useState(0);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024)
      return (bytes / 1024).toFixed(2) + " KB";

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setImageFile(file);
    setPreview(URL.createObjectURL(file));

    setOriginalSize(file.size);
    setOriginalFormat(file.type);

    setConvertedImage(null);
    setConvertedSize(0);
  };

  const convertImage = () => {
    if (!imageFile) return;

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      const convertedDataUrl = canvas.toDataURL(
        format,
        quality
      );

      setConvertedImage(convertedDataUrl);

      const base64Length =
        convertedDataUrl.split(",")[1].length;

      const bytes =
        Math.round((base64Length * 3) / 4);

      setConvertedSize(bytes);
    };

    img.src = URL.createObjectURL(imageFile);
  };

  const downloadImage = () => {
    if (!convertedImage) return;

    const extension =
      format === "image/jpeg"
        ? "jpg"
        : format === "image/webp"
        ? "webp"
        : "png";

    const link = document.createElement("a");

    link.href = convertedImage;
    link.download = `fileforge-converted.${extension}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <div style={{ marginTop: "20px" }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "350px",
                borderRadius: "10px",
              }}
            />
          </div>

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
          </div>

          <div
            style={{
              marginTop: "20px",
            }}
          >
            <label>
              Output Format:
            </label>

            <br />

            <select
              value={format}
              onChange={(e) =>
                setFormat(e.target.value)
              }
              style={{
                padding: "10px",
                marginTop: "8px",
                width: "220px",
              }}
            >
              <option value="image/png">
                PNG
              </option>

              <option value="image/jpeg">
                JPG
              </option>

              <option value="image/webp">
                WEBP
              </option>
            </select>
          </div>

          {(format === "image/jpeg" ||
            format === "image/webp") && (
            <div
              style={{
                marginTop: "20px",
              }}
            >
              <label>
                Quality: {Math.round(quality * 100)}%
              </label>

              <br />

              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(e) =>
                  setQuality(
                    Number(e.target.value)
                  )
                }
                style={{
                  width: "300px",
                }}
              />
            </div>
          )}

          <button
            onClick={convertImage}
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              cursor: "pointer",
            }}
          >
            Convert Image
          </button>
        </>
      )}

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
              maxWidth: "100%",
              maxHeight: "350px",
              borderRadius: "10px",
            }}
          />

          <div
            style={{
              marginTop: "15px",
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
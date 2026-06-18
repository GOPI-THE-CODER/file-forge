import React, { useState } from "react";

const ImageResizer = () => {
  const [imageFile, setImageFile] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [resizedPreview, setResizedPreview] = useState(null);

  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);

  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  const [maintainRatio, setMaintainRatio] = useState(false);
  const [format, setFormat] = useState("image/png");
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);

    const imageUrl = URL.createObjectURL(file);
    setOriginalPreview(imageUrl);

    const img = new Image();

    img.onload = () => {
      setOriginalWidth(img.width);
      setOriginalHeight(img.height);

      setWidth(img.width);
      setHeight(img.height);
    };

    img.src = imageUrl;
  };

  const handleWidthChange = (value) => {
  setWidth(value);

  if (!value) {
    setHeight("");
    return;
  }

  if (maintainRatio && originalWidth && originalHeight) {
    const newHeight = Math.round(
      (Number(value) * originalHeight) / originalWidth
    );

    setHeight(newHeight.toString());
  }
};

 const handleHeightChange = (value) => {
  setHeight(value);

  if (!value) {
    setWidth("");
    return;
  }

  if (maintainRatio && originalWidth && originalHeight) {
    const newWidth = Math.round(
      (Number(value) * originalWidth) / originalHeight
    );

    setWidth(newWidth.toString());
  }
}; 

  const resizeImage = () => {
    if (!imageFile) return;

    setLoading(true);

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Number(width);
      canvas.height = Number(height);

      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        0,
        0,
        Number(width),
        Number(height)
      );

      const resizedDataUrl = canvas.toDataURL(format, 1.0);

      setResizedPreview(resizedDataUrl);
      setLoading(false);
    };

    img.src = URL.createObjectURL(imageFile);
  };

  const downloadImage = () => {
    if (!resizedPreview) return;

    const extension =
      format === "image/jpeg"
        ? "jpg"
        : format === "image/webp"
        ? "webp"
        : "png";

    const link = document.createElement("a");
    link.href = resizedPreview;
    link.download = `fileforge-resized.${extension}`;
    link.click();
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <h1>🖼️ Image Resizer</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
      />

      {originalPreview && (
        <>
          <div style={{ marginTop: "20px" }}>
            <h3>Original Image</h3>

            <img
              src={originalPreview}
              alt="Original"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                borderRadius: "10px",
              }}
            />

            <p>
              Resolution: {originalWidth} × {originalHeight}
            </p>
          </div>

          <div
            style={{
              marginTop: "20px",
              display: "grid",
              gap: "10px",
            }}
          >
            <label>
              Width (px)
              <input
                type="number"
                value={width}
                onChange={(e) =>
                  handleWidthChange(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                }}
              />
            </label>

            <label>
              Height (px)
              <input
                type="number"
                value={height}
                onChange={(e) =>
                  handleHeightChange(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                }}
              />
            </label>
            <label>
              Output Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
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
            </label>

            <button
              onClick={resizeImage}
              style={{
                padding: "12px",
                cursor: "pointer",
              }}
            >
              {loading
                ? "Resizing..."
                : "Resize Image"}
            </button>
          </div>
        </>
      )}

      {resizedPreview && (
        <div style={{ marginTop: "30px" }}>
          <h3>Resized Preview</h3>

          <img
            src={resizedPreview}
            alt="Resized"
            style={{
              maxWidth: "100%",
              maxHeight: "350px",
              borderRadius: "10px",
            }}
          />

          <br />

          <button
            onClick={downloadImage}
            style={{
              marginTop: "15px",
              padding: "12px 20px",
              cursor: "pointer",
            }}
          >
            Download Image
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageResizer;
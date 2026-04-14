type ImageUploaderProps = {
  onFileSelected: (file: File) => void;
  previewUrl?: string;
};

export default function ImageUploader({
  onFileSelected,
  previewUrl,
}: ImageUploaderProps) {
  return (
    <section className="uploader-stage" aria-label="image upload panel">
      <label className="uploader" htmlFor="image-upload">
        <span className="uploader__title">Upload Image</span>
        <span className="uploader__copy">
          PNG, JPG, or WebP. Start with a strong silhouette for cleaner pixel
          reduction.
        </span>
        <input
          id="image-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onFileSelected(file);
            }
          }}
        />
      </label>

      {previewUrl ? (
        <img
          className="source-preview"
          src={previewUrl}
          alt="Uploaded source preview"
        />
      ) : (
        <div className="empty-state">
          Drop in an image to compare its source silhouette against the reduced
          grid.
        </div>
      )}
    </section>
  );
}

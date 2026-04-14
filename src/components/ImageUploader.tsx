type ImageUploaderProps = {
  onFileSelected: (file: File) => void;
  previewUrl?: string;
};

export default function ImageUploader({
  onFileSelected,
  previewUrl,
}: ImageUploaderProps) {
  return (
    <section className="uploader-stage" aria-label="图片上传区域">
      <label className="uploader" htmlFor="image-upload">
        <span className="uploader__title">上传图片</span>
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
          alt="已上传原图预览"
        />
      ) : (
        <div className="empty-state">
          上传图片后开始。
        </div>
      )}
    </section>
  );
}

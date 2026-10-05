/**
 * Compresses an image file in the browser using an off-screen HTML5 Canvas.
 * Reduces 5MB+ phone camera photos to ~100-200 KB in milliseconds before uploading,
 * ensuring lightning-fast uploads on slow 3G/4G networks and saving Cloudinary bandwidth.
 */
export async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  // If not an image, return original
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }

  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

  // If PNG and reasonably sized (< 1MB), return original to preserve crisp alpha transparency for team logos
  if (isPng && file.size < 1024 * 1024) {
    return file;
  }

  // If already small (< 250 KB), return as is
  if (file.size < 250 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let { width, height } = img;

        // If dimensions are within bounds and it's PNG, return original
        if (isPng && width <= maxWidth && height <= maxHeight) {
          resolve(file);
          return;
        }

        // Calculate proportional dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw with smoothing for high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        if (isPng) {
          // Preserve transparent alpha channel for team and tournament logos
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/png',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/png'
          );
        } else {
          // Compress camera photos into lightweight JPEG
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}


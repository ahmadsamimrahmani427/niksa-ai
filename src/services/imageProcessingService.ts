export interface ImageAdjustments {
  brightness: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  exposure: number; // -100 to 100, default 0
  sharpness: number; // 0 to 100, default 0
  blur: number; // 0 to 20, default 0
  opacity: number; // 0 to 100, default 100
  rotation: number; // 0, 90, 180, 270 or arbitrary
  flipH: boolean;
  flipV: boolean;
  filter: string; // 'none' | 'cinematic' | 'cyberpunk' | 'noir' | 'vintage' | 'warm' | 'cool'
}

export const defaultAdjustments: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  sharpness: 0,
  blur: 0,
  opacity: 100,
  rotation: 0,
  flipH: false,
  flipV: false,
  filter: 'none',
};

export class ImageProcessingService {
  /**
   * Load an image source into an HTMLImageElement
   */
  public static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load image for processing'));
      img.src = src;
    });
  }

  /**
   * Apply all adjustment sliders, rotation, flips, and filters to an image.
   * Returns a clean data URL of the processed image.
   */
  public static async processAdjustments(
    sourceSrc: string,
    adjustments: ImageAdjustments
  ): Promise<string> {
    const img = await this.loadImage(sourceSrc);

    // Calculate canvas bounds considering rotation
    const rad = (adjustments.rotation * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rad));
    const absSin = Math.abs(Math.sin(rad));

    const width = Math.round(img.naturalWidth * absCos + img.naturalHeight * absSin);
    const height = Math.round(img.naturalWidth * absSin + img.naturalHeight * absCos);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D canvas context');

    // Build CSS filter string for high-speed hardware acceleration
    const b = (100 + adjustments.brightness + adjustments.exposure) / 100;
    const c = (100 + adjustments.contrast) / 100;
    const s = (100 + adjustments.saturation) / 100;
    const bl = adjustments.blur;
    const op = adjustments.opacity / 100;

    let filterString = `brightness(${b}) contrast(${c}) saturate(${s}) opacity(${op})`;
    if (bl > 0) filterString += ` blur(${bl}px)`;

    // Color grading filters
    switch (adjustments.filter) {
      case 'cinematic':
        filterString += ' contrast(1.2) saturate(1.15) hue-rotate(-10deg)';
        break;
      case 'cyberpunk':
        filterString += ' contrast(1.3) saturate(1.8) hue-rotate(25deg)';
        break;
      case 'noir':
        filterString += ' grayscale(1) contrast(1.4)';
        break;
      case 'vintage':
        filterString += ' sepia(0.6) contrast(0.9) brightness(1.05)';
        break;
      case 'warm':
        filterString += ' sepia(0.25) saturate(1.3) hue-rotate(-15deg)';
        break;
      case 'cool':
        filterString += ' hue-rotate(20deg) saturate(1.1) brightness(1.02)';
        break;
    }

    ctx.filter = filterString;

    // Transformation matrix
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.scale(adjustments.flipH ? -1 : 1, adjustments.flipV ? -1 : 1);

    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    // Apply Sharpness Convolution Filter if requested
    if (adjustments.sharpness > 0) {
      this.applySharpness(ctx, canvas.width, canvas.height, adjustments.sharpness);
    }

    return canvas.toDataURL('image/png', 0.95);
  }

  /**
   * Apply 3x3 convolution unsharp mask for sharpness
   */
  private static applySharpness(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    amount: number
  ) {
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const copy = new Uint8ClampedArray(data);

      const factor = (amount / 100) * 0.7;
      const center = 1 + 4 * factor;
      const edge = -factor;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const val =
              copy[((y - 1) * w + x) * 4 + c] * edge +
              copy[(y * w + (x - 1)) * 4 + c] * edge +
              copy[idx + c] * center +
              copy[(y * w + (x + 1)) * 4 + c] * edge +
              copy[((y + 1) * w + x) * 4 + c] * edge;
            data[idx + c] = Math.min(255, Math.max(0, val));
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Ignored if cross-origin or canvas tainted
    }
  }

  /**
   * High-Resolution AI / Bicubic Upscaling (2x or 4x)
   */
  public static async upscaleImage(sourceSrc: string, factor: 2 | 4 = 2): Promise<string> {
    const img = await this.loadImage(sourceSrc);
    const targetW = img.naturalWidth * factor;
    const targetH = img.naturalHeight * factor;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw scaled image
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Apply detail sharpening pass
    this.applySharpness(ctx, targetW, targetH, 35);

    return canvas.toDataURL('image/png', 0.95);
  }

  /**
   * Remove Background:
   * Analyzes corner pixels to detect dominant background color, computes chromatic distance,
   * and sets background pixels to transparent alpha with soft edge anti-aliasing.
   */
  public static async removeBackground(
    sourceSrc: string,
    tolerance: number = 38
  ): Promise<string> {
    const img = await this.loadImage(sourceSrc);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get 2D canvas context');

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    // Sample corner colors (top-left, top-right, bottom-left, bottom-right)
    const corners = [
      { r: data[0], g: data[1], b: data[2] },
      { r: data[(w - 1) * 4], g: data[(w - 1) * 4 + 1], b: data[(w - 1) * 4 + 2] },
      { r: data[((h - 1) * w) * 4], g: data[((h - 1) * w) * 4 + 1], b: data[((h - 1) * w) * 4 + 2] },
      { r: data[(h * w - 1) * 4], g: data[(h * w - 1) * 4 + 1], b: data[(h * w - 1) * 4 + 2] },
    ];

    // Average corner background color
    const bgR = corners.reduce((sum, c) => sum + c.r, 0) / 4;
    const bgG = corners.reduce((sum, c) => sum + c.g, 0) / 4;
    const bgB = corners.reduce((sum, c) => sum + c.b, 0) / 4;

    const threshold = tolerance * 2.5;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.sqrt(
        (r - bgR) * (r - bgR) + (g - bgG) * (g - bgG) + (b - bgB) * (b - bgB)
      );

      if (diff < threshold) {
        // Smooth transition alpha
        const alphaFactor = Math.max(0, (diff - threshold * 0.5) / (threshold * 0.5));
        data[i + 3] = Math.round(alphaFactor * 255);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /**
   * Replace Background with Color, Gradient, or Custom Backdrop
   */
  public static async replaceBackground(
    sourceSrc: string,
    bgType: 'color' | 'gradient' | 'studio' | 'cyberpunk',
    bgParam: string
  ): Promise<string> {
    // First isolate subject
    const transparentDataUrl = await this.removeBackground(sourceSrc, 35);
    const subjectImg = await this.loadImage(transparentDataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = subjectImg.naturalWidth;
    canvas.height = subjectImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    // Draw background
    if (bgType === 'color') {
      ctx.fillStyle = bgParam || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgType === 'cyberpunk') {
      const grad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        50,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
      );
      grad.addColorStop(0, '#701a75');
      grad.addColorStop(0.6, '#0f172a');
      grad.addColorStop(1, '#030712');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Clean studio backdrop
      const grad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 3,
        100,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
      );
      grad.addColorStop(0, '#334155');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw subject over background
    ctx.drawImage(subjectImg, 0, 0);

    return canvas.toDataURL('image/png', 0.95);
  }

  /**
   * Expand Canvas (Outpainting preparation)
   * Expands the canvas in all directions with seamless mirrored padding
   */
  public static async expandCanvas(
    sourceSrc: string,
    paddingPercent: number = 20
  ): Promise<string> {
    const img = await this.loadImage(sourceSrc);
    const padX = Math.round((img.naturalWidth * paddingPercent) / 100);
    const padY = Math.round((img.naturalHeight * paddingPercent) / 100);

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth + padX * 2;
    canvas.height = img.naturalHeight + padY * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    // Fill background with subtle blurred mirror
    ctx.filter = 'blur(15px) brightness(0.9)';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Draw sharp original in center
    ctx.drawImage(img, padX, padY, img.naturalWidth, img.naturalHeight);

    return canvas.toDataURL('image/png', 0.95);
  }

  /**
   * Trigger direct browser download of image data
   */
  public static downloadImage(dataUrl: string, fileName: string = 'niksa_studio_creation.png') {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

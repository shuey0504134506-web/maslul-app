/**
 * מקטין תמונה לריבוע קטן (חיתוך מהמרכז) ומחזיר אותה כ-data URL קטן (~20-40KB).
 * משמש לתמונת הפרופיל של הילד: היא נשמרת ישירות ברשומת הילד, ולכן
 * עובדת אופליין ומסתנכרנת לענן יחד עם שאר פרטי הילד - בלי תלות ב-Storage.
 */
export async function resizeImageToDataUrl(file: File, size = 360, quality = 0.82): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('לא ניתן לקרוא את התמונה'));
      img.src = url;
    });

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('הדפדפן לא תומך בעיבוד תמונה');
    ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

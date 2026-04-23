import { PDFDocument, rgb, LineCapStyle } from 'pdf-lib';

const parseColor = (colorStr) => {
  if (!colorStr) return { r: 1, g: 1, b: 1 }; // Default white
  
  if (colorStr.startsWith('#')) {
    const r = parseInt(colorStr.slice(1, 3), 16) / 255;
    const g = parseInt(colorStr.slice(3, 5), 16) / 255;
    const b = parseInt(colorStr.slice(5, 7), 16) / 255;
    return { r, g, b };
  }
  
  if (colorStr.startsWith('rgb')) {
    const parts = colorStr.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return {
        r: parseInt(parts[0]) / 255,
        g: parseInt(parts[1]) / 255,
        b: parseInt(parts[2]) / 255
      };
    }
  }
  
  return { r: 1, g: 1, b: 1 };
};

export const exportPdf = async (originalFile, allPagesLayersData) => {
  const originalArrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  
  const pages = pdfDoc.getPages();

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    
    const pageData = allPagesLayersData[pageIndex];
    if (!pageData || !pageData.objects) continue;

    const scaleRatioX = width / pageData.viewportWidth;
    const scaleRatioY = height / pageData.viewportHeight;

    for (const obj of pageData.objects) {
      if (obj.type === 'mask') {
        const { r, g, b } = parseColor(obj.fill);
        // Draw a rectangle over the target area to 'cut' it out visually
        page.drawRectangle({
          x: obj.left * scaleRatioX,
          y: height - ((obj.top + obj.height) * scaleRatioY),
          width: obj.width * scaleRatioX,
          height: obj.height * scaleRatioY,
          color: rgb(r, g, b)
        });
      } else if (obj.type === 'image' && obj.src) {
        // Embed and draw image (the copied text snippet)
        let img;
        try {
          if (obj.src.startsWith('data:image/png') || obj.src.startsWith('blob:')) {
            // For blobs created via URL.createObjectURL, we need to fetch them
            const imgData = await fetch(obj.src).then(res => res.arrayBuffer());
            img = await pdfDoc.embedPng(imgData);
          } else {
            img = await pdfDoc.embedJpg(obj.src);
          }
        } catch (e) {
          console.error("Error embedding image:", e);
        }

        if (img) {
          page.drawImage(img, {
            x: obj.left * scaleRatioX,
            y: height - ((obj.top + obj.height) * scaleRatioY),
            width: obj.width * scaleRatioX * (obj.scaleX || 1),
            height: obj.height * scaleRatioY * (obj.scaleY || 1),
          });
        }
      } else if (obj.type === 'stroke' && obj.points && obj.points.length > 1) {
        const { r, g, b } = parseColor(obj.color);
        for (let i = 0; i < obj.points.length - 1; i++) {
          const p1 = obj.points[i];
          const p2 = obj.points[i+1];
          page.drawLine({
            start: { x: p1.x * scaleRatioX, y: height - (p1.y * scaleRatioY) },
            end: { x: p2.x * scaleRatioX, y: height - (p2.y * scaleRatioY) },
            thickness: obj.strokeWidth * scaleRatioX,
            color: rgb(r, g, b),
            lineCap: LineCapStyle.Round,
          });
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

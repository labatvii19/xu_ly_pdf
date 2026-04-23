import { PDFDocument, rgb, LineCapStyle } from 'pdf-lib';

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
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
        // Draw a rectangle over the target area to 'cut' it out visually
        page.drawRectangle({
          x: obj.left * scaleRatioX,
          y: height - ((obj.top + obj.height) * scaleRatioY),
          width: obj.width * scaleRatioX,
          height: obj.height * scaleRatioY,
          color: rgb(1, 1, 1) // White rect
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
        const { r, g, b } = hexToRgb(obj.color);
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

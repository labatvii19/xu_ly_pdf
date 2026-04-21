import { PDFDocument } from 'pdf-lib';

export const exportPdf = async (originalFile, allPagesLayersData) => {
  const originalArrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalArrayBuffer);
  
  const pages = pdfDoc.getPages();

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    
    // allPagesLayersData in format: { [pageIndex]: { objects: [...fabricObjects], scale: number } }
    const pageData = allPagesLayersData[pageIndex];
    if (!pageData || !pageData.objects) continue;

    const scaleRatioX = width / pageData.viewportWidth;
    const scaleRatioY = height / pageData.viewportHeight;

    for (const obj of pageData.objects) {
      if (obj.type === 'rect' && !obj.fill.includes('transparent')) {
        // Draw a rectangle over the target area to 'cut' it out visually
        page.drawRectangle({
          x: obj.left * scaleRatioX,
          y: height - ((obj.top + obj.height) * scaleRatioY), // pdf-lib y-axis is from bottom
          width: obj.width * scaleRatioX,
          height: obj.height * scaleRatioY,
          color: { type: 'RGB', red: 1, green: 1, blue: 1 } // White rect
        });
      } else if (obj.type === 'image' && obj.src) {
        // Embed and draw image (the copied text snippet)
        let img;
        if (obj.src.startsWith('data:image/png')) {
          img = await pdfDoc.embedPng(obj.src);
        } else if (obj.src.startsWith('data:image/jpeg')) {
          img = await pdfDoc.embedJpg(obj.src);
        }

        if (img) {
          page.drawImage(img, {
            x: obj.left * scaleRatioX,
            y: height - ((obj.top + obj.height) * scaleRatioY), // Adjust pdf-lib coordinate system
            width: obj.width * scaleRatioX * obj.scaleX,
            height: obj.height * scaleRatioY * obj.scaleY,
          });
        }
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

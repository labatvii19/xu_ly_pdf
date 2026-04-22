import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerURL from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerURL;

export const loadPdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument(arrayBuffer);
  return await loadingTask.promise;
}

export const renderPageToCanvas = async (page, canvasElement, scale = 1.0) => {
  const viewport = page.getViewport({ scale });
  canvasElement.height = viewport.height;
  canvasElement.width = viewport.width;

  const renderContext = {
    canvasContext: canvasElement.getContext('2d'),
    viewport: viewport,
  };
  await page.render(renderContext).promise;
  return viewport;
}

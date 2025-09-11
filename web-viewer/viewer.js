/*
================================================================================
File: 📁 smanung-library-bot/web-viewer/viewer.js
Tujuan: Menangani rendering PDF di halaman web menggunakan PDF.js.
================================================================================
*/

// Import getDocument dan GlobalWorkerOptions langsung dari modul PDF.js
import { getDocument, GlobalWorkerOptions } from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';

// Set the worker source for PDF.js
GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

async function renderPdf() {
    const params = new URLSearchParams(window.location.search);
    const filename = params.get('file');

    if (!filename) {
        document.body.innerHTML = '<h1>E-book tidak ditemukan.</h1><p>Pastikan Anda mengakses halaman ini dengan link yang benar.</p>';
        return;
    }

    const loadingMessage = document.getElementById('loading-message');
    const viewerContainer = document.getElementById('viewer-container');
    const titleElement = document.querySelector('h1');
    const downloadButton = document.getElementById('download-button'); // Get the download button

    try {
        // The PDF file will be served from the /public/ebooks/ directory by the Express server
        const pdfUrl = filename;
        
        // Set download button attributes
        downloadButton.href = pdfUrl;
        downloadButton.download = filename; // Suggests the filename for download
        downloadButton.style.display = 'block'; // Make the button visible

        // Load the PDF document
        const loadingTask = getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        titleElement.textContent = `Membaca: ${decodeURIComponent(filename)}`;
        loadingMessage.style.display = 'none';

        // Loop through each page and render it
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const containerWidth = viewerContainer.clientWidth; // Get the current width of the container
            const viewport = page.getViewport({ scale: 1 }); // Start with a scale of 1 to get natural size
            const scale = containerWidth / viewport.width; // Calculate scale to fit container width

            const renderScale = 2; // Factor to increase rendering resolution (e.g., 2 for 2x resolution)
            const scaledViewport = page.getViewport({ scale: scale * renderScale }); // Use the calculated scale multiplied by renderScale

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            // Set CSS dimensions to control display size, effectively downscaling for sharper image
            canvas.style.width = `${containerWidth}px`;
            canvas.style.height = `${scaledViewport.height / renderScale}px`;

            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport,
            };
            await page.render(renderContext).promise;

            viewerContainer.appendChild(canvas);

            // Add page number below each canvas
            const pageNumberDiv = document.createElement('div');
            pageNumberDiv.className = 'page-number';
            pageNumberDiv.textContent = `Halaman ${pageNum} dari ${pdf.numPages}`;
            viewerContainer.appendChild(pageNumberDiv);
        }
    } catch (error) {
        console.error('Error rendering PDF:', error);
        titleElement.textContent = 'Gagal Memuat E-book';
        loadingMessage.textContent = 'Terjadi kesalahan saat memuat e-book. Pastikan file ada dan formatnya benar.';
        loadingMessage.style.color = 'red';
    }
}

// Ensure the DOM is fully loaded before trying to render
document.addEventListener('DOMContentLoaded', renderPdf);
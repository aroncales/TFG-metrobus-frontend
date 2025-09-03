// src/components/PdfViewer.jsx
import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import '../styles/pdf-overrides.css';

//  Opción A (preferida): importar el worker como Worker real vía Vite
pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Si tu paquete no trae .mjs, usa .js:
// import PDFWorker from 'pdfjs-dist/build/pdf.worker.min.js?worker';
// pdfjs.GlobalWorkerOptions.workerPort = new PDFWorker();



export default function PdfViewer({ url, className = '' }) {
  const wrapRef = React.useRef(null);
  const [wrapWidth, setWrapWidth] = React.useState(0);
  const [numPages, setNumPages] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapWidth(el.clientWidth || 360));
    ro.observe(el);
    setWrapWidth(el.clientWidth || 360);
    return () => ro.disconnect();
  }, []);

  if (!url) {
    return (
      <div className={`w-full h-full grid place-items-center ${className}`}>
        <div className="text-sm text-gray-700">URL vacía</div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`w-full h-full overflow-auto overscroll-contain bg-gray-100 ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }} // iOS: scroll suave
    >
      {/* Reglas mínimas para que no haya huecos y se vea limpio */}
      <style>{`
        .react-pdf__Document { display:block !important; }
        .react-pdf__Page { margin:0 !important; padding:0 !important; border:0 !important; }
        .react-pdf__Page + .react-pdf__Page { margin-top:0 !important; }
        .react-pdf__Page__canvas { display:block !important; }
      `}</style>

      <Document
        file={url}
        onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoading(false); setError(null); }}
        onLoadError={(e) => { setError(e?.message || 'No se pudo cargar'); setLoading(false); }}
        loading={
          <div className="w-full h-full grid place-items-center">
            <div className="rounded bg-white/90 border border-gray-200 px-3 py-2 text-sm text-gray-700">
              Cargando documento…
            </div>
          </div>
        }
        error={
          <div className="w-full h-full grid place-items-center">
            <div className="text-center text-sm text-gray-700">No se pudo abrir el PDF.</div>
          </div>
        }
      >
        {!loading && numPages ? (
          // Contenedor de páginas centrado (PC) y sin separación
          <div
            className="mx-auto"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',   // 👈 centra en PC
              gap: 0,                 // 👈 sin huecos
              maxWidth: 1200
            }}
          >
            {Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i}
                pageNumber={i + 1}
                width={wrapWidth ? Math.min(wrapWidth, 1200) : undefined}
                renderAnnotationLayer={false}  // sin capas → sin “páginas fantasma”
                renderTextLayer={false}
                style={{ margin: 0, padding: 0, background: '#fff', display: 'block' }}
              />
            ))}
          </div>
        ) : null}
      </Document>

      {error && (
        <div className="w-full h-full grid place-items-center">
          <div className="text-center text-sm text-red-600 px-4">{error}</div>
        </div>
      )}
    </div>
  );
}
import React from 'react';

export default function InfoModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1400]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true"/>
      <div
        role="dialog" aria-modal="true" aria-label="Información de la aplicación"
        className="absolute inset-x-4 top-[10vh] md:inset-x-0 md:max-w-lg md:mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFA300]/10 text-[#FFA300] grid place-items-center text-lg font-semibold">i</div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Sobre esta app</h2>
            <p className="mt-1 text-sm text-gray-700">
              Esta aplicación forma parte de un <strong>Trabajo Fin de Grado</strong>. No está vinculada a la ATMV ni a las empresas concesionarias y no persigue rédito económico.
              Los datos se utilizan exclusivamente con <em>fines académicos y de demostración</em>.
            </p>
            <p className="mt-2 text-sm text-gray-700">
              Realizado por Adrián Roncales Guillén | Grado en Ingeniería Informática | ETSINF UPV.
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
  onClick={onClose}
  className="mt-4 inline-flex items-center justify-center rounded-md border border-gray-300
             bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
>
  Cerrar
</button>

        </div>
      </div>
    </div>
  );
}

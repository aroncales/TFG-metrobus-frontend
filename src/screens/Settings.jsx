import React from 'react';

export default function Settings() {
  return (
    <div id="panel-settings" className="p-4" style={{ paddingBottom: 'var(--nav-h,56px)' }}>
      <h1 className="text-lg font-semibold mb-2">Configuración</h1>
      <ul className="text-sm text-gray-700 space-y-2">
        <li>• Tema (claro/oscuro)</li>
        <li>• Accesibilidad</li>
        <li>• Permisos (ubicación, etc.)</li>
      </ul>
    </div>
  );
}

import React from 'react';

export default function ChatPageMinimal() {
  return (
    <div>
      <h1>Mensajes</h1>
      <p>Chat page minimal test</p>
      <input placeholder="Buscar contactos..." />
      <div>
        <p>Contactos de prueba:</p>
        <button>Juan Pérez</button>
        <button>María García</button>
      </div>
    </div>
  );
}


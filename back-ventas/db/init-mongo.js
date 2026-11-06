// Ejecutado por mongo en el primer arranque (volumen vacío), sobre MONGO_INITDB_DATABASE.
const database = db.getSiblingDB('ventas');

if (!database.getCollectionNames().includes('ventas')) {
  database.createCollection('ventas');
}
database.ventas.createIndex({ clienteId: 1 }, { name: 'idx_clienteId' });
database.ventas.createIndex({ fecha: -1 }, { name: 'idx_fecha' });

// Seed: clienteId coincide con los clientes sembrados en back-clientes/db/init.sql
const seed = [
  {
    _id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    clienteId: '11111111-1111-4111-8111-111111111111',
    lineas: [
      { producto: 'Teclado', cantidad: 2, precioUnitario: 50, subtotal: 100 },
      { producto: 'Mouse', cantidad: 1, precioUnitario: 25.5, subtotal: 25.5 },
    ],
    total: 125.5,
    fecha: new Date('2026-10-01T10:00:00Z'),
  },
  {
    _id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    clienteId: '22222222-2222-4222-8222-222222222222',
    lineas: [{ producto: 'Monitor', cantidad: 1, precioUnitario: 300, subtotal: 300 }],
    total: 300,
    fecha: new Date('2026-10-15T15:30:00Z'),
  },
];
for (const doc of seed) {
  database.ventas.updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
}
print('init-mongo: colección ventas lista, docs=' + database.ventas.countDocuments());

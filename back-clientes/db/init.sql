-- Ejecutado automáticamente por postgres en el primer arranque (volumen vacío).
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() es nativo en PG13+, se deja por compatibilidad

CREATE TABLE IF NOT EXISTS clientes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  email      text NOT NULL UNIQUE,
  documento  text NOT NULL,
  telefono   text NULL,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO clientes (id, nombre, email, documento, telefono) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Ana Torres',     'ana.torres@example.com',     '10203040', '+57 300 111 2233'),
  ('22222222-2222-4222-8222-222222222222', 'Bruno Díaz',     'bruno.diaz@example.com',     '20304050', NULL),
  ('33333333-3333-4333-8333-333333333333', 'Carla Méndez',   'carla.mendez@example.com',   '30405060', '+57 310 444 5566')
ON CONFLICT (email) DO NOTHING;

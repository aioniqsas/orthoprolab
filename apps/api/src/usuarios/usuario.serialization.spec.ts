import { instanceToPlain } from 'class-transformer';
import { Usuario } from './usuario.entity.js';

// The sensitive columns are removed from the HTTP response only. The entity
// keeps them (the auth layer reads passwordHash), so this test pins the
// serialization contract, not the storage.
describe('Usuario serialization', () => {
  const usuario = Object.assign(new Usuario(), {
    id: 'u-1',
    nombres: 'Ana',
    apellidos: 'Pérez',
    correo: 'ana@example.com',
    cedula: '1098765432',
    cedulaHash: 'a'.repeat(64),
    passwordHash: '$2b$12$hash',
    resetTokenHash: 'b'.repeat(64),
    resetTokenExpires: new Date('2026-01-01'),
    rolId: '1',
    activo: true,
  });

  it('keeps the public fields a view needs', () => {
    const plain = instanceToPlain(usuario) as Record<string, unknown>;
    expect(plain).toMatchObject({ id: 'u-1', nombres: 'Ana', apellidos: 'Pérez', activo: true });
  });

  it.each(['passwordHash', 'cedulaHash', 'cedula', 'resetTokenHash', 'resetTokenExpires', 'correo'])(
    'never serializes %s',
    (campo) => {
      const plain = instanceToPlain(usuario) as Record<string, unknown>;
      expect(plain).not.toHaveProperty(campo);
    },
  );

  it('still holds the value on the entity (storage is unchanged)', () => {
    expect(usuario.passwordHash).toBe('$2b$12$hash');
    expect(usuario.cedula).toBe('1098765432');
  });
});

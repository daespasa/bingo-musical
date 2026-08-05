/**
 * Los tests unitarios no deben depender de un `.env` presente en disco ni de
 * credenciales reales: fijan valores deterministas para lo que exige la
 * validación de entorno y dejan sin configurar los proveedores externos,
 * de modo que también se cubre el camino "sin Spotify / sin Google".
 */
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET ??= 'test-session-secret-suficientemente-largo';
process.env.GUEST_TOKEN_SECRET ??= 'test-guest-secret-suficientemente-largo';
process.env.DATABASE_URL ??= 'postgresql://bingo:bingo@localhost:5432/bingo_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.WEB_URL ??= 'http://localhost:3000';
process.env.API_URL ??= 'http://localhost:3001';
delete process.env.SPOTIFY_CLIENT_ID;
delete process.env.SPOTIFY_CLIENT_SECRET;
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;

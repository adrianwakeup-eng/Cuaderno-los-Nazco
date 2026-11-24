# Cuaderno los Nazco

Red social privada familiar inspirada en Facebook + Messenger, con videollamadas WebRTC integradas y Panel de Administración centralizado.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3001/` en tu navegador. Puedes abrir dos pestañas distintas (por ejemplo con **Adrián** y **Elena**) para ver la sincronización en tiempo real de mensajes, indicador *"escribiendo…"*, muro y feature flags.

## Arquitectura del proyecto

- `src/types/index.ts` — Contratos TypeScript de usuarios, muro, hilos de comentarios, chats, llamadas, invitaciones y feature flags.
- `src/services/storageService.ts` — Almacenamiento persistente en IndexedDB, compresión automática de fotos vía Canvas y cálculo de consumo de medios.
- `src/services/familyRepository.ts` — Capa de datos desacoplada (respaldo/restauración JSON, lista para conectar Supabase o Firebase Firestore).
- `src/services/realtimeBus.ts` — Sincronización en vivo entre pestañas (`BroadcastChannel`) que replica el contrato de eventos de Supabase Realtime / Socket.IO.
- `src/services/webrtcService.ts` — Controlador WebRTC (cámara, micrófono, compartir pantalla, cambio de cámara, ICE/STUN/TURN y señalización PeerJS).
- `src/components/feed/` — Muro familiar, creador rápido con grabador de voz, reacciones y comentarios anidados.
- `src/components/messenger/` — Chats 1 a 1 y grupales con imágenes, notas de voz e inicio de llamada directo.
- `src/components/calls/` — Hub de salas familiares y vista de videollamada a pantalla completa.
- `src/components/profile/` — Perfiles individuales estilo Facebook (portada, avatar, biografía y muro propio).
- `src/components/admin/` — Panel de Administración (miembros, invitaciones, moderación, almacenamiento y feature flags).

## Qué conectar para producción real

1. **Autenticación real:** Supabase Auth o Firebase Auth (correo/contraseña, Magic Links o Google OAuth) validando el código de invitación familiar en el backend.
2. **Base de datos y tiempo real:** Reemplazar `familyRepository.ts` + `realtimeBus.ts` por tablas PostgreSQL con Row Level Security (Supabase Realtime) o colecciones de Firestore (`onSnapshot`).
3. **Almacenamiento de foto/video/audio:** Subir los blobs de `storageService.ts` mediante URLs firmadas a Cloudflare R2, Amazon S3 o Firebase Storage (con transcodificación opcional para videos largos).
4. **Señalización y TURN para videollamadas:** Configurar un servidor **TURN** (Coturn / Metered / Cloudflare Calls) en `.env` (`VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`) o migrar `webrtcService.ts` a un SFU gestionado como **LiveKit** para llamadas grupales de 4+ familiares en redes 4G/CGNAT.

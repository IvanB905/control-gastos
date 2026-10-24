# Preparación móvil (iOS y Android)

La aplicación web se empaqueta con Capacitor para reutilizar React y Vite. La web existente continúa desplegándose en Vercel; cada app móvil carga el contenido web compilado dentro de su propio contenedor nativo.

## Estado

- Capacitor 8 y sus complementos Android, iOS, App y Browser quedan configurados en `package.json`.
- El identificador `com.ivanb905.finanza` es provisional. Definir el nombre e identificador finales antes de crear las fichas de tienda.
- La app requiere conexión a internet para sincronizar con Supabase.
- El flujo de OAuth con Google todavía necesita callback de deep link nativo y configuración de redirect URL en Supabase y Google.
- Los recursos de icono vectoriales son para web/PWA. Para las tiendas se deben generar y revisar los tamaños PNG requeridos dentro de cada proyecto nativo.
- Los proyectos nativos `android/` e `ios/` ya están generados y sincronizados con el build web.
- Este equipo quedó usando Node.js 24.11.1, compatible con Capacitor 8.
- Hay un APK de depuración generado localmente para instalarlo y revisar la vista móvil. Aún no existe un APK/AAB de lanzamiento firmado ni una IPA, y la app no se ha publicado en las tiendas.
- Android incluye un lector opcional para pagos, ingresos y transferencias de apps bancarias y billeteras conocidas de Colombia: Bancolombia, Nequi, BBVA, Banco de Bogotá, Banco Caja Social, Davivienda, DaviPlata, DAVIbank, Banco de Occidente, Banco Agrario, bico, Lulo y Nu. La lista se valida por identificador exacto; otros proveedores requieren agregarse explícitamente. El servicio conserva como máximo 50 borradores interpretados en el dispositivo y no guarda el texto completo. El usuario revisa monto, fecha, dirección, cuenta y categoría; solo entonces se crea el movimiento en Supabase.
- La lectura entre aplicaciones solo está disponible en la app Android instalada. La versión web y la app iOS no acceden a notificaciones de otras apps.
- Antes de solicitar publicación en Google Play, la ficha y la política de privacidad deben explicar el acceso a notificaciones y declarar correctamente la información financiera procesada. La autorización técnica de Android no garantiza la aprobación de Google Play.

## Requisitos locales

- Node.js 22 o superior y npm.
- Android: Android Studio con Android SDK y herramientas de compilación actuales.
- iOS: macOS con Xcode; este proyecto no puede compilarse para iOS desde Windows.
- Publicación: cuentas de Google Play Console y Apple Developer Program. Para una cuenta personal nueva de Google Play puede aplicar un periodo de pruebas cerradas antes de solicitar acceso a producción.

## Generar proyectos nativos

Después de instalar requisitos y fijar el identificador final:

```sh
npm install
npm run build
npx cap add android
npx cap add ios
npm run cap:sync
npm run cap:android
# En macOS:
npm run cap:ios
```

Las futuras actualizaciones del frontend requieren `npm run build` y `npm run cap:sync` antes de compilar los binarios.

## Pendientes antes de distribuir

1. Confirmar nombre comercial, identificador de paquete, iconos y capturas de tienda.
2. Implementar y probar OAuth con callback nativo y Universal Links/App Links según corresponda.
3. Publicar una política de privacidad, enlazarla dentro de la app y en las fichas de las tiendas, y completar las declaraciones de datos.
4. Implementar eliminación de cuenta desde la app y definir qué datos se eliminan, como exigen las tiendas para apps que permiten crear cuentas.
5. Revisar los criterios de Apple para apps financieras y la regla de funcionalidad mínima: la aprobación no se puede garantizar por tener un contenedor Capacitor.
6. Preparar firma, capturas, descripción, clasificación por edades, pruebas en dispositivos y revisión de políticas.

## Referencias oficiales

- [Capacitor](https://capacitorjs.com/docs)
- [Android `NotificationListenerService`](https://developer.android.com/reference/android/service/notification/NotificationListenerService)
- [Android `NotificationManager.isNotificationListenerAccessGranted`](https://developer.android.com/reference/android/app/NotificationManager#isNotificationListenerAccessGranted(android.content.ComponentName))
- [Política de Google Play sobre información sensible](https://support.google.com/googleplay/android-developer/answer/16558241)
- [Requisitos de entorno de Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Crear y configurar una app en Google Play](https://support.google.com/googleplay/android-developer/answer/9859152)

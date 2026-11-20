# Seguridad

No publiques credenciales ni datos personales en este repositorio. Para informar una vulnerabilidad, contacta al responsable del proyecto fuera de un issue público.

Si una clave se filtra, revócala inmediatamente en su proveedor, configura una nueva en el almacén de secretos correspondiente y elimina la exposición del historial Git. Las claves públicas de Supabase (`anon`/publishable) no reemplazan las políticas RLS; nunca publiques `service_role`.

Las contribuciones deben pasar ESLint, pruebas, auditoría npm, CodeQL y Gitleaks antes de integrarse a `main`.

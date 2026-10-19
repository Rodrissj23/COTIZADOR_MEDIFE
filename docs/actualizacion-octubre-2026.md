# Tarifario octubre 2026

Fuente: `Copia de Cotizador Individual_202610.xlsx`, recibido el 19/10/2026.

## Datos aplicados

- Cinco regiones: AMBA, Norte, Sur, Patagonia y Bahía/MDQ.
- `Resumen LP`: 1.414 importes de las filas que ya utilizaba el cotizador, columnas E:K para Obligatorio y N:T para Voluntario. Se conserva cada valor almacenado, incluidos ceros de combinaciones no aplicables.
- Las filas de pareja provienen de `ESPOSO (A)`, no de los totales MAT del PDF.
- `C aux!B9`: tope de remuneración de 4.771.508,194. La fórmula de aporte se conserva.
- `C aux!D17:D27`: importes computables de monotributo A–K, sin cambios frente a septiembre.
- `Políticas Comerciales`, filas 50–87, columnas M:S: 38 políticas tácticas de octubre. La condición CÓRDOBA/NOA se representa con dos reglas equivalentes. Las condiciones específicas se evalúan antes que las regionales para respetar las excepciones, como San Juan y Mercedes.
- No cambian las regiones habilitadas, las suspensiones, la exclusión de MEDIFÉ+, INDIE solo AMBA ni el límite de hijos de 29 años.
- No se agregan los recargos regionales por segunda vez: ya están en las matrices.

## Verificación

`tests/fixtures/octubre-2026.json` conserva las celdas de origen, la huella SHA-256 del archivo y las reglas tácticas por fila. `tests/octubre-2026.test.js` verifica la matriz completa y calcula resultados esperados de forma independiente para familias y beneficios seleccionados en el configurador V3. Incluye fronteras etarias, hijos, pareja con edad diferente, IVA, aportes y expiración de tácticos.

Los golden cases publicados en septiembre se mantienen con sus datos históricos en `tests/fixtures/septiembre-2026-data.json`; sus resultados no se reutilizan como precios de octubre. Las suites geográficas y del configurador trabajan con los datos actuales.

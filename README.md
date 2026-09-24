# COTIZADOR_MEDIFE

Cotizador comercial Medifé para Grupo Zeroka, basado en el tarifario de septiembre 2026 provisto por el equipo.

## Estado de lógica — V2.1 auditada

El Excel original se toma como fuente de verdad. La interfaz no debe inventar descuentos ni simplificar reglas que cambien el resultado.

### Planes comercializados

- INDIE
- Bronce Classic
- Bronce
- Plata
- Oro
- Platinum

**MEDIFÉ+ no se comercializa/rinde en Grupo Zeroka y queda fuera del cotizador.**

### Regiones y filiales

- AMBA: CABA, GBA Norte, GBA Oeste, GBA Sur.
- Norte: Córdoba, Corrientes, Misiones, Noa, Rosario, Santa Fe.
- Sur: Mendoza, Mercedes, San Juan.
- Patagonia: Comahue, Patagonia Norte, Patagonia Sur.
- Bahía/MDQ: Bahía Blanca, Mar del Plata.

Cuando la filial es NOA se solicita provincia: Tucumán, Salta, Jujuy u Otra, porque el descuento permanente del 20% aplica específicamente a Tucumán/Salta/Jujuy.

### Grupo familiar

- Titular y pareja por edad.
- Hijos 0–20: hijo normal.
- 21–25: hijo estudiante.
- 26–29: hijo a cargo.
- AMBA: el ajuste hijos del 45% alcanza las bandas de hijo hasta 29 cuando el plan es elegible.
- Interior: el ajuste hijos del 55% aplica a hijos 0–20; `HIJO MAYOR A CARGO` 21–29 no recibe ese ajuste.

El Excel también contiene bandas `HIJO AD. 30–39`, `HIJO AD. 40–49` y `FAMILIAR A CARGO`. **No se incorporan todavía hasta confirmar que Grupo Zeroka comercializa/rinde esos casos.**

### Aportes

Relación de dependencia:

1. El vendedor ingresa el ítem de Obra Social 3% del recibo.
2. Base interna = `item_3% × 100 / 3`.
3. Aporte computable = `(min(base, tope) × 2,55% + base × 5,10%) × 93%`.
4. Tope de remuneración: `$4.691.748,47`.

Monotributo:

- categoría A–K según tabla del Excel.
- Puede unificarse el aporte de la pareja; se calcula cada integrante y luego se suman los aportes utilizables.

La V2.1 mantiene precisión completa durante los pasos internos y redondea solamente los importes expuestos/finales. Si aportes y descuentos cubren la cuota, el resultado tiene piso en `$0`; nunca se muestra una cuota negativa.

### Orden de cálculo

Conceptualmente:

1. Tarifa de cada integrante.
2. Ajuste hijos.
3. Segmento joven.
4. Descuento permanente de filial.
5. Descuentos estratégicos + Opción 5 + tácticos, con tope comercial del 85%.
6. UCC, cuando corresponde, como empleador acumulable y fuera del tope comercial.
7. IVA 10,5% en Voluntario o descuento de aportes en Obligatorio.
8. GAF / convenio sobre el valor final previo a GAF.
9. Piso final en `$0`.

Los recargos de Patagonia y Bahía/MDQ ya están incluidos en las matrices regionales y **no se vuelven a sumar**.

### Descuentos permanentes de filial

Obligatorio, excepto INDIE:

- Tucumán / Salta / Jujuy: 20%.
- Misiones / Corrientes: 25%.
- Córdoba: 10%.
- Santa Fe: 5%.

### Promociones estratégicas

Se implementan opciones 1, 2, 3, 4, 5 y 7 según las condiciones del Excel.

- Opción 5: acumulable únicamente con 1, 2 o 3 y procedencia comprobable.
- Opción 7: 25% x 24 para ex asociados. Es exclusiva frente a otros descuentos comerciales/tácticos, pero **no elimina ajustes permanentes** de hijos, joven o filial.
- INDIE no recibe descuentos estratégicos; utiliza sus tácticos específicos.
- Si un caso tiene Opción 7 seleccionada y se cotiza INDIE, la Opción 7 se ignora para ese plan y **se conserva el táctico INDIE**.
- El conjunto estratégico + Opción 5 + táctico tiene tope de 85%, tal como el Excel.

### Opción 6 — pendiente de validación

El Excel la relaciona con débito por tarjeta y la describe como concatenable con Opción 4. En la experiencia real de rendición informada por el equipo, el método de pago no fue solicitado.

Por ese motivo, **Opción 6 y la dependencia de TC/CBU están desactivadas en V2.1 hasta confirmar la regla comercial real**. No se debe asumir Opción 4+6 como vigente hasta esa validación.

### Tácticos

La V2.1 incorpora la matriz completa detectada en el Excel, usando categoría + región + filial + edad + plan. El vendedor no los selecciona manualmente.

Incluye reglas específicas para CABA/GBA, Corrientes/Misiones, Córdoba, NOA/Rosario, Mendoza/Mercedes, San Juan, Comahue, Patagonia Norte, Bahía/MDQ e INDIE, entre otras.

### GAF / convenios

GAF se calcula al final, luego de IVA/aportes, y ahora se filtra también por macrozona comercial del Excel.

Mapeo de zonas:

- `AMBA` → región AMBA.
- `NORTE` → región Norte.
- `SUR` → regiones Sur + Patagonia + Bahía/MDQ.
- `NAC / Nacional` → cualquier región.

Opciones detectadas:

- Prestadores Medifé AMBA.
- Clientes Tributo Simple.
- Planes Empleados 10%.
- Planes Empleados 15%.
- ACIPAN.
- Cámara de Comercio Bariloche.
- Ex INVAP Jubilados.
- Prestadores Medifé Sur.
- Prestadores Medifé Norte.

UCC se maneja por separado porque el Excel lo trata como `Empleador acumulable`: 15%, región Norte, antes de IVA/aportes y fuera del tope del 85%.

### Vigencia de cotización

La vigencia correcta es **7 días hábiles desde la emisión**. La referencia anterior de 72 horas fue eliminada de la interfaz y del PDF.

## Pendientes comerciales explícitos

No deben resolverse por inferencia:

1. **Opción 6 / medio de pago:** confirmar si se usa realmente en la operatoria de Grupo Zeroka.
2. **Hijos 30–49 y Familiar a cargo:** confirmar si se rinden/comercializan.
3. **INDIE fuera de AMBA:** el Excel contiene valores estructurales en Interior, pero Grupo Zeroka debe confirmar si realmente se comercializa fuera de AMBA.
4. **Duración `NA` de UCC / Plan Empleados 10%:** actualmente se interpreta como beneficio sin plazo definido hasta nueva confirmación.

## Archivos V2.1

- `js/rules-v2.js`: reglas comerciales recuperadas.
- `js/engine-v2.js`: motor de cálculo auditado.
- `js/app-v2.js`: integración de filial, NOA, GAF y UCC.
- `js/quote-v2.js`: PDF comercial alineado a la lógica vigente.
- `tests/engine-v2.test.js`: golden cases y regresiones de reglas críticas.
- `.github/workflows/medife-logic-tests.yml`: CI automático del motor.

Los archivos anteriores se conservan temporalmente para rollback mientras termina la validación.

## Validación

No alcanza con comprobar que el JavaScript sea internamente consistente. Los casos críticos deben compararse contra números esperados derivados del Excel original.

La suite V2.1 incluye casos para:

- precio base + segmento joven + aportes;
- ajuste hijos AMBA;
- hijo mayor a cargo en Interior;
- descuentos permanentes de filial;
- tácticos por filial;
- Opción 7 y su interacción con INDIE;
- GAF por categoría y macrozona;
- UCC;
- piso de cuota en $0;
- precisión sin redondeos internos anticipados;
- vigencia de 7 días hábiles;
- exclusión de Medifé+;
- desactivación deliberada de Opción 6.

## Netlify

Configurar:

- `AUTH_USER`
- `AUTH_PASSWORD`
- `SESSION_SECRET`

Luego desplegar el repositorio con `netlify.toml` en la raíz.
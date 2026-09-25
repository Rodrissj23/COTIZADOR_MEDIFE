# QA Excel — Cotizador Medifé

Fecha de auditoría: 25/09/2026

## Fuente de verdad

Archivo original: `Cotizador Individual_202609_Provisorio (3).xlsx`.

La auditoría tomó como referencia:

- `Políticas Comerciales`: reglas, descuentos, vigencias, tácticos, GAF y UCC.
- `AMBA` / `Interior`: orden matemático de cálculo.
- `Resumen LP`: tarifas por región, categoría, plan, edad e integrante.
- `C aux`: tope de remuneración, aportes y monotributo.

La hoja `RESUMEN` se utiliza como referencia de presentación y no como oráculo matemático cuando contradice las hojas de cálculo o políticas.

## Comparación masiva

Se construyó un oráculo independiente a partir del Excel y se contrastó contra la lógica actual del motor V2.1.

Resultados:

- 9.612 escenarios lógicos comparados.
- 0 diferencias lógicas detectadas.
- 66.960 resultados mensuales comparados usando la precisión real almacenada en las matrices JavaScript.
- Diferencia máxima frente al valor crudo del Excel: $0,01.
- 94 de 66.960 resultados mensuales difirieron únicamente en un centavo por el almacenamiento de tarifas JavaScript con 4 decimales.
- La interfaz comercial muestra importes en pesos enteros, por lo que esa diferencia no altera el importe visible al vendedor.

## Cobertura

Se verificaron, entre otros:

- 6 planes comerciales: INDIE, Bronce Classic, Bronce, Plata, Oro y Platinum.
- Obligatorio y Voluntario.
- AMBA, Norte, Sur, Patagonia y Bahía/MDQ.
- Filiales y provincia NOA.
- Límites de edad de titular y pareja.
- Hijos 0–29 y reglas distintas AMBA/Interior.
- Segmento joven.
- Descuentos permanentes de filial.
- Relación de dependencia y tope de remuneración.
- Monotributo A–K.
- Unificación de aportes de pareja.
- IVA 10,5%.
- Estratégicos 1, 2, 3, 4 y 7.
- Opción 5.
- Tope comercial del 85%.
- Tácticos por plan, edad, categoría y filial.
- UCC.
- GAF / convenios y sus macrozonas.
- Vencimiento de beneficios temporales.
- Piso mínimo de cuota en $0.
- Opción 7 conservando ajustes permanentes.
- INDIE manteniendo su táctico y sin recibir estratégicos.

## Golden tests permanentes

`tests/qa-excel.test.js` contiene 20 escenarios comerciales con resultados esperados derivados directamente del Excel. Se ejecutan en GitHub Actions junto a `tests/engine-v2.test.js` en cada push o pull request.

Incluyen casos AMBA, Norte, Sur, Patagonia y Bahía/MDQ; relación de dependencia, monotributo, parejas, hijos, unificación de aportes, tácticos, filial, GAF, UCC, Opción 5, Opción 7, IVA y piso cero.

## Alcance operativo decidido por Zeroka

- MEDIFÉ+ fuera del cotizador.
- INDIE solo AMBA hasta confirmación comercial en contrario.
- Hijos hasta 29 años.
- Casos excepcionales de hijos mayores / familiares adicionales fuera del cotizador estándar.
- Opción 6 y dependencia de medio de pago desactivadas hasta confirmación de Medifé.

## Resultado

**QA lógico y matemático aprobado para el alcance operativo actual.**

El único desvío técnico detectado no es de lógica: las matrices JavaScript guardan tarifas con 4 decimales, lo que puede generar una diferencia máxima de un centavo frente a la precisión cruda del Excel. No afecta los valores enteros mostrados en la interfaz.

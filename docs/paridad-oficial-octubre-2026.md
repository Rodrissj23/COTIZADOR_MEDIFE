# Paridad con el oficial — octubre de 2026

Fuente de los controles: https://cotizadormedife.com/quotes, lista Octubre 2026 Ver.10, 29/10/2026. No se alteran tarifas ni porcentajes de las matrices de octubre.

## Reglas corregidas

- Pareja: la franja tarifaria de ambos adultos es la del mayor. Las edades declaradas no se reemplazan. En Córdoba las cotizaciones 45450 (23+40), 45483 (40+23) y 45487 (40+40) devolvieron la misma lista de Plata, $627.332, y la misma primera cuota, $493.454.
- Tácticos: se evalúa la edad mayor. Mercedes 40+55 utiliza 10% Bronce/Plata; la normalización de tarifas y del táctico reproduce $626.360 de Plata (45464).
- Segmento Joven: AMBA individual sin pareja/hijos; Interior con todos los adultos hasta 25. INDIE sigue excluido.
- Aportes: Obra Social 93%, Medifé 97%; origen independiente por adulto. Se mantiene el ítem 3% y el tope salarial de octubre. Platinum con bruto $6.000.000: $152.454 Obra Social (45475), $135.347 Medifé (45476).
- GAF: se inicia después de la última promoción seleccionada y permanece en el horizonte oficial observado. Comahue, táctico 20% + Bariloche: $391.055 meses 1–6 y $411.830 desde mes 7 (45472). AMBA, Op3 + Prestadores: $181.220 meses 1–11 y $207.664 desde mes 12 (45500). El convenio solo coincide desde mes 1 (45489).
- UCC no admite otro GAF. Su regla existente de acumulación con estratégicos/tácticos se conserva.

## Regresiones y alcance

`node tests/oficial-octubre-2026.test.js`: veinte escenarios, 105 primeras cuotas comparables, calendarios 1/6/7/11/12/13/24/25, validación de orígenes, suma de aportes y combinaciones rechazadas. Los importes esperados son respuestas oficiales capturadas antes de cambiar el motor, no se generan con el cálculo nuevo. Se admite hasta $2 porque el servidor presenta pesos enteros y sus redondeos intermedios difieren.

Once resultados de INDIE Interior no forman parte de la oferta de Zeroka. Cuatro resultados son efectos globales de una cotización multiplan del oficial: una casilla de táctico Plata/Oro difiere GAF en Bronce Classic, Bronce y Platinum; Op3 hace lo mismo con INDIE. Esas selecciones no existen en una propuesta individual de esos planes. No se fuerzan valores ni excepciones tarifarias para disimular esa diferencia. El control GAF solo compara sus planes cuando la selección tiene equivalente. Esta limitación queda explícita en la fixture y el resultado de la suite.

`octubre-2026.test.js` sigue verificando todas las celdas y fronteras familiares/tácticas. Los golden de septiembre usan el motor histórico congelado junto con su fuente para no mezclar políticas de distintas fechas. Las pruebas de interfaz cubren el cambio de origen, invalidación de propuestas, franja mayor, exclusiones y calendario del PDF.

La paridad verificada se limita a los casos y lista indicados. No se incorporan tarifas de noviembre ni se certifican combinaciones no obtenidas del servidor. La duración de GAF después de la cuota 25 sigue la continuidad que muestra el oficial; ante cambios de política debe volver a contrastarse.

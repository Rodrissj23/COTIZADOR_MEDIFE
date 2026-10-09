# Correspondencia tarifaria de Paraná

Revisada el 09/10/2026. La localidad autorizada es Paraná (Entre Ríos), según [ZONAS AUTORIZADAS.pdf](https://drive.google.com/file/d/1VvFXMNqGm0MP_svcissrh6wm7dSi0HYm/view).

## Decisión y alcance

Asignar Norte automáticamente, manteniendo el domicilio Entre Ríos / Paraná y sin asignar filial Santa Fe. Es una **correspondencia derivada de la comparación de precios**, no una asignación explícita de filial publicada por Medifé. La tabla comercial interna asigna Santa Fe a Norte y Mendoza a Sur; no incluye Paraná.

## Fuente primaria adicional

[Cuadros Tarifarios de SSSalud](https://cuadrostarifarios.sssalud.gob.ar/): declaraciones mensuales de Medifé (RNEMP 412258), período 202609, planes Plata y Oro, provincias Entre Ríos, Santa Fe y Mendoza. Consulta pública realizada el 09/10/2026. Modalidad `true` = directa; `false` = desregulada, según las etiquetas del portal.

API pública: `https://cuadrostarifarios.sssalud.gob.ar/api/getCuadrosTarifarios`.
Parámetros: `rnemp=412258`, `periodo=202609`, `nombre_plan=PLATA` u `ORO`, `region=PROVINCIA DE ENTRE RIOS`, `PROVINCIA DE SANTA FE` o `PROVINCIA DE MENDOZA`, `per_page=100`, `page=1`. Cada consulta devuelve 18 registros: nueve bandas etarias, dos modalidades. `valor_capital` se reproduce abajo tal como lo devuelve la API, en pesos.

## Comparación

- Directa: Entre Ríos y Santa Fe coinciden exactamente en las nueve bandas de ambos planes (18 coincidencias). Mendoza tiene valores distintos en las 18 bandas.
- Desregulada: Santa Fe equivale a Entre Ríos × 0,95, con una diferencia máxima de $2 en los valores enteros declarados. Es compatible con el descuento exclusivo del 5% de Santa Fe documentado en las reglas internas. Este descuento **no se aplica a Paraná**.
- Como control con el Excel vigente, Plata directo 61–65 tiene lista Norte $668.749,7721 y Sur $674.772,0105. La declaración provincial muestra $668.748 para Entre Ríos/Santa Fe y $674.772 para Mendoza: diferencias de menos de $2 respecto de las matrices correspondientes. Oro directo 36–40 tiene lista Norte $446.650,7384; Entre Ríos/Santa Fe declaran $446.651. Estos controles respaldan la correspondencia, sin suponer igualdad de todas las celdas del tarifario interno y la declaración pública.

| Plan | Edad | Adhesión | Entre Ríos | Santa Fe | Mendoza |
| --- | --- | --- | ---: | ---: | ---: |
| PLATA | 0–2 | Desregulada | 268572 | 255145 | 270893 |
| PLATA | 0–2 | Directa | 289670 | 289670 | 292164 |
| PLATA | 3–17 | Desregulada | 268572 | 255145 | 270893 |
| PLATA | 3–17 | Directa | 289670 | 289670 | 292164 |
| PLATA | 18–25 | Desregulada | 268572 | 255145 | 270893 |
| PLATA | 18–25 | Directa | 289670 | 289670 | 292164 |
| PLATA | 26–35 | Desregulada | 268572 | 255145 | 270893 |
| PLATA | 26–35 | Directa | 293074 | 293074 | 292164 |
| PLATA | 36–40 | Desregulada | 323858 | 307665 | 326793 |
| PLATA | 36–40 | Directa | 349280 | 349280 | 352463 |
| PLATA | 41–50 | Desregulada | 323858 | 307665 | 326793 |
| PLATA | 41–50 | Directa | 407095 | 407095 | 410546 |
| PLATA | 51–60 | Desregulada | 477388 | 453518 | 481761 |
| PLATA | 51–60 | Directa | 514893 | 514893 | 519575 |
| PLATA | 61–65 | Desregulada | 620069 | 589066 | 625646 |
| PLATA | 61–65 | Directa | 668748 | 668748 | 674772 |
| PLATA | 66–100 | Desregulada | 805721 | 765435 | 812683 |
| PLATA | 66–100 | Directa | 869011 | 869011 | 876494 |
| ORO | 0–2 | Desregulada | 343420 | 326247 | 346573 |
| ORO | 0–2 | Directa | 370405 | 370405 | 373788 |
| ORO | 3–17 | Desregulada | 343420 | 326247 | 346573 |
| ORO | 3–17 | Directa | 370405 | 370405 | 373788 |
| ORO | 18–25 | Desregulada | 343420 | 326247 | 346573 |
| ORO | 18–25 | Directa | 370405 | 370405 | 373788 |
| ORO | 26–35 | Desregulada | 343420 | 326247 | 346573 |
| ORO | 26–35 | Directa | 370405 | 370405 | 373788 |
| ORO | 36–40 | Desregulada | 414094 | 393389 | 417942 |
| ORO | 36–40 | Directa | 446651 | 446651 | 450787 |
| ORO | 41–50 | Desregulada | 414094 | 393389 | 417942 |
| ORO | 41–50 | Directa | 520556 | 520556 | 525087 |
| ORO | 51–60 | Desregulada | 610461 | 579939 | 615968 |
| ORO | 51–60 | Directa | 658459 | 658459 | 664385 |
| ORO | 61–65 | Desregulada | 793093 | 753438 | 800259 |
| ORO | 61–65 | Directa | 855491 | 855491 | 863130 |
| ORO | 66–100 | Desregulada | 1030259 | 978746 | 1039718 |
| ORO | 66–100 | Directa | 1111216 | 1111216 | 1121368 |

## Uso en el cotizador

Esta comparación resuelve la región y no reemplaza el Excel `Cotizador Individual_202609_Provisorio (3).xlsx`. Las declaraciones públicas no son intercambiables con todas las celdas del tarifario interno: pueden diferir por banda, categoría o ajustes. No se importan precios, aportes, IVA ni descuentos del portal. Las matrices existentes permanecen intactas y los precios de Paraná se calculan con Norte.

La ruta sólo incluye Paraná; no habilita el resto de Entre Ríos. Los beneficios exclusivos de una filial siguen excluidos. Las pruebas verifican asignación automática, ausencia de la alternativa Sur, domicilio real, cotización y propuesta en escritorio/móvil, y ausencia del 5% de Santa Fe.

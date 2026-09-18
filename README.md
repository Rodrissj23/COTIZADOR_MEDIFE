# COTIZADOR_MEDIFE

Cotizador comercial Medifé para Grupo Zeroka, construido con el tarifario definitivo de septiembre 2026 provisto por el equipo.

## Alcance de esta versión

- Planes: INDIE, MEDIFÉ+, Bronce Classic, Bronce, Plata, Oro y Platinum.
- Regiones: AMBA, Norte, Sur, Patagonia y Bahía/MDQ.
- INDIE solo se ofrece en AMBA.
- Categorías: Obligatorio y Voluntario.
- Grupo familiar por integrante: titular, pareja e hijos 0–29.
- Hijos: 0–20 normal, 21–25 estudiante, 26–29 a cargo.
- Relación de dependencia: el vendedor ingresa el ítem de Obra Social 3% del recibo; el sistema recupera la base y calcula el aporte computable con tope de remuneración $4.691.748,47.
- Monotributo: categoría A–K.
- Unificación de aportes con pareja.
- Ajuste de hijos y segmento joven automáticos.
- Promociones estratégicas 1–7, con Opción 6 tratada como continuidad de Opción 4 (Opción 4 + 6).
- Opción 5 acumulable solo con opciones 1, 2 y 3 cuando hay procedencia comprobable.
- Tácticos automáticos únicamente cuando pueden determinarse por región + plan + edad sin conocer filial.
- GAF/afinidades preparado conceptualmente pero desactivado.
- Generación de PDF desde la vista previa.
- Login protegido en Netlify mediante variables de entorno.

## Decisiones deliberadas

No se usa filial ni se intenta inferir localidad → filial. Por lo tanto, cualquier beneficio cuyo requisito sea una filial o subzona específica (CABA, GBA, Córdoba, Corrientes/Misiones, Mendoza, etc.) queda fuera para evitar cotizaciones incorrectas.

Los recargos regionales de Patagonia y Bahía/MDQ ya están contenidos en la matriz regional de tarifas usada por el cotizador y no se vuelven a sumar.

## Netlify

Configurar:

- `AUTH_USER`
- `AUTH_PASSWORD`
- `SESSION_SECRET`

Luego desplegar el repositorio con `netlify.toml` en la raíz.

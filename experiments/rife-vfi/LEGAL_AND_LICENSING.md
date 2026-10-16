# ANÁLISIS DE LICENCIAMIENTO, DERECHOS DE AUTOR Y CONDICIONES DE USO: RIFE Y FRAMEGEN

**Proyecto:** Orunei Video Processing Research  
**Módulo:** Evaluación Experimental de Frame Generation mediante RIFE + WebGPU  
**Fecha:** Octubre 2026  
**Entorno de Trabajo:** Rama aislada `experiment/rife-webgpu-vfi`

---

## 1. Desglose de Licencias del Ecosistema

### 1.1. Código Fuente del Runtime (Framegen)
- **Autor:** Monzik Allen (`MONZikWasTaken`)
- **Repositorio:** `https://github.com/MONZikWasTaken/Framegen`
- **Licencia:** **MIT License**
- **Alcance Legal:** El código fuente del motor de inferencia (shaders WGSL, wrappers JavaScript/TypeScript y la lógica de dispatch) es de código abierto permisivo. Permite copia, modificación, distribución, sublicenciamiento e integración en software comercial o privado, siempre que se conserve el aviso de copyright.

### 1.2. Pesos del Modelo Neuronal (`rt_v7s.bin`, `rt_v7s.json`)
- **Linaje:** Modelo estudiante destilado a partir de la arquitectura **RIFE** (*Real-Time Intermediate Flow Estimation for Video Frame Interpolation*, Huang et al., Megvii Research / ECCV 2022).
- **Licencia de los Pesos:** **Uso Personal y de Investigación No Comercial (Non-Commercial Research Use Only)**.
- **Restricción Crítica:** Los pesos preentrenados distribuidos en Framegen **NO pueden incorporarse a un producto comercial ni distribuirse en una aplicación pública de producción con fines comerciales o de lucro**.

---

## 2. Implicaciones sobre el Entrenamiento de Pesos Propios

Existe la creencia errónea de que *"entrenar mis propios pesos elimina cualquier problema de licencia"*. Desde el punto de vista del derecho de autor y propiedad intelectual, esto es **falso** si no se cuidan tres factores determinantes:

### 2.1. Contaminación por Modelo Profesor (Teacher Model Contamination)
- Si un nuevo modelo se entrena mediante **Knowledge Distillation** (destilación de conocimiento) usando un modelo profesor (como RIFE v4 o modelos de Megvii) cuya licencia prohíbe el uso comercial o la derivación comercial, el modelo estudiante resultante es considerado legalmente una **obra derivada** en múltiples jurisdicciones.
- **Requisito obligatorio:** El entrenamiento debe realizarse desde cero (*from scratch*) con funciones de pérdida directa (p. ej., Charbonnier loss, perceptual loss, SSIM) supervisadas por fotogramas reales, sin supervisión de flujos ópticos generados por un modelo restringido.

### 2.2. Contaminación por Dataset de Entrenamiento
- Los datasets estándar utilizados en la investigación de VFI (como **Vimeo-90K**, **UCF101** o fragmentos de anime comerciales) fueron extraídos de la web bajo excepciones de investigación académica sin autorización para explotación comercial.
- Entrenar un modelo comercial con un dataset cuyos términos prohíben el uso comercial traslada el riesgo legal al modelo resultante.
- **Requisito obligatorio para un modelo comercialmente viable:**
  1. Utilizar datasets sintéticos con licencia permisiva (p. ej., generados con Blender o motores de render 3D con licencias CC0/MIT).
  2. Utilizar secuencias de video reales filmadas o creadas con derechos propios o licencias Creative Commons Attribution (CC-BY).
  3. Contratos de cesión de derechos para secuencias de anime de prueba.

### 2.3. Código y Arquitectura
- La arquitectura matemática de convoluciones y deformación por flujo óptico (*optical flow warping*) es un principio algorítmico general y no está sujeta a copyright per se.
- Sin embargo, cualquier reutilización directa de código de entrenamiento de repositorios con licencias restrictivas (GPL, licencias institucionales no comerciales) debe evitarse mediante una reimplementación independiente en PyTorch/JAX con licencia Apache 2.0 / MIT.

---

## 3. Estado de la Rama Experimental en Orunei

- Esta rama (`experiment/rife-webgpu-vfi`) es un **banco de pruebas local y aislado** dedicado a la evaluación técnica y benchmark de rendimiento.
- **No se fusionará a `master`.**
- **No se desplegará en Vercel ni en entornos públicos.**
- Los pesos se cargan exclusivamente en local para medir milisegundos de GPU, calidad de interpolación perceptual y viabilidad técnica antes de considerar cualquier inversión en entrenamiento de pesos propios.

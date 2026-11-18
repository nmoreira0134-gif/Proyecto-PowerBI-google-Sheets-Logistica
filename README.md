# 🚚 Sistema Integral de Trazabilidad Logística, Entregas y BI (Consumo Masivo)

Solución *End-to-End* diseñada para optimizar la distribución y última milla en una empresa de consumo masivo (granos básicos, bebidas, lácteos, snacks y productos del hogar) en Managua y municipios aledaños. 

El proyecto integra la captura operativa en campo mediante una **Web App en Google Apps Script**, sincronización automática con **Google Sheets** y **Odoo ERP/CRM** para control comercial y facturación, y visualización estratégica de KPIs en **Power BI**.

---

## 🏗️ Arquitectura del Flujo Operativo

```text
[ App Web en Campo (GAS) ] ──► [ Base de Datos (Google Sheets) ] ──► [ Odoo CRM / Facturación ]
                                              │
                                              ▼
                                 [ Dashboard Ejecutivo (Power BI) ]
```

1. **Captura en Tiempo Real (Google Apps Script):** El repartidor o gestor registra en el momento si el pedido fue una **Entrega Efectiva** o un **Rechazo**, seleccionando zona, ruta, cliente, categoría y motivo específico.
2. **Almacenamiento Centralizado (Google Sheets):** Cada transacción se escribe automáticamente en la base de datos estructurada (`simulacion_logistica_managua - Entregas.csv`).
3. **Integración ERP/CRM (Odoo):** Los registros se sincronizan con el módulo CRM/Ventas de Odoo para mantener la trazabilidad comercial, gestionar incidencias con clientes y habilitar el flujo de facturación.
4. **Analítica y Toma de Decisiones (Power BI):** Conexión directa al modelo de datos para monitorear efectividad de entregas, metas de rechazo y comportamiento por producto y zona.

---

## 📱 1. Aplicativo de Registro Operativo y Sincronización con Odoo

Formulario web responsivo desarrollado en **HTML/CSS y Google Apps Script (`codigoapp.gs`)** que estandariza la captura de datos por ruta (`Ruta A` a `Ruta E`) y cobertura geográfica (Distritos I al VII de Managua, Ciudad Sandino, Tipitapa, Mateare, Ticuantepe, Villa El Carmen, San Rafael del Sur, El Crucero y San Francisco Libre).

| Interfaz de Registro en Campo (GAS) | Trazabilidad en Odoo CRM / Facturación |
| :---: | :---: |
| ![App de Registro](./Apps%20.jpg) | ![Conexión con Odoo](./conexion con Odoo.jpg) |

---

## 📊 2. Tableros de Control e Indicadores (Power BI)

El modelo analítico permite evaluar el desempeño logístico y detectar cuellos de botella en la distribución:

### 📌 Entregas Efectivas vs. Motivos de Rechazo
Identificación de las principales causas de devolución en punto de venta (*Cliente ausente / local cerrado, Producto dañado en transporte, Pedido incorrecto, Cliente sin efectivo / crédito, Dirección no encontrada, Entrega fuera de horario y Producto vencido*).

![Entregas Efectivas vs Motivos Rechazos](./Entregas%20Efectivas%20vs%20Motivos%20Rechazos.jpg)

---

### 🎯 Control de Rechazos vs. Meta Establecida
Seguimiento comparativo del porcentaje de rechazo por ruta y zona frente al umbral máximo permitido por la gerencia operativa.

![Rechazo y Meta de Rechazo](./Rechazo%20y%20Meta%20de%20Rechazo.jpg)

---

### 📦 Volumen Total de Entregas por Año y Categoría de Producto
Análisis histórico y estacional de cajas entregadas por línea de producto (*Granos Básicos, Bebidas, Lácteos, Aceites y Salsas, Aseo del Hogar, Cuidado Personal y Snacks*) y canal de venta (*Pulperías, Supermercados, Mini Súper, Distribuidores, Comisariatos y Tiendas de Barrio*).

![Total Entregas por Año y Productos](./Total%20Entregas%20x%20Año%20y%20Productos.jpg)

---

## 📂 Estructura del Repositorio

* `codigoapp.gs`: Código fuente del backend en Google Apps Script para procesar registros y conectar con la API/webhook de Odoo.
* `simulacion_logistica_managua - Entregas.csv`: Dataset estructurado con los registros de entregas, zonas, repartidores, precios por caja (C$) y motivos de rechazo.
* `*.pbix`: Archivo de proyecto de Power BI Desktop con el modelo relacional y medidas DAX.
* `*.jpg`: Capturas de la aplicación en funcionamiento, integración en Odoo y vistas del dashboard.

---

## 🛠️ Tecnologías Utilizadas
* **Business Intelligence:** Power BI Desktop, Power Query, DAX.
* **Automatización y Desarrollo:** Google Apps Script (JavaScript), HTML5, CSS3.
* **ERP / CRM:** Odoo (Gestión de CRM, Pedidos y Facturación).
* **Base de Datos:** Google Sheets / CSV.

---
👤 **Autor:** Néstor Gonzalo Moreira Largaespada  
🔗 **LinkedIn:** [linkedin.com/in/nestormoreira](https://linkedin.com/in/nestormoreira) | 📧 nmoreira0134@gmail.com
import json
import os
from collections import defaultdict

def filter_terminalistas():
    base_path = r"d:\Web_Cerete\Amalviva\Explota"
    digitadores_file   = os.path.join(base_path, "digitadores.json")
    consolidado_file   = os.path.join(base_path, "consolidado_terminalistas.json")
    output_file       = os.path.join(base_path, "digitadores_citas.json")
    output_dir        = os.path.join(base_path, "citas_terminalistas_por_mes")

    # Cargar Digitadores
    if not os.path.exists(digitadores_file):
        print("Error: digitadores.json no existe.")
        return

    with open(digitadores_file, "r", encoding="utf-8") as f:
        digitadores = json.load(f)

    dni_set = {str(item["DNI"]) for item in digitadores if item.get("ACTIVO", True)}
    print(f"Digitadores cargados: {len(dni_set)}")

    # Cargar consolidado
    if not os.path.exists(consolidado_file):
        print(f"Error: {consolidado_file} no existe. Primero unifica los archivos.")
        return

    with open(consolidado_file, "r", encoding="utf-8") as f:
        consolidado = json.load(f)

    print(f"Procesando {len(consolidado)} registros de consolidado_terminalistas.json")

    # Filtrar por DOC_USUARIO
    filtered_results = [
        record for record in consolidado
        if str(record.get("DOC_USUARIO", "")).strip() in dni_set
    ]

    print(f"Registros coincidentes: {len(filtered_results)}")

    # ── Guardar archivo plano ───────────────────────────────────
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(filtered_results, f, indent=2, ensure_ascii=False)
    print(f"Archivo plano guardado: {output_file}")

    # ── Agrupar por mes desde FECHA_CITA (ej: 07/02/2026) o PERIODO ────────────────
    # Usualmente estos archivos tienen un campo FECHA o PERIODO.
    por_mes = defaultdict(list)
    for record in filtered_results:
        # Usamos FECHOR_REGISTRO que viene como "DD/MM/YYYY HH:MM"
        periodo_val = str(record.get("FECHOR_REGISTRO", "")).strip()
        
        if "/" in periodo_val:
            # Extraer solo la parte de la fecha antes del espacio
            fecha_parte = periodo_val.split(" ")[0]
            partes = fecha_parte.split("/")
            if len(partes) == 3:
                clave = f"{partes[2]}-{partes[1].zfill(2)}" # YYYY-MM
            else:
                clave = "sin-periodo"
        else:
            clave = "sin-periodo"
            
        por_mes[clave].append(record)

    os.makedirs(output_dir, exist_ok=True)
    for mes, registros in por_mes.items():
        mes_dir = os.path.join(output_dir, mes)
        os.makedirs(mes_dir, exist_ok=True)
        out = os.path.join(mes_dir, "digitadores_citas.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(registros, f, indent=2, ensure_ascii=False)
        print(f"  [{mes}] {len(registros)} registros -> {out}")

    print(f"\nMeses generados: {sorted(por_mes.keys())}")

if __name__ == "__main__":
    filter_terminalistas()

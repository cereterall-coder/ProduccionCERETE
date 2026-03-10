import os
import json
import glob

def consolidate_citados():
    """
    Consolidates all .txt files from 'Citados' directory into a single JSON file.
    Expected format: Pipe-separated values (|) with a header on the first line.
    """
    base_dir = r"d:\Web_Cerete\Amalviva\Explota"
    input_dir = os.path.join(base_dir, "Citados")
    output_file = os.path.join(base_dir, "consolidado_citados.json")

    txt_files = glob.glob(os.path.join(input_dir, "*.txt"))
    all_data = []

    if not txt_files:
        print("No se encontraron archivos .txt en la carpeta 'Citados'")
        return

    for file_path in txt_files:
        print(f"Procesando: {os.path.basename(file_path)}")
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                # Los archivos de Citados tienen líneas largas que pueden tener saltos
                # artificiales. Unimos todo y separamos por registros reales.
                lines = content.splitlines()

            if not lines:
                continue

            # Header en la primera línea
            header = lines[0].strip().split('|')
            num_cols = len(header)

            # Reconstruir líneas: si una línea tiene menos columnas que el header,
            # se concatena con la siguiente hasta completar el número de columnas.
            buffer = ""
            for line in lines[1:]:
                buffer += line.strip()
                values = buffer.split('|')
                if len(values) >= num_cols:
                    # Tomar exactamente num_cols columnas
                    record = dict(zip(header, values[:num_cols]))
                    all_data.append(record)
                    buffer = ""
                    # Si sobran columnas (registro mal formado), descartar el exceso
                else:
                    # La línea está partida, continuar acumulando
                    buffer += ""

        except Exception as e:
            print(f"Error procesando {file_path}: {e}")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)

    print(f"Consolidación completada. {len(all_data)} registros procesados.")
    print(f"Archivo generado: {output_file}")

if __name__ == "__main__":
    consolidate_citados()

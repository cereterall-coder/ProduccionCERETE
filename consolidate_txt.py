import os
import json
import glob

def consolidate_txt_files():
    """
    Consolidates all .txt files from 'Horas Efectivas' directory into a single JSON file.
    Expected format: Pipe-separated values (|) with a header on the first line.
    """
    base_dir = r"c:\Users\ACER\.gemini\antigravity\scratch\Explota"
    input_dir = os.path.join(base_dir, "Horas Efectivas")
    output_file = os.path.join(base_dir, "consolidado_horas_efectivas.json")
    
    txt_files = glob.glob(os.path.join(input_dir, "*.txt"))
    all_data = []
    
    if not txt_files:
        print("No se encontraron archivos .txt en la carpeta 'Horas Efectivas'")
        return
        
    for file_path in txt_files:
        print(f"Procesando: {os.path.basename(file_path)}")
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
                if not lines:
                    continue
                
                # Header is on the first line
                header = lines[0].strip().split('|')
                
                for line in lines[1:]:
                    values = line.strip().split('|')
                    if len(values) == len(header):
                        record = dict(zip(header, values))
                        all_data.append(record)
        except Exception as e:
            print(f"Error procesando {file_path}: {e}")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
        
    print(f"Consolidación completada. {len(all_data)} registros procesados.")
    print(f"Archivo generado: {output_file}")

if __name__ == "__main__":
    consolidate_txt_files()

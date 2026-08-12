import os
import re
import pandas as pd
import pdfplumber
from pathlib import Path

desktop = Path(os.environ['USERPROFILE']) / 'Desktop'
onedrive = Path(os.environ['USERPROFILE']) / 'OneDrive' / 'Desktop'

# Prefer OneDrive Desktop if it exists
out_dir = onedrive / "Patriot_Cleaned_Reports" if onedrive.exists() else desktop / "Patriot_Cleaned_Reports"
out_dir.mkdir(parents=True, exist_ok=True)

search_dirs = [
    desktop,
    onedrive,
    Path(r"C:\Projects\SAFE-CRM")
]

pdfs = []
for d in search_dirs:
    if d.exists():
        pdfs.extend(list(d.rglob("port *.pdf")))

# Deduplicate by path
pdfs = list(set(pdfs))

master_rows = []

for pdf_path in pdfs:
    port_match = re.search(r'port\s+(\d{2})', pdf_path.name, re.I)
    port_val = port_match.group(1) if port_match else '00'
    
    rows = []
    print(f"Processing {pdf_path.name}...")
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if not table:
                continue
            
            for row in table:
                if not row or not row[0]: continue
                if row[0] == 'Client_No': continue
                
                c_no = str(row[0]).strip().replace('\n', '')
                ext_ref = str(row[1]).strip().replace('\n', '') if len(row) > 1 and row[1] else ''
                name = str(row[2]).strip().replace('\n', ' ') if len(row) > 2 and row[2] else ''
                
                if 'GHOST ALARM' in name.upper() or 'GHOSTALARM' in name.upper():
                    continue
                
                # Deconstruct Client_No
                # Assumption based on pattern: [BaseTx][Partition(4)][Port(2)]
                base_tx = c_no
                partition = ''
                if c_no.endswith(port_val) and len(c_no) >= 6:
                    rem = c_no[:-len(port_val)]
                    if len(rem) >= 4:
                        partition = rem[-4:]
                        base_tx = rem[:-4]
                    else:
                        base_tx = rem
                        
                rows.append({
                    'Client_No': c_no,
                    'Port': port_val,
                    'Base_Transmitter_ID': base_tx,
                    'Partition': partition,
                    'External_Ref': ext_ref,
                    'Client_Name': name
                })
                
    if rows:
        df = pd.DataFrame(rows)
        csv_name = f"Cleaned_Patriot_Port_{port_val}.csv"
        df.to_csv(out_dir / csv_name, index=False)
        master_rows.extend(rows)

if master_rows:
    master_df = pd.DataFrame(master_rows)
    master_df.to_excel(out_dir / "Master_Patriot_All_Ports_Cleaned.xlsx", index=False)

target_csv = out_dir / "Cleaned_Patriot_Port_11.csv"
print(f"\nAll files saved successfully to: {out_dir}")
print(f"Path to Port 11 CSV: {target_csv}")

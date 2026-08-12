import pandas as pd

# Files
port_11_path = r"C:\Users\User\OneDrive\Desktop\Patriot_Cleaned_Reports\Cleaned_Patriot_Port_11.csv"
port_02_path = r"C:\Users\User\OneDrive\Desktop\Patriot_Cleaned_Reports\Cleaned_Patriot_Port_02.csv"
xero_path = r"C:\Users\User\Downloads\RepeatingInvoices-11_08_2026_11_56.csv"

out_path = r"C:\Users\User\OneDrive\Desktop\Port2_Port11_vs_Xero_Comparison.xlsx"

print("Loading Patriot data...")
df_p11 = pd.read_csv(port_11_path)
df_p02 = pd.read_csv(port_02_path)

df_p11['Client_No'] = df_p11['Client_No'].astype(str).str.zfill(11)
df_p02['Client_No'] = df_p02['Client_No'].astype(str).str.zfill(11)

df_patriot = pd.concat([df_p11, df_p02], ignore_index=True)
df_patriot['Base_Tx_ID'] = df_patriot['Client_No'].str[0:5]
df_patriot['Partition_Code'] = df_patriot['Client_No'].str[5:9]
df_patriot['Port_ID'] = df_patriot['Client_No'].str[9:11]

print("Loading Xero data...")
df_xero = pd.read_csv(xero_path)
xero_records = df_xero.to_dict('records')

results = []
print("Cross-referencing...")

for _, p_row in df_patriot.iterrows():
    p_base_tx = str(p_row['Base_Tx_ID'])
    p_name = str(p_row['Client_Name']).strip().lower()
    
    match_status = 'UNMATCHED'
    x_contact_name = ''
    x_ref = ''
    x_amount = ''
    
    for x_row in xero_records:
        x_name_raw = str(x_row.get('Customer Name', '')).strip()
        x_name_lower = x_name_raw.lower()
        
        if p_base_tx in x_name_raw:
            match_status = 'EXACT_REF'
            x_contact_name = x_name_raw
            x_ref = p_base_tx
            x_amount = x_row.get('Total', '')
            break
        elif p_name and p_name == x_name_lower:
            match_status = 'EXACT_NAME'
            x_contact_name = x_name_raw
            x_amount = x_row.get('Total', '')
            break

    results.append({
        'Port ID': p_row['Port_ID'],
        'Base Tx ID': p_base_tx,
        'Patriot Client Name': p_row['Client_Name'],
        'Patriot Partition Code': p_row['Partition_Code'],
        'Xero Contact Name': x_contact_name,
        'Xero Reference / Account Code': x_ref,
        'Xero Invoice Amount': x_amount,
        'Match Status': match_status
    })

df_out = pd.DataFrame(results)
print(f"Writing output to {out_path}...")
df_out.to_excel(out_path, index=False)
print(f"File successfully written to: {out_path}")

import re
import os

with open('ts_errors.txt', 'r', encoding='utf-8') as f:
    errors = f.read().splitlines()

files_to_fix = {}

for line in errors:
    # Example: src/app/ErrorBoundary.tsx(1,8): error TS6133: 'React' is declared but its value is never read.
    # Example: src/features/cattle/index.ts(1,10): error TS2614: Module '"./ui/FrameScoreCalculator"' has no exported member 'FrameScoreCalculator'. Did you mean to use 'import FrameScoreCalculator from "./ui/FrameScoreCalculator"' instead?
    match = re.match(r'^([^:]+)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.*)', line)
    if not match:
        continue
    file_path, row, col, err_code, err_msg = match.groups()
    row = int(row)
    if file_path not in files_to_fix:
        files_to_fix[file_path] = []
    files_to_fix[file_path].append({
        'row': row,
        'err_code': err_code,
        'err_msg': err_msg
    })

# Now process each file
for file_path, file_errors in files_to_fix.items():
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.read().splitlines()
    
    modified = False
    
    for err in file_errors:
        row_idx = err['row'] - 1
        code = err['err_code']
        msg = err['err_msg']
        
        if row_idx >= len(lines):
            continue
            
        line_content = lines[row_idx]
        
        # TS6192: All imports in import declaration are unused
        if code == 'TS6192':
            lines[row_idx] = f"// {lines[row_idx]}"
            modified = True
            
        # TS6133: 'X' is declared but its value is never read
        elif code == 'TS6133':
            var_match = re.search(r"'([^']+)' is declared but its value is never read", msg)
            if var_match:
                var_name = var_match.group(1)
                # If it's an import, try to remove it from the import statement
                if 'import ' in line_content:
                    # simple replacement: remove `var_name, ` or `, var_name` or `{ var_name }`
                    new_line = re.sub(r',\s*' + var_name + r'\b', '', line_content)
                    new_line = re.sub(r'\b' + var_name + r'\s*,', '', new_line)
                    new_line = re.sub(r'{\s*' + var_name + r'\s*}', '{}', new_line)
                    # if it became import {} from ..., remove it
                    if re.search(r'import\s*(?:{\s*})?\s*from', new_line) or re.search(r'import\s+type\s*(?:{\s*})?\s*from', new_line):
                        new_line = f"// {line_content}"
                    if new_line != line_content:
                        lines[row_idx] = new_line
                        modified = True
                else:
                    # Could be a parameter or a variable. If it's a parameter, maybe prefix with _
                    # Only do this if it's safe (regex)
                    # new_line = re.sub(r'\b' + var_name + r'\b', '_' + var_name, line_content)
                    pass
                    
        # TS2614: Module X has no exported member 'Y'
        elif code == 'TS2614' and 'Did you mean to use' in msg:
            if 'export {' in line_content:
                # Replace export { X } with export { default as X }
                new_line = re.sub(r'{\s*([A-Za-z0-9_]+)\s*}', r'{ default as \1 }', line_content)
                if new_line != line_content:
                    lines[row_idx] = new_line
                    modified = True
        
        # AdminCRUD config property missing in type (TS2322)
        elif code == 'TS2322' and "Property 'cache' does not exist on type" in msg:
            # We need to remove the cache prop from <AdminCRUDPage ... cache={...} />
            pass
            
    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')
        print(f"Fixed {file_path}")

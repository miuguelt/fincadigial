import os
import re

def fix_admin_crud_cache(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = re.sub(r'^\s*cache=\{[^\}]+\}\s*$\n?', '', content, flags=re.MULTILINE)
                new_content = re.sub(r'^\s*cacheTTL=\{[^\}]+\}\s*$\n?', '', new_content, flags=re.MULTILINE)
                new_content = re.sub(r'\bcache=\{[^\}]+\}\s*', '', new_content)
                new_content = re.sub(r'\bcacheTTL=\{[^\}]+\}\s*', '', new_content)

                if content != new_content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed {path}")

fix_admin_crud_cache('src/pages/dashboard/admin')

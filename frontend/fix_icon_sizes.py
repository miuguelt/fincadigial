import os
import glob
import re

files = glob.glob('src/features/animal-bulk-actions/*.tsx')

def map_size(match):
    val = int(match.group(1))
    if val <= 16: return 'size="sm"'
    if val >= 24: return 'size="lg"'
    return 'size="md"'

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(r'size=\{([0-9]+)\}', map_size, content)
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed sizes in {file}")


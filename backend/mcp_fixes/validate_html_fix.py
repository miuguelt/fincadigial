#!/usr/bin/env python3
"""
FIX para MCP-UI validate_html
Parser alternativo usando BeautifulSoup
"""
from bs4 import BeautifulSoup
import re

def validate_html_fixed(html_content):
    """Validación HTML corregida usando BeautifulSoup"""
    issues = []
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Verificar estructura básica
        if not soup.find('html'):
            issues.append({"type": "missing_tag", "message": "Tag <html> no encontrado"})
        
        if not soup.find('head'):
            issues.append({"type": "missing_tag", "message": "Tag <head> no encontrado"})
        
        if not soup.find('body'):
            issues.append({"type": "missing_tag", "message": "Tag <body> no encontrado"})
        
        # Verificar imágenes sin alt
        images_without_alt = soup.find_all('img', alt=False)
        for img in images_without_alt:
            issues.append({"type": "accessibility", "message": f"Imagen sin alt: {img.get('src', 'unknown')}"})
        
        # Verificar inputs sin label
        inputs = soup.find_all(['input', 'textarea', 'select'])
        for inp in inputs:
            input_id = inp.get('id')
            if input_id and not soup.find('label', {'for': input_id}):
                # Verificar si tiene aria-label o placeholder
                if not inp.get('aria-label') and not inp.get('placeholder'):
                    issues.append({"type": "accessibility", "message": f"Input sin label: {input_id}"})
        
        return {
            "valid": len(issues) == 0,
            "issueCount": len(issues),
            "issues": issues
        }
        
    except Exception as e:
        return {
            "valid": False,
            "issueCount": 1,
            "issues": [{"type": "parser_error", "message": str(e)}]
        }

# Test
if __name__ == "__main__":
    test_html = """<!DOCTYPE html>
    <html>
    <head><title>Test</title></head>
    <body>
        <h1>Hello</h1>
        <img src="test.jpg">
        <input type="text" id="name">
    </body>
    </html>"""
    
    result = validate_html_fixed(test_html)
    print(f"Valid: {result['valid']}")
    print(f"Issues: {result['issueCount']}")
    for issue in result['issues']:
        print(f"  - {issue['type']}: {issue['message']}")

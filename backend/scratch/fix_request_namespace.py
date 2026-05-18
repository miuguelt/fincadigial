import os

filepaths = [
    r"c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\BackFinca\app\utils\namespace_helpers.py",
    r"c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\BackFinca\app\utils\response_handler.py",
    r"c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\BackFinca\app\utils\error_handlers.py",
    r"c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\BackFinca\app\utils\rbac.py",
    r"c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\BackFinca\app\utils\cache_helpers.py"
]

for filepath in filepaths:
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
        
    print(f"Processing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Reemplazos de importación
    content = content.replace("from flask import request, make_response, jsonify", "import flask")
    content = content.replace("from flask import request, g", "import flask\nfrom flask import g")
    content = content.replace("from flask import request", "import flask")
    content = content.replace("from flask import jsonify, current_app, request", "import flask\nfrom flask import current_app")
    
    # Reemplazos de uso
    content = content.replace("request.", "flask.request.")
    content = content.replace("make_response(", "flask.make_response(")
    content = content.replace("jsonify(", "flask.jsonify(")
    content = content.replace("has_request_context()", "flask.has_request_context()")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done!")


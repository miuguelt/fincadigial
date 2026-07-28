import os
import json
import logging
import subprocess
from flask_restx import Namespace, Resource, fields
from flask import request

logger = logging.getLogger(__name__)

LIBRARY_PATH = os.getenv(
    'LIBRARY_PROJECTS_PATH',
    r'C:\Users\Miguel\Documents\Aplicaciones\_library'
)

projects_ns = Namespace('projects', description='🧰 Proyectos locales (_library)', path='/projects')

launch_model = projects_ns.model('LaunchProject', {
    'name': fields.String(required=True, description='Project folder name'),
})

project_model = projects_ns.model('Project', {
    'name': fields.String,
    'version': fields.String,
    'type': fields.String,
    'start_command': fields.String,
    'port': fields.Integer,
    'path': fields.String,
    'description': fields.String,
})


def _inspect_pkg(full_path):
    info = {}
    pkg_path = os.path.join(full_path, 'package.json')
    with open(pkg_path, encoding='utf-8') as f:
        pkg = json.load(f)
    info['version'] = pkg.get('version', '0.0.0')
    scripts = pkg.get('scripts', {})
    if scripts.get('dev'):
        info['start_command'] = 'npm run dev'
        info['type'] = 'React/Vite'
        info['port'] = 5173
    elif scripts.get('start'):
        info['start_command'] = 'npm start'
        info['type'] = 'Node.js'
    return info


def _inspect_project(entry, full_path):
    info = {
        'name': entry, 'version': None, 'type': 'Other',
        'start_command': None, 'port': None, 'path': full_path, 'description': None,
    }
    pkg_path = os.path.join(full_path, 'package.json')
    req_path = os.path.join(full_path, 'requirements.txt')
    index_path = os.path.join(full_path, 'index.html')

    if os.path.isfile(pkg_path):
        info.update(_inspect_pkg(full_path))
    elif os.path.isfile(req_path):
        info['version'] = 'Flask'
        info['type'] = 'Flask'
        info['start_command'] = 'flask run'
        info['port'] = 5000
    elif os.path.isfile(index_path):
        info['type'] = 'Static Site'

    if 'IA' in entry and info['type'] == 'Node.js':
        info['port'] = 8020
    elif 'access' in entry.lower():
        info['port'] = 3001

    if info['start_command'] and info['port']:
        info['description'] = f"{info['type']} — http://localhost:{info['port']}"
    return info


def scan_projects():
    if not os.path.isdir(LIBRARY_PATH):
        logger.warning(f"Library path not found: {LIBRARY_PATH}")
        return []

    projects = []
    for entry in sorted(os.listdir(LIBRARY_PATH)):
        full_path = os.path.join(LIBRARY_PATH, entry)
        if not os.path.isdir(full_path) or entry.startswith(('_', '.')):
            continue
        projects.append(_inspect_project(entry, full_path))
    return projects


@projects_ns.route('')
class ProjectList(Resource):
    @projects_ns.marshal_list_with(project_model)
    def get(self):
        """List all projects from _library"""
        return scan_projects()


@projects_ns.route('/launch')
class ProjectLaunch(Resource):
    @projects_ns.expect(launch_model)
    def post(self):
        """Launch a project by name (starts process on Windows)"""
        data = request.get_json()
        name = data.get('name', '')
        if not name:
            return {'error': 'Project name is required'}, 400

        projects = scan_projects()
        project = next((p for p in projects if p['name'] == name), None)
        if not project:
            return {'error': f'Project "{name}" not found'}, 404

        cmd = project.get('start_command')
        proj_path = project.get('path')
        if not cmd or not proj_path:
            return {'error': f'No start command for "{name}"'}, 400

        try:
            if cmd.startswith('npm'):
                full_cmd = f'start cmd /c "cd /d "{proj_path}" && {cmd}"'
            else:
                full_cmd = f'start cmd /c "cd /d "{proj_path}" && {cmd}"'

            subprocess.Popen(full_cmd, shell=True)
            logger.info(f"Launched project: {name} with cmd: {full_cmd}")
            return {
                'message': f'Project "{name}" launched',
                'command': cmd,
                'path': proj_path,
            }, 200
        except Exception as e:
            logger.exception(f"Failed to launch {name}")
            return {'error': str(e)}, 500

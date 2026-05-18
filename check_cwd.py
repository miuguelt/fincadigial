import psutil
for p in psutil.process_iter(['pid', 'name', 'cmdline', 'cwd']):
    if p.info['pid'] in [48036, 52040]:
        print(f"PID: {p.info['pid']} CWD: {p.info['cwd']}")

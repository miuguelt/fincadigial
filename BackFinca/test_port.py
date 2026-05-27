import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.bind(('127.0.0.1', 18081))
    print("Successfully bound to 127.0.0.1:18081")
except Exception as e:
    print(f"Failed to bind to 127.0.0.1:18081: {e}")
finally:
    s.close()

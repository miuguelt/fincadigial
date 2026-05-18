from app import create_app, db
from app.models.sync import Device

app = create_app()
with app.app_context():
    devices = Device.query.all()
    print('--- VLMSP Registered Devices ---')
    for d in devices:
        print(f'ID: {d.device_id} | Name: {d.name} | Platform: {d.platform} | Last Seen: {d.last_seen_at}')

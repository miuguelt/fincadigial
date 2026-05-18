from app import create_app, db
from app.models.user_finca import UserFinca
from app.models.finca import Finca

app = create_app('development')
with app.app_context():
    # Buscar registros en user_finca que apuntan a fincas que no existen
    orphans = UserFinca.query.filter(~UserFinca.finca_id.in_(db.session.query(Finca.id))).all()
    print(f'Orphaned records found: {len(orphans)}')
    for o in orphans:
        print(f'Deleting orphaned UserFinca record ID: {o.id} (finca_id: {o.finca_id})')
        db.session.delete(o)
    
    if orphans:
        db.session.commit()
        print('Database cleaned.')
    else:
        print('No cleanup needed.')

import logging
logging.basicConfig(level=logging.INFO)
from wsgi import app

with app.app_context():
    try:
        match = app.url_map.bind('localhost').match('/api/v1/knowledge_base/calendario/hato')
        print('MATCHED GET:', match)
    except Exception as e:
        print('ERROR GET:', type(e), e)

    try:
        match = app.url_map.bind('localhost').match('/api/v1/knowledge_base/calendario/animal/1')
        print('MATCHED ANIMAL:', match)
    except Exception as e:
        print('ERROR ANIMAL:', type(e), e)

from app.database.db import engine

try:
    conn = engine.connect()
    print("Database Connected Successfully!")
    conn.close()

except Exception as e:
    print(e)
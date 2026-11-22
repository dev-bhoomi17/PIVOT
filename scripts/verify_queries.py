import sqlite3
from pathlib import Path

db = Path("data/pivot.db")
sql_file = Path("queries/sales_summary.sql")

if not db.exists():
    raise FileNotFoundError("Sales database not found. Run seed.py first.")

if not sql_file.exists():
    raise FileNotFoundError("SQL query file not found.")

with sqlite3.connect(db) as conn:
    conn.execute("PRAGMA foreign_keys = ON")

    sql = sql_file.read_text(encoding="utf-8")
    statements = [
        statement.strip()
        for statement in sql.split(";")
        if statement.strip()
    ]

    for index, statement in enumerate(statements, start=1):
        cursor = conn.execute(statement)
        rows = cursor.fetchall()

        print(f"\nQUERY {index}:")
        print("Columns:", [column[0] for column in cursor.description])
        print("Rows returned:", len(rows))
        print("Sample:", rows[:2])

    print("\nAll SQL queries executed successfully!")

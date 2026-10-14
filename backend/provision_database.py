import argparse
import os

import psycopg
from psycopg import sql


def connection():
    return psycopg.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ.get("POSTGRES_HOST", "db"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        autocommit=True,
    )


def create_role():
    role = os.environ["POSTGRES_APP_USER"]
    password = os.environ["POSTGRES_APP_PASSWORD"]
    with connection() as database, database.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (role,))
        statement = "CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS"
        if cursor.fetchone() is None:
            cursor.execute(sql.SQL(statement).format(sql.Identifier(role), sql.Literal(password)))
        else:
            cursor.execute(
                sql.SQL("ALTER ROLE {} PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS").format(
                    sql.Identifier(role),
                    sql.Literal(password),
                )
            )


def grant_permissions():
    role = sql.Identifier(os.environ["POSTGRES_APP_USER"])
    database_name = sql.Identifier(os.environ["POSTGRES_DB"])
    with connection() as database, database.cursor() as cursor:
        cursor.execute(sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(database_name, role))
        cursor.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {}").format(role))
        cursor.execute(sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}").format(role))
        cursor.execute(sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {}").format(role))
        cursor.execute(sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {}").format(role))
        cursor.execute(sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {}").format(role))
        cursor.execute("SELECT to_regprocedure('app_create_initial_owner_membership(bigint,bigint,character varying)')")
        if cursor.fetchone()[0] is not None:
            cursor.execute(
                sql.SQL("GRANT EXECUTE ON FUNCTION app_create_initial_owner_membership(bigint, bigint, character varying) TO {}").format(role)
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    actions = parser.add_mutually_exclusive_group(required=True)
    actions.add_argument("--create-role", action="store_true")
    actions.add_argument("--grant", action="store_true")
    args = parser.parse_args()
    if args.create_role:
        create_role()
    else:
        grant_permissions()

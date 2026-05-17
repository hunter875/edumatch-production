"""
Tiny SQL migration runner for matching-service.

The Java services use Flyway. For this FastAPI service we keep a lightweight
SQL runner so schema changes are still versioned and repeatable without adding
an Alembic dependency to the runtime image.
"""
import hashlib
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def run_sql_migrations(engine, migrations_dir: Path | None = None) -> None:
    """Run pending SQL migrations from matching-service/migrations."""
    base_dir = Path(__file__).resolve().parents[1]
    migrations_path = migrations_dir or base_dir / "migrations"

    if not migrations_path.exists():
        logger.warning("Migration directory does not exist: %s", migrations_path)
        return

    migration_files = sorted(migrations_path.glob("V*__*.sql"))
    if not migration_files:
        logger.warning("No SQL migrations found in %s", migrations_path)
        return

    raw_connection = engine.raw_connection()
    try:
        with raw_connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(50) PRIMARY KEY,
                    description TEXT NOT NULL,
                    checksum VARCHAR(64) NOT NULL,
                    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
            raw_connection.commit()

            for migration_file in migration_files:
                version, description = migration_file.stem.split("__", 1)
                checksum = hashlib.sha256(migration_file.read_bytes()).hexdigest()

                cursor.execute(
                    "SELECT checksum FROM schema_migrations WHERE version = %s",
                    (version,),
                )
                existing = cursor.fetchone()
                if existing:
                    if existing[0] != checksum:
                        raise RuntimeError(
                            f"Migration {migration_file.name} checksum changed after it was applied"
                        )
                    logger.info("Skipping already applied migration %s", migration_file.name)
                    continue

                logger.info("Applying migration %s", migration_file.name)
                cursor.execute(migration_file.read_text(encoding="utf-8"))
                cursor.execute(
                    """
                    INSERT INTO schema_migrations(version, description, checksum)
                    VALUES (%s, %s, %s)
                    """,
                    (version, description, checksum),
                )
                raw_connection.commit()
    except Exception:
        raw_connection.rollback()
        raise
    finally:
        raw_connection.close()

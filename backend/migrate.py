
import os

from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL:

    print("❌ DATABASE_URL not set!")

    exit(1)

# Fix for SQLAlchemy (postgres:// -> postgresql://)

if DATABASE_URL.startswith("postgres://"):

    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:

    # Create users table if not exists

    conn.execute(text("""

        CREATE TABLE IF NOT EXISTS users (

            id SERIAL PRIMARY KEY,

            email VARCHAR(255) UNIQUE NOT NULL,

            password_hash VARCHAR(255) NOT NULL,

            is_verified BOOLEAN DEFAULT FALSE,

            verification_token VARCHAR(255),

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )

    """))

    

    # Create predictions table if not exists

    conn.execute(text("""

        CREATE TABLE IF NOT EXISTS predictions (

            id SERIAL PRIMARY KEY,

            user_id INTEGER REFERENCES users(id),

            result VARCHAR(50),

            probability FLOAT,

            features JSONB,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )

    """))

    

    conn.commit()

    

    # Verify

    result = conn.execute(text("SELECT COUNT(*) FROM users"))

    count = result.scalar()

    print(f"✅ Verified {count} existing user(s)")

print("🎉 Migration complete!")


//! Database access: the Postgres pool and typed queries.
//!
//! Queries use `sqlx::query!` and are checked at compile time against the
//! schema from `supabase/migrations/`; offline data lives in `/.sqlx`.

pub mod events;
pub mod quiz;

use std::time::Duration;

use sqlx::Executor as _;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

pub const PING_TIMEOUT: Duration = Duration::from_secs(2);

/// Handle to the database, cheap to clone.
#[derive(Debug, Clone)]
pub struct Store {
    pool: PgPool,
}

impl Store {
    /// Creates a lazily connecting pool: the server starts even while the
    /// database is down, and `/api/readyz` reports it.
    pub fn connect_lazy(url: &str, max_connections: u32) -> Result<Self, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .acquire_timeout(PING_TIMEOUT)
            .after_connect(|conn, _meta| {
                Box::pin(async move {
                    conn.execute("set search_path = app").await?;
                    Ok(())
                })
            })
            .connect_lazy(url)?;
        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    /// Round-trips `select 1` within [`PING_TIMEOUT`].
    pub async fn ping(&self) -> Result<(), sqlx::Error> {
        match tokio::time::timeout(PING_TIMEOUT, sqlx::query("select 1").execute(&self.pool)).await
        {
            Ok(result) => result.map(|_| ()),
            Err(_) => Err(sqlx::Error::PoolTimedOut),
        }
    }
}

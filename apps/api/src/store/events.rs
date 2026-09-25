//! `app.events` — product events. Only allow-listed names and flags, never typed input.

use sqlx::PgExecutor;

pub async fn insert_event(
    db: impl PgExecutor<'_>,
    name: &str,
    props: &serde_json::Value,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar!(
        "insert into app.events (name, props) values ($1, $2) returning id",
        name,
        props,
    )
    .fetch_one(db)
    .await
}

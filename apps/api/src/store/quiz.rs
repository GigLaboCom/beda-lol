//! `app.quiz_attempts` — anonymous statistics of completed inspections.

use sqlx::PgExecutor;

/// A completed quiz: six per-letter values in word order (П, О, Б, Е, Д, А).
#[derive(Debug, Clone)]
pub struct NewQuizAttempt<'a> {
    pub scores: [i16; 6],
    pub class: Option<&'a str>,
    pub source: Option<&'a str>,
}

/// Inserts an attempt and returns its id.
pub async fn insert_quiz_attempt(
    db: impl PgExecutor<'_>,
    attempt: &NewQuizAttempt<'_>,
) -> Result<i64, sqlx::Error> {
    sqlx::query_scalar!(
        "insert into app.quiz_attempts (scores, class, source) values ($1, $2, $3) returning id",
        &attempt.scores[..],
        attempt.class,
        attempt.source,
    )
    .fetch_one(db)
    .await
}

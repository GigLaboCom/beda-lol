//! Database tests. They run against the local Supabase database named by
//! `BEDA_TEST_DATABASE_URL` (a superuser URL, e.g. the `postgres` role from
//! `supabase status`). Each test runs inside a transaction that is rolled back.
//! Without the variable the tests are skipped, so `cargo test` works offline.
#![allow(clippy::unwrap_used)]

use beda_api::store::quiz::{NewQuizAttempt, insert_quiz_attempt};
use sqlx::{Connection as _, PgConnection};

async fn connect() -> Option<PgConnection> {
    let Some(url) = std::env::var("BEDA_TEST_DATABASE_URL")
        .ok()
        .filter(|v| !v.is_empty())
    else {
        eprintln!("BEDA_TEST_DATABASE_URL not set, skipping database test");
        return None;
    };
    Some(PgConnection::connect(&url).await.unwrap())
}

#[tokio::test]
async fn insert_and_read_quiz_attempt() {
    let Some(mut conn) = connect().await else {
        return;
    };
    let mut tx = conn.begin().await.unwrap();

    sqlx::query("set local role beda_api")
        .execute(&mut *tx)
        .await
        .unwrap();
    let attempt = NewQuizAttempt {
        scores: [0, 1, 2, 2, 1, 2],
        class: Some("beda"),
        source: Some("test"),
    };
    let id = insert_quiz_attempt(&mut *tx, &attempt).await.unwrap();

    let (scores, class): (Vec<i16>, Option<String>) =
        sqlx::query_as("select scores, class from app.quiz_attempts where id = $1")
            .bind(id)
            .fetch_one(&mut *tx)
            .await
            .unwrap();
    assert_eq!(scores, vec![0, 1, 2, 2, 1, 2]);
    assert_eq!(class.as_deref(), Some("beda"));

    tx.rollback().await.unwrap();
}

#[tokio::test]
async fn scores_must_have_six_values() {
    let Some(mut conn) = connect().await else {
        return;
    };
    let mut tx = conn.begin().await.unwrap();
    let err = sqlx::query("insert into app.quiz_attempts (scores) values ('{1,2}')")
        .execute(&mut *tx)
        .await
        .unwrap_err();
    assert_eq!(
        err.as_database_error().unwrap().code().as_deref(),
        Some("23514")
    );
    tx.rollback().await.unwrap();
}

#[tokio::test]
async fn anon_cannot_read_app_tables() {
    let Some(mut conn) = connect().await else {
        return;
    };
    for (role, set_role) in [
        ("anon", "set local role anon"),
        ("authenticated", "set local role authenticated"),
    ] {
        let mut tx = conn.begin().await.unwrap();
        sqlx::query(set_role).execute(&mut *tx).await.unwrap();
        let err = sqlx::query("select * from app.quiz_attempts")
            .execute(&mut *tx)
            .await
            .unwrap_err();
        // 42501 = insufficient_privilege ("permission denied for schema app").
        assert_eq!(
            err.as_database_error().unwrap().code().as_deref(),
            Some("42501"),
            "role {role}"
        );
        tx.rollback().await.unwrap();
    }
}

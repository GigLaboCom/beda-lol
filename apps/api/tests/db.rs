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

#[tokio::test]
async fn new_auth_user_gets_a_user_row_and_a_personal_account() {
    let Some(mut conn) = connect().await else {
        return;
    };
    let mut tx = conn.begin().await.unwrap();
    let id = uuid::Uuid::new_v4();
    sqlx::query(
        "insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
         values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                 'provision@example.test', '{\"full_name\": \"  Капитан  \"}')",
    )
    .bind(id)
    .execute(&mut *tx)
    .await
    .unwrap();

    sqlx::query("set local role beda_api")
        .execute(&mut *tx)
        .await
        .unwrap();
    let user = beda_api::store::users::find_user(&mut *tx, id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(
        (
            user.display_name.as_str(),
            user.role.as_str(),
            user.status.as_str(),
            user.trusted
        ),
        ("Капитан", "user", "active", false)
    );
    let accounts = beda_api::store::users::memberships(&mut *tx, id)
        .await
        .unwrap();
    assert_eq!(accounts.len(), 1);
    assert_eq!(
        (accounts[0].kind.as_str(), accounts[0].role.as_str()),
        ("personal", "owner")
    );
    assert_eq!(accounts[0].name, "Капитан");

    // Provisioning again (the backfill path) changes nothing.
    sqlx::query("reset role").execute(&mut *tx).await.unwrap();
    sqlx::query("select app.provision_user($1, '{}'::jsonb)")
        .bind(id)
        .execute(&mut *tx)
        .await
        .unwrap();
    let again = beda_api::store::users::memberships(&mut *tx, id)
        .await
        .unwrap();
    assert_eq!(again, accounts);

    tx.rollback().await.unwrap();
}

#[tokio::test]
async fn browser_roles_cannot_touch_users_or_call_provisioning() {
    let Some(mut conn) = connect().await else {
        return;
    };
    for set_role in ["set local role anon", "set local role authenticated"] {
        for sql in [
            "select * from app.users",
            "select * from app.accounts",
            "select * from app.account_members",
            "select app.provision_user(gen_random_uuid(), '{}'::jsonb)",
        ] {
            let mut tx = conn.begin().await.unwrap();
            sqlx::query(set_role).execute(&mut *tx).await.unwrap();
            let err = sqlx::query(sql).execute(&mut *tx).await.unwrap_err();
            assert_eq!(
                err.as_database_error().unwrap().code().as_deref(),
                Some("42501"),
                "{set_role}: {sql}"
            );
            tx.rollback().await.unwrap();
        }
    }
}

#[tokio::test]
async fn promote_by_github_login() {
    let Some(mut conn) = connect().await else {
        return;
    };
    // `auth.identities` comes from Supabase Auth; CI runs the database alone.
    let (identities,): (Option<String>,) =
        sqlx::query_as("select to_regclass('auth.identities')::text")
            .fetch_one(&mut conn)
            .await
            .unwrap();
    if identities.is_none() {
        eprintln!("auth.identities missing (Supabase Auth not running), skipping");
        return;
    }
    let mut tx = conn.begin().await.unwrap();
    let id = uuid::Uuid::new_v4();
    sqlx::query(
        "insert into auth.users (id, instance_id, aud, role, email)
         values ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
                 'promote@example.test')",
    )
    .bind(id)
    .execute(&mut *tx)
    .await
    .unwrap();
    sqlx::query(
        "insert into auth.identities (provider_id, user_id, identity_data, provider)
         values ('4242', $1, '{\"user_name\": \"Captain-Test\"}', 'github')",
    )
    .bind(id)
    .execute(&mut *tx)
    .await
    .unwrap();

    sqlx::query("set local role beda_api")
        .execute(&mut *tx)
        .await
        .unwrap();
    let promoted =
        beda_api::store::users::set_role_by_github_login(&mut *tx, "captain-test", "admin")
            .await
            .unwrap();
    assert_eq!(promoted, Some(id));
    let user = beda_api::store::users::find_user(&mut *tx, id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(user.role, "admin");
    let nobody = beda_api::store::users::set_role_by_github_login(&mut *tx, "nobody-here", "admin")
        .await
        .unwrap();
    assert_eq!(nobody, None);

    tx.rollback().await.unwrap();
}

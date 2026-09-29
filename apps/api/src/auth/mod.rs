//! Supabase Auth: a bearer token becomes the user and the account (tenant) a
//! request acts in. See `token` for verification, `user` for the extractor and
//! `admin` for the Admin API (account deletion).

pub mod admin;
pub mod token;
pub mod user;

pub use admin::{AdminError, AuthAdmin, Secret};
pub use token::{Claims, TokenError, Verifier};
pub use user::{
    ACCOUNT_HEADER, AccountKind, AccountRole, CurrentUser, Membership, Role, User, UserCache,
};

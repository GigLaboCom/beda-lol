//! Supabase Auth: a bearer token becomes the user and the account (tenant) a
//! request acts in. See `token` for verification and `user` for the extractor.

pub mod token;
pub mod user;

pub use token::{Claims, TokenError, Verifier};
pub use user::{
    ACCOUNT_HEADER, AccountKind, AccountRole, CurrentUser, Membership, Role, User, UserCache,
};

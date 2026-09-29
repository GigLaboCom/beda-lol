//! Typed configuration from environment variables.

use std::fmt;
use std::net::SocketAddr;

use crate::auth::Secret;

/// Deployment environment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Env {
    Dev,
    Prod,
}

impl Env {
    pub fn is_prod(self) -> bool {
        self == Self::Prod
    }
}

/// Runtime configuration, read once at startup.
#[derive(Debug, Clone)]
pub struct Config {
    pub env: Env,
    pub http_addr: SocketAddr,
    pub base_url: String,
    pub log: String,
    pub database_url: String,
    pub db_max_connections: u32,
    pub supabase_url: Option<String>,
    /// Expected `iss` of access tokens; default `{supabase_url}/auth/v1`.
    pub jwt_issuer: Option<String>,
    /// Supabase secret (or legacy `service_role`) key, for the Admin API only.
    pub supabase_secret_key: Option<Secret>,
    /// Origins allowed on unsafe methods besides `base_url`.
    pub extra_origins: Vec<String>,
    /// Refuse unsafe methods from other origins; on in prod, off in dev
    /// (the dev site is opened by LAN addresses too).
    pub origin_check: bool,
}

/// Every problem found in the environment, reported at once.
#[derive(Debug, thiserror::Error)]
pub struct ConfigError(pub Vec<String>);

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "invalid configuration:")?;
        for problem in &self.0 {
            writeln!(f, "  - {problem}")?;
        }
        Ok(())
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            env: Env::Dev,
            http_addr: SocketAddr::from(([0, 0, 0, 0], 8080)),
            base_url: "http://localhost:4321".to_owned(),
            log: "info".to_owned(),
            database_url: "postgres://beda_api@127.0.0.1:54322/postgres".to_owned(),
            db_max_connections: 10,
            supabase_url: None,
            jwt_issuer: None,
            supabase_secret_key: None,
            extra_origins: Vec::new(),
            origin_check: false,
        }
    }
}

impl Config {
    /// Where the Supabase project publishes its signing keys.
    pub fn jwks_url(&self) -> Option<String> {
        self.supabase_url
            .as_ref()
            .map(|url| format!("{url}/auth/v1/.well-known/jwks.json"))
    }

    /// The `iss` access tokens must carry.
    pub fn issuer(&self) -> Option<String> {
        self.jwt_issuer.clone().or_else(|| {
            self.supabase_url
                .as_ref()
                .map(|url| format!("{url}/auth/v1"))
        })
    }

    /// Origins allowed to send unsafe requests.
    pub fn allowed_origins(&self) -> Vec<String> {
        std::iter::once(self.base_url.clone())
            .chain(self.extra_origins.iter().cloned())
            .collect()
    }

    /// Reads the configuration from the process environment.
    pub fn from_env() -> Result<Self, ConfigError> {
        Self::from_lookup(|key| std::env::var(key).ok())
    }

    /// Reads the configuration through `lookup`, so tests need no real env.
    pub fn from_lookup(lookup: impl Fn(&str) -> Option<String>) -> Result<Self, ConfigError> {
        let get = |key: &str| {
            lookup(key)
                .map(|v| v.trim().to_owned())
                .filter(|v| !v.is_empty())
        };
        let mut problems = Vec::new();
        let mut config = Self::default();

        match get("BEDA_ENV").as_deref() {
            None | Some("dev") => config.env = Env::Dev,
            Some("prod") => config.env = Env::Prod,
            Some(other) => {
                problems.push(format!("BEDA_ENV must be `dev` or `prod`, got `{other}`"));
            }
        }

        if let Some(addr) = get("BEDA_HTTP_ADDR") {
            match addr.parse() {
                Ok(parsed) => config.http_addr = parsed,
                Err(_) => problems.push(format!(
                    "BEDA_HTTP_ADDR must be `host:port` with an IP host, got `{addr}`"
                )),
            }
        }

        if let Some(url) = get("BEDA_BASE_URL") {
            if url.starts_with("http://") || url.starts_with("https://") {
                url.trim_end_matches('/').clone_into(&mut config.base_url);
            } else {
                problems.push(format!(
                    "BEDA_BASE_URL must start with http:// or https://, got `{url}`"
                ));
            }
        }

        if let Some(filter) = get("BEDA_LOG") {
            config.log = filter;
        }

        match get("BEDA_DATABASE_URL") {
            None => problems.push("BEDA_DATABASE_URL is required".to_owned()),
            Some(url) if url.starts_with("postgres://") || url.starts_with("postgresql://") => {
                config.database_url = url;
            }
            Some(_) => problems.push("BEDA_DATABASE_URL must be a postgres:// URL".to_owned()),
        }

        if let Some(max) = get("BEDA_DB_MAX_CONNECTIONS") {
            match max.parse::<u32>() {
                Ok(n) if n > 0 => config.db_max_connections = n,
                _ => problems.push(format!(
                    "BEDA_DB_MAX_CONNECTIONS must be a positive integer, got `{max}`"
                )),
            }
        }

        config.supabase_url = get("BEDA_SUPABASE_URL").map(|u| u.trim_end_matches('/').to_owned());
        match &config.supabase_url {
            Some(url) if !(url.starts_with("http://") || url.starts_with("https://")) => {
                problems.push("BEDA_SUPABASE_URL must start with http:// or https://".to_owned());
            }
            None if config.env.is_prod() => {
                problems.push("BEDA_SUPABASE_URL is required when BEDA_ENV=prod".to_owned());
            }
            _ => {}
        }
        config.jwt_issuer = get("BEDA_JWT_ISSUER").map(|u| u.trim_end_matches('/').to_owned());
        config.supabase_secret_key = get("BEDA_SUPABASE_SECRET_KEY").map(Secret::new);
        if config.supabase_secret_key.is_some() && config.supabase_url.is_none() {
            problems.push("BEDA_SUPABASE_SECRET_KEY needs BEDA_SUPABASE_URL".to_owned());
        }

        config.extra_origins = get("BEDA_ALLOWED_ORIGINS")
            .map(|list| {
                list.split(',')
                    .map(|o| o.trim().trim_end_matches('/').to_owned())
                    .filter(|o| !o.is_empty())
                    .collect()
            })
            .unwrap_or_default();
        config.origin_check = match get("BEDA_ORIGIN_CHECK").as_deref() {
            None => config.env.is_prod(),
            Some("on") => true,
            Some("off") => false,
            Some(other) => {
                problems.push(format!(
                    "BEDA_ORIGIN_CHECK must be `on` or `off`, got `{other}`"
                ));
                false
            }
        };

        if problems.is_empty() {
            Ok(config)
        } else {
            Err(ConfigError(problems))
        }
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    fn load(pairs: &[(&str, &str)]) -> Result<Config, ConfigError> {
        let map: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
            .collect();
        Config::from_lookup(|k| map.get(k).cloned())
    }

    #[test]
    fn defaults_apply_when_only_database_url_is_set() {
        let config = load(&[("BEDA_DATABASE_URL", "postgres://u@h/db")]).unwrap();
        assert_eq!(config.env, Env::Dev);
        assert_eq!(config.http_addr.port(), 8080);
        assert_eq!(config.base_url, "http://localhost:4321");
        assert_eq!(config.log, "info");
        assert_eq!(config.db_max_connections, 10);
    }

    #[test]
    fn reads_values() {
        let config = load(&[
            ("BEDA_ENV", "prod"),
            ("BEDA_HTTP_ADDR", "127.0.0.1:9000"),
            ("BEDA_BASE_URL", "https://beda.lol/"),
            ("BEDA_DATABASE_URL", "postgres://u@h/db"),
            ("BEDA_SUPABASE_URL", "https://ref.supabase.co/"),
        ])
        .unwrap();
        assert!(config.env.is_prod());
        assert!(config.origin_check, "on by default in prod");
        assert_eq!(
            config.jwks_url().as_deref(),
            Some("https://ref.supabase.co/auth/v1/.well-known/jwks.json")
        );
        assert_eq!(
            config.issuer().as_deref(),
            Some("https://ref.supabase.co/auth/v1")
        );
        assert_eq!(config.http_addr.port(), 9000);
        assert_eq!(config.base_url, "https://beda.lol");
        assert_eq!(config.database_url, "postgres://u@h/db");
    }

    #[test]
    fn reports_every_problem_at_once() {
        let err = load(&[
            ("BEDA_ENV", "staging"),
            ("BEDA_HTTP_ADDR", "nope"),
            ("BEDA_BASE_URL", "beda.lol"),
            ("BEDA_DATABASE_URL", "mysql://x"),
            ("BEDA_DB_MAX_CONNECTIONS", "0"),
        ])
        .unwrap_err();
        assert_eq!(err.0.len(), 5, "{err}");
    }

    #[test]
    fn supabase_url_is_required_in_prod_and_issuer_can_be_overridden() {
        let err = load(&[
            ("BEDA_ENV", "prod"),
            ("BEDA_DATABASE_URL", "postgres://u@h/db"),
        ])
        .unwrap_err();
        assert_eq!(
            err.0,
            vec!["BEDA_SUPABASE_URL is required when BEDA_ENV=prod".to_owned()]
        );
        let config = load(&[
            ("BEDA_DATABASE_URL", "postgres://u@h/db"),
            ("BEDA_SUPABASE_URL", "http://host.docker.internal:54321"),
            ("BEDA_JWT_ISSUER", "http://127.0.0.1:54321/auth/v1"),
        ])
        .unwrap();
        assert_eq!(
            config.issuer().as_deref(),
            Some("http://127.0.0.1:54321/auth/v1")
        );
        assert!(
            load(&[("BEDA_DATABASE_URL", "postgres://u@h/db")])
                .unwrap()
                .issuer()
                .is_none()
        );
    }

    #[test]
    fn secret_key_needs_the_url_and_stays_out_of_debug_output() {
        let err = load(&[
            ("BEDA_DATABASE_URL", "postgres://u@h/db"),
            ("BEDA_SUPABASE_SECRET_KEY", "sb_secret_abc"),
        ])
        .unwrap_err();
        assert_eq!(
            err.0,
            vec!["BEDA_SUPABASE_SECRET_KEY needs BEDA_SUPABASE_URL".to_owned()]
        );
        let config = load(&[
            ("BEDA_DATABASE_URL", "postgres://u@h/db"),
            ("BEDA_SUPABASE_URL", "http://127.0.0.1:54321"),
            ("BEDA_SUPABASE_SECRET_KEY", " sb_secret_abc "),
        ])
        .unwrap();
        assert_eq!(
            config.supabase_secret_key.as_ref().map(Secret::expose),
            Some("sb_secret_abc")
        );
        assert!(!format!("{config:?}").contains("sb_secret_abc"));
    }

    #[test]
    fn origin_settings() {
        let config = load(&[
            ("BEDA_DATABASE_URL", "postgres://u@h/db"),
            ("BEDA_ORIGIN_CHECK", "on"),
            (
                "BEDA_ALLOWED_ORIGINS",
                "http://172.17.0.3:4321/, ,http://localhost:4322",
            ),
        ])
        .unwrap();
        assert!(config.origin_check);
        assert_eq!(
            config.allowed_origins(),
            [
                "http://localhost:4321",
                "http://172.17.0.3:4321",
                "http://localhost:4322"
            ]
        );
        assert!(
            !load(&[("BEDA_DATABASE_URL", "postgres://u@h/db")])
                .unwrap()
                .origin_check
        );
        assert!(
            load(&[
                ("BEDA_DATABASE_URL", "postgres://u@h/db"),
                ("BEDA_ORIGIN_CHECK", "yes")
            ])
            .is_err()
        );
    }

    #[test]
    fn database_url_is_required() {
        let err = load(&[]).unwrap_err();
        assert_eq!(err.0, vec!["BEDA_DATABASE_URL is required".to_owned()]);
    }
}

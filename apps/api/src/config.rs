//! Typed configuration from environment variables.

use std::fmt;
use std::net::SocketAddr;

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
        }
    }
}

impl Config {
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

        config.supabase_url = get("BEDA_SUPABASE_URL");
        if let Some(url) = &config.supabase_url
            && !(url.starts_with("http://") || url.starts_with("https://"))
        {
            problems.push("BEDA_SUPABASE_URL must start with http:// or https://".to_owned());
        }

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
        ])
        .unwrap();
        assert!(config.env.is_prod());
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
    fn database_url_is_required() {
        let err = load(&[]).unwrap_err();
        assert_eq!(err.0, vec!["BEDA_DATABASE_URL is required".to_owned()]);
    }
}

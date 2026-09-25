//! `beda-api` binary: `serve`, `admin`, `healthcheck`, `version`.
#![forbid(unsafe_code)]

use std::process::ExitCode;
use std::time::Duration;

use anyhow::Context as _;
use beda_api::{Config, telemetry};
use clap::{Parser, Subcommand};
use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
use tokio::net::{TcpListener, TcpStream};

const DRAIN_TIMEOUT: Duration = Duration::from_secs(10);
const HEALTHCHECK_TIMEOUT: Duration = Duration::from_secs(3);

#[derive(Parser)]
#[command(name = "beda-api", about = "HTTP API for beda.lol")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Run the HTTP server.
    Serve,
    /// Service commands (added in S16).
    Admin,
    /// Probe `GET /api/readyz` on the local server; exit 0 on 200.
    Healthcheck,
    /// Print the version and build SHA.
    Version,
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    match cli.command {
        Command::Version => {
            println!(
                "beda-api {} ({})",
                env!("CARGO_PKG_VERSION"),
                option_env!("BEDA_BUILD_SHA").unwrap_or("dev")
            );
            ExitCode::SUCCESS
        }
        Command::Admin => {
            println!("admin commands are added in S16");
            ExitCode::SUCCESS
        }
        Command::Healthcheck => run(healthcheck()),
        Command::Serve => run(serve()),
    }
}

fn run(fut: impl Future<Output = anyhow::Result<()>>) -> ExitCode {
    let runtime = match tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
    {
        Ok(rt) => rt,
        Err(err) => {
            eprintln!("failed to start the runtime: {err}");
            return ExitCode::FAILURE;
        }
    };
    match runtime.block_on(fut) {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("{err:#}");
            ExitCode::FAILURE
        }
    }
}

async fn serve() -> anyhow::Result<()> {
    let config = Config::from_env()?;
    telemetry::init(&config);

    let app = beda_api::app(&config);
    let listener = TcpListener::bind(config.http_addr)
        .await
        .with_context(|| format!("binding {}", config.http_addr))?;
    tracing::info!(addr = %config.http_addr, version = env!("CARGO_PKG_VERSION"), "api started");

    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel::<()>();
    let server = axum::serve(listener, app).with_graceful_shutdown(async move {
        let _ = stop_rx.await;
    });
    let mut server = tokio::spawn(async move { server.await });

    tokio::select! {
        result = &mut server => {
            result.context("server task failed")??;
            return Ok(());
        }
        () = shutdown_signal() => {}
    }

    tracing::info!(
        timeout_s = DRAIN_TIMEOUT.as_secs(),
        "shutting down, draining connections"
    );
    let _ = stop_tx.send(());
    if let Ok(result) = tokio::time::timeout(DRAIN_TIMEOUT, server).await {
        result.context("server task failed")??;
    } else {
        tracing::warn!("drain timeout reached, dropping open connections");
    }
    tracing::info!("api stopped");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        if tokio::signal::ctrl_c().await.is_err() {
            std::future::pending::<()>().await;
        }
    };
    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut sig) => {
                sig.recv().await;
            }
            Err(_) => std::future::pending::<()>().await,
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        () = ctrl_c => {}
        () = terminate => {}
    }
}

/// Minimal HTTP/1.1 probe so the distroless image needs no curl.
async fn healthcheck() -> anyhow::Result<()> {
    let config = Config::from_env()?;
    let port = config.http_addr.port();
    let probe = async {
        let mut stream = TcpStream::connect(("127.0.0.1", port)).await?;
        stream
            .write_all(b"GET /api/readyz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            .await?;
        let mut buf = [0_u8; 32];
        let n = stream.read(&mut buf).await?;
        anyhow::Ok(String::from_utf8_lossy(&buf[..n]).into_owned())
    };
    let status_line = tokio::time::timeout(HEALTHCHECK_TIMEOUT, probe)
        .await
        .context("healthcheck timed out")??;
    if status_line.starts_with("HTTP/1.1 200 ") {
        Ok(())
    } else {
        anyhow::bail!(
            "readyz answered: {}",
            status_line.lines().next().unwrap_or_default()
        )
    }
}

# syntax=docker/dockerfile:1
# beda-api image. Build context: the repository root (Cargo workspace).
#   docker build -f apps/api/Dockerfile --build-arg BEDA_BUILD_SHA=$(git rev-parse HEAD) .

ARG RUST_IMAGE=rust:1.94.1-alpine3.23

FROM ${RUST_IMAGE} AS chef
# The image already has the pinned toolchain; ignore rust-toolchain.toml so
# rustup does not try to download extra components during the build.
ENV RUSTUP_TOOLCHAIN=1.94.1 \
    CARGO_TERM_COLOR=never
RUN apk add --no-cache musl-dev \
 && cargo install --locked cargo-chef@0.1.78
WORKDIR /src

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /src/recipe.json recipe.json
# Dependencies only: this layer is cached until Cargo.lock changes.
RUN cargo chef cook --release --locked --recipe-path recipe.json -p beda-api
COPY . .
ARG BEDA_BUILD_SHA=dev
ENV SQLX_OFFLINE=true \
    BEDA_BUILD_SHA=${BEDA_BUILD_SHA}
# Alpine's Rust targets musl: the binary is fully static.
RUN cargo build --release --locked -p beda-api \
 && cp target/release/beda-api /beda-api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /beda-api /usr/local/bin/beda-api
ENV BEDA_ENV=prod \
    BEDA_HTTP_ADDR=0.0.0.0:8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/beda-api"]
CMD ["serve"]

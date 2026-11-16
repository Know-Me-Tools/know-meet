//! Know Meet token service.
//!
//! Issues room codes and short-lived LiveKit guest tokens behind same-origin `/api`.
//! Layers point inward: `http` and `infrastructure` depend on `application`, which
//! depends on `domain`. Only `infrastructure` names LiveKit or the OS random source.
#![forbid(unsafe_code)]

pub mod application;
pub mod config;
pub mod domain;
pub mod http;
pub mod infrastructure;
pub mod server;

pub use config::{Config, ConfigError};
pub use server::{build_router, serve};

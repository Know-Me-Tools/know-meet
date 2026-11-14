// TJ-ARCH-MOB-001 compliant
use axum::{
    Json, Router,
    extract::{Request, State},
    http::{HeaderName, HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
};
use gen_ui_notes::{Note, NoteError};
use std::path::PathBuf;
#[derive(Clone)]
struct AppState {
    database: PathBuf,
}
#[derive(serde::Deserialize)]
struct CreateNote {
    title: String,
}
struct ApiError(NoteError);
impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        match self.0 {
            NoteError::InvalidTitle => {
                (StatusCode::BAD_REQUEST, self.0.to_string()).into_response()
            }
            NoteError::Storage(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Could not access note storage",
            )
                .into_response(),
        }
    }
}
async fn list(State(state): State<AppState>) -> Result<Json<Vec<Note>>, ApiError> {
    tokio::task::spawn_blocking(move || gen_ui_notes::open(&state.database)?.list())
        .await
        .map_err(|error| ApiError(NoteError::Storage(error.to_string())))?
        .map(Json)
        .map_err(ApiError)
}
async fn create(
    State(state): State<AppState>,
    Json(input): Json<CreateNote>,
) -> Result<(StatusCode, Json<Note>), ApiError> {
    tokio::task::spawn_blocking(move || gen_ui_notes::open(&state.database)?.create(&input.title))
        .await
        .map_err(|error| ApiError(NoteError::Storage(error.to_string())))?
        .map(|note| (StatusCode::CREATED, Json(note)))
        .map_err(ApiError)
}
async fn capabilities() -> Result<Json<Vec<gen_ui_notes::Capability>>, ApiError> {
    let mut registry = gen_ui_notes::capabilities().map_err(ApiError)?;
    registry.extend(
        gen_ui_notes::parse_capabilities(include_str!("../capabilities/index.json"))
            .map_err(ApiError)?,
    );
    Ok(Json(registry))
}
/// DNS-rebinding guard: the BFF only answers requests addressed to its own loopback origin.
fn host_allowed(host: &str, port: u16) -> bool {
    let host = host.to_ascii_lowercase();
    host == format!("127.0.0.1:{port}") || host == format!("localhost:{port}")
}
async fn guard(State(port): State<u16>, request: Request, next: Next) -> Response {
    let allowed = request
        .headers()
        .get(header::HOST)
        .and_then(|value| value.to_str().ok())
        .is_some_and(|host| host_allowed(host, port));
    if !allowed {
        return (StatusCode::FORBIDDEN, "Host not allowed").into_response();
    }
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    );
    response
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let data = PathBuf::from(std::env::var_os("APP_DATA_DIR").unwrap_or_else(|| ".data".into()));
    let state = AppState {
        database: data.join("notes.sqlite3"),
    };
    gen_ui_notes::open(&state.database)?;
    let app = Router::new()
        .route("/api/notes", get(list).post(create))
        .route("/api/capabilities", get(capabilities))
        .route(
            "/api/runtime",
            get(|| async {
                (
                    StatusCode::SERVICE_UNAVAILABLE,
                    "UAR runtime is not configured",
                )
            }),
        )
        .fallback_service(tower_http::services::ServeDir::new(
            std::env::var("WEB_DIST_DIR").unwrap_or_else(|_| "apps/web/dist".to_owned()),
        ))
        .with_state(state);
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3000".to_owned())
        .parse::<u16>()?;
    let app = app.layer(middleware::from_fn_with_state(port, guard));
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port)).await?;
    println!("Notes ready at http://{}", listener.local_addr()?);
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::host_allowed;
    #[test]
    fn accepts_only_own_loopback_origin() {
        assert!(host_allowed("127.0.0.1:3000", 3000));
        assert!(host_allowed("LocalHost:3000", 3000));
        assert!(!host_allowed("evil.example:3000", 3000));
        assert!(!host_allowed("127.0.0.1:3001", 3000));
        assert!(!host_allowed("127.0.0.1", 3000));
    }
}

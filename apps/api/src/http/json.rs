//! JSON body extractor whose rejections use the API error shape.

use axum::extract::rejection::JsonRejection;
use axum::extract::{FromRequest, Request};
use serde::de::DeserializeOwned;

use super::error::AppError;

pub struct JsonBody<T>(pub T);

impl<T, S> FromRequest<S> for JsonBody<T>
where
    T: DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request(req: Request, state: &S) -> Result<Self, Self::Rejection> {
        match axum::Json::<T>::from_request(req, state).await {
            Ok(axum::Json(value)) => Ok(Self(value)),
            Err(JsonRejection::MissingJsonContentType(_)) => Err(AppError::BadRequest(
                "expected Content-Type: application/json".to_owned(),
            )),
            Err(JsonRejection::BytesRejection(_)) => Err(AppError::PayloadTooLarge),
            Err(err) => Err(AppError::BadRequest(err.body_text())),
        }
    }
}

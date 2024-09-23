use crate::keypair::get_keypair_from_secret_key;
use crate::{PubkyAuthDetails, Capability};
use crate::utils::create_response_vector;
use std::collections::HashMap;
use pubky::PubkyClient;
use serde_json;
use url::Url;

pub async fn authorize(url: String, secret_key: String) -> Vec<String> {
    let client = PubkyClient::testnet();
    let keypair = match get_keypair_from_secret_key(&secret_key) {
        Ok(keypair) => keypair,
        Err(error) => return create_response_vector(true, error),
    };

    let parsed_url = match Url::parse(&url) {
        Ok(url) => url,
        Err(_) => return create_response_vector(true, "Failed to parse URL".to_string()),
    };

    match client.send_auth_token(&keypair, parsed_url).await {
        Ok(_) => create_response_vector(false, "send_auth_token success".to_string()),
        Err(error) => create_response_vector(true, format!("send_auth_token failure: {}", error)),
    }
}

pub fn pubky_auth_details_to_json(details: &PubkyAuthDetails) -> Result<String, String> {
    serde_json::to_string(details).map_err(|_| "Error serializing to JSON".to_string())
}

pub fn parse_pubky_auth_url(url_str: &str) -> Result<PubkyAuthDetails, String> {
    let url = Url::parse(url_str).map_err(|_| "Invalid URL".to_string())?;

    if url.scheme() != "pubkyauth" {
        return Err("Invalid scheme, expected 'pubkyauth'".to_string());
    }

    // Collect query pairs into a HashMap for efficient access
    let query_params: HashMap<_, _> = url.query_pairs().into_owned().collect();

    let relay = query_params
        .get("relay")
        .cloned()
        .ok_or_else(|| "Missing relay".to_string())?;

    let capabilities_str = query_params
        .get("capabilities")
        .or_else(|| query_params.get("caps"))
        .cloned()
        .ok_or_else(|| "Missing capabilities".to_string())?;

    let secret = query_params
        .get("secret")
        .cloned()
        .ok_or_else(|| "Missing secret".to_string())?;

    // Parse capabilities
    let capabilities = capabilities_str
        .split(',')
        .map(|capability| {
            let mut parts = capability.splitn(2, ':');
            let path = parts
                .next()
                .ok_or_else(|| format!("Invalid capability format in '{}'", capability))?;
            let permission = parts
                .next()
                .ok_or_else(|| format!("Invalid capability format in '{}'", capability))?;
            Ok(Capability {
                path: path.to_string(),
                permission: permission.to_string(),
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(PubkyAuthDetails {
        relay,
        capabilities,
        secret,
    })
}

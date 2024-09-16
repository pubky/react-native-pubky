uniffi::setup_scaffolding!();

use std::collections::HashMap;
use pubky::PubkyClient;
use hex;
use serde::Serialize;
use url::Url;

#[uniffi::export]
async fn auth(url: String, secret_key: String) -> Vec<String> {
    let bytes = match hex::decode(&secret_key) {
        Ok(bytes) => bytes,
        Err(_) => return create_response_vector(true, "Failed to decode secret key".to_string())
    };

    let secret_key_bytes: [u8; 32] = match bytes.try_into() {
        Ok(secret_key) => secret_key,
        Err(_) => {
            return create_response_vector(true, "Failed to convert secret key to 32-byte array".to_string());
        }
    };

    let keypair = pkarr::Keypair::from_secret_key(&secret_key_bytes);
    let client = PubkyClient::testnet();

    let parsed_url = match Url::parse(&url) {
        Ok(url) => url,
        Err(_) => return create_response_vector(true, "Failed to parse URL".to_string()),
    };

    match client.send_auth_token(&keypair, parsed_url).await {
        Ok(_) => create_response_vector(false, "Auth token sent successfully".to_string()),
        Err(error) => create_response_vector(true, format!("Error sending auth token: {:?}", error)),
    }
}

#[uniffi::export]
fn parse_auth_url(url: String) -> Vec<String> {
    let parsed_details = match parse_pubky_auth_url(&url) {
        Ok(details) => details,
        Err(error) => return create_response_vector(true, error),
    };
    match pubky_auth_details_to_json(&parsed_details) {
        Ok(json) => create_response_vector(false, json),
        Err(error) => create_response_vector(true, error),
    }
}

#[derive(Debug, Serialize)]
struct Capability {
    path: String,
    permission: String,
}

#[derive(Debug, Serialize)]
struct PubkyAuthDetails {
    relay: String,
    capabilities: Vec<Capability>,
    secret: String,
}

fn pubky_auth_details_to_json(details: &PubkyAuthDetails) -> Result<String, String> {
    serde_json::to_string(details).map_err(|_| "Error serializing to JSON".to_string())
}

fn parse_pubky_auth_url(url_str: &str) -> Result<PubkyAuthDetails, String> {
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

fn create_response_vector(error: bool, data: String) -> Vec<String> {
    if error {
        vec!["error".to_string(), data]
    } else {
        vec!["success".to_string(), data]
    }
}

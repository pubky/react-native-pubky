uniffi::setup_scaffolding!();

use url::Url;
use pubky::PubkyClient;

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

fn create_response_vector(error: bool, data: String) -> Vec<String> {
    if error {
        vec!["error".to_string(), data]
    } else {
        vec!["success".to_string(), data]
    }
}

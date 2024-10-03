use std::string::ToString;
use std::sync::Arc;
use once_cell::sync::Lazy;
use pkarr::{dns, Keypair, PublicKey, SignedPacket};
use pkarr::bytes::Bytes;
use pkarr::dns::rdata::RData;
use pubky::PubkyClient;
use url::Url;
use std::str;

static PUBKY_CLIENT: Lazy<Arc<PubkyClient>> = Lazy::new(|| {
    // let custom_testnet = Testnet {
    //     bootstrap: vec!["http://localhost:6287".to_string()],
    //     nodes: vec![],
    // };
    //
    // let client = PubkyClient::builder()
    //     .testnet(&custom_testnet)
    //     .build();
    let client = PubkyClient::testnet();

    Arc::new(client)
});

// static PUBKY_CLIENT: Lazy<Arc<PubkyClient>> = Lazy::new(|| {
//     let custom_bootstrap = vec!["localhost:64630".to_string()];
//
//     let mut pkarr_settings = Settings::default();
//     pkarr_settings.dht.bootstrap = custom_bootstrap.clone().into();
//     pkarr_settings.resolvers = custom_bootstrap
//         .iter()
//         .flat_map(|resolver| resolver.to_socket_addrs())
//         .flatten()
//         .collect::<Vec<_>>()
//         .into();
//
//     let client = PubkyClient::builder()
//         .pkarr_settings(pkarr_settings)
//         .build();
//
//     Arc::new(client)
// });

const HOMESERVER: &str = "pubky://8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo";
const SECRET_KEY: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

#[tokio::main]
async fn main() {
    let sign_in_res = signin_or_signup(SECRET_KEY, HOMESERVER).await;
    println!("Sign In/Up Response: {:?}", sign_in_res);
    // let res = publish("recordname".to_string(), "recordcontent".to_string(), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".to_string()).await;
    // // println!("{:?}", res);
    let public_key = &sign_in_res[1];
    let url = construct_pubky_url(public_key, "mydomain.com", &[]);
    let put_res = put(&url, &"newcontent".to_string()).await;
    println!("Put Response: {:?}", put_res);
    let get_res = get(&url).await;
    println!("Get Response: {:?}", get_res);
    let list_res = list(url).await;
    println!("List Response: {:?}", list_res);
    let create_response = create_recovery_file(&SECRET_KEY, "password");
    println!("Create Response: {:?}", create_response);
    let recovery_file = create_response[1].clone();
    let decrypt_response = decrypt_recovery_file(&recovery_file, "password");
    println!("Decrypt Response: {:?}", decrypt_response);
}

pub fn create_recovery_file(secret_key: &str, passphrase: &str,) -> Vec<String> {
    if secret_key.is_empty() || passphrase.is_empty() {
        return create_response_vector(true, "Secret key and passphrase must not be empty".to_string());
    }
    let keypair = match get_keypair_from_secret_key(&secret_key) {
        Ok(keypair) => keypair,
        Err(error) => return create_response_vector(true, error),
    };
    let recovery_file_bytes = match PubkyClient::create_recovery_file(&keypair, &passphrase) {
        Ok(bytes) => bytes,
        Err(_) => return create_response_vector(true, "Failed to create recovery file".to_string()),
    };
    let recovery_file = base64::encode(&recovery_file_bytes);
    create_response_vector(false, recovery_file)
}

pub fn decrypt_recovery_file(recovery_file: &str, passphrase: &str) -> Vec<String> {
    if recovery_file.is_empty() || passphrase.is_empty() {
        return create_response_vector(true, "Recovery file and passphrase must not be empty".to_string());
    }
    let recovery_file_bytes = match base64::decode(&recovery_file) {
        Ok(bytes) => bytes,
        Err(error) => return create_response_vector(true, format!("Failed to decode recovery file: {}", error)),
    };
    let keypair = match PubkyClient::decrypt_recovery_file(&recovery_file_bytes, &passphrase) {
        Ok(keypair) => keypair,
        Err(error) => return create_response_vector(true, "Failed to decrypt recovery file".to_string()),
    };
    let secret_key = get_secret_key_from_keypair(&keypair);
    create_response_vector(false, secret_key)
}


pub async fn signin_or_signup(secret_key: &str, homeserver: &str) -> Vec<String> {
    let sign_in_res = sign_in(secret_key).await;
    if sign_in_res[0] == "success" {
        return sign_in_res;
    }
    let sign_up_res = sign_up(secret_key, homeserver).await;
    sign_up_res
}

pub async fn sign_up(secret_key: &str, homeserver: &str) -> Vec<String> {
    let client = PUBKY_CLIENT.clone();
    let keypair = match get_keypair_from_secret_key(&secret_key) {
        Ok(keypair) => keypair,
        Err(error) => return create_response_vector(true, error),
    };

    let homeserver_public_key = match PublicKey::try_from(homeserver) {
        Ok(key) => key,
        Err(error) => return create_response_vector(true, format!("Invalid homeserver public key: {}", error)),
    };

    match client.signup(&keypair, &homeserver_public_key).await {
        Ok(session) => create_response_vector(false, session.pubky().to_string()),
        Err(error) => create_response_vector(true, format!("signup failure: {}", error)),
    }
}

pub async fn sign_in(secret_key: &str) -> Vec<String> {
    let client = PUBKY_CLIENT.clone();
    let keypair = match get_keypair_from_secret_key(&secret_key) {
        Ok(keypair) => keypair,
        Err(error) => return create_response_vector(true, error),
    };
    match client.signin(&keypair).await {
        Ok(session) => {
            create_response_vector(false, session.pubky().to_string())
        },
        Err(error) => {
            create_response_vector(true, format!("Failed to sign in: {}", error))
        }
    }
}

pub async fn publish(record_name: String, record_content: String, secret_key: String) -> Vec<String> {
    let client = PUBKY_CLIENT.clone();

    let keypair = match get_keypair_from_secret_key(&secret_key) {
        Ok(keypair) => keypair,
        Err(error) => return create_response_vector(true, error),
    };

    let mut packet = dns::Packet::new_reply(0);

    let dns_name = match dns::Name::new(&record_name) {
        Ok(name) => name,
        Err(e) => return create_response_vector(true, format!("Failed to create DNS name: {}", e)),
    };

    let record_content_str: &str = record_content.as_str();

    let txt_record = match record_content_str.try_into() {
        Ok(value) => RData::TXT(value),
        Err(e) => {
            return create_response_vector(true, format!("Failed to convert string to TXT record: {}", e))
        }
    };

    packet.answers.push(dns::ResourceRecord::new(
        dns_name,
        dns::CLASS::IN,
        30,
        txt_record,
    ));

    match SignedPacket::from_packet(&keypair, &packet) {
        Ok(signed_packet) => {
            match client.pkarr().publish(&signed_packet).await {
                Ok(()) => {
                    create_response_vector(false, keypair.public_key().to_string())
                }
                Err(e) => {
                    create_response_vector(true, format!("Failed to publish: {}", e))
                }
            }
        }
        Err(e) => {
            create_response_vector(true, format!("Failed to create signed packet: {}", e))
        }
    }
}

pub fn get_keypair_from_secret_key(secret_key: &str) -> Result<Keypair, String> {
    let bytes = match hex::decode(&secret_key) {
        Ok(bytes) => bytes,
        Err(_) => return Err("Failed to decode secret key".to_string())
    };

    let secret_key_bytes: [u8; 32] = match bytes.try_into() {
        Ok(secret_key) => secret_key,
        Err(_) => {
            return Err("Failed to convert secret key to 32-byte array".to_string());
        }
    };

    Ok(Keypair::from_secret_key(&secret_key_bytes))
}

pub fn create_response_vector(error: bool, data: String) -> Vec<String> {
    if error {
        vec!["error".to_string(), data]
    } else {
        vec!["success".to_string(), data]
    }
}

pub async fn put(url: &String, content: &String) -> Vec<String> {
    let client = PUBKY_CLIENT.clone();
    let trimmed_url = url.trim_end_matches('/');
    let parsed_url = match Url::parse(&trimmed_url) {
        Ok(url) => url,
        Err(_) => return create_response_vector(true, "Failed to parse URL".to_string()),
    };
    match client.put(parsed_url, &content.as_bytes()).await {
        Ok(_) => create_response_vector(false, trimmed_url.to_string()),
        Err(error) => {
            create_response_vector(true, format!("Failed to put: {}", error))
        }
    }
}

pub async fn get(url: &String) -> Vec<String> {
    let client = PUBKY_CLIENT.clone();
    let trimmed_url = url.trim_end_matches('/');

    // Parse the URL and return error early if it fails
    let parsed_url = match Url::parse(&trimmed_url) {
        Ok(url) => url,
        Err(_) => return create_response_vector(true, "Failed to parse URL".to_string()),
    };

    // Perform the request and return error early if no data is returned
    let result: Option<Bytes> = match client.get(parsed_url).await {
        Ok(res) => res,
        Err(_) => return create_response_vector(true, "Request failed".to_string()),
    };

    // If there are bytes, attempt to convert to UTF-8
    let bytes = match result {
        Some(bytes) => bytes,
        None => return create_response_vector(true, "No data returned".to_string()),
    };

    // Try to convert bytes to string and return error if it fails
    let string = match str::from_utf8(&bytes) {
        Ok(s) => s.to_string(),
        Err(_) => return create_response_vector(true, "Invalid UTF-8 sequence".to_string()),
    };

    // If everything is successful, return the formatted response
    create_response_vector(false, string)
}

pub async fn list(url: String) -> Vec<String> {
    let client = PUBKY_CLIENT.clone();
    let trimmed_url = url.trim_end_matches('/');
    let parsed_url = match Url::parse(&trimmed_url) {
        Ok(url) => url,
        Err(_) => return create_response_vector(true, "Failed to parse URL".to_string()),
    };
    let list_builder = match client.list(parsed_url) {
        Ok(list) => list,
        Err(error) => return create_response_vector(true, format!("Failed to list: {}", error)),
    };
    // Execute the non-Send part synchronously
    let send_future = list_builder.send();
    let send_res = match send_future.await {
        Ok(res) => res,
        Err(error) => return create_response_vector(true, format!("Failed to send list request: {}", error))
    };
    let json_string = match serde_json::to_string(&send_res) {
        Ok(json) => json,
        Err(error) => return create_response_vector(true, format!("Failed to serialize JSON: {}", error)),
    };
    create_response_vector(false, json_string)
}

fn construct_pubky_url(public_key: &str, domain: &str, path_segments: &[&str]) -> String {
    // Construct the base URL
    let mut url = format!("pubky://{}/pub/{}", public_key, domain);

    // Append each path segment, separated by '/'
    for segment in path_segments {
        if !segment.is_empty() {
            url.push('/');
            url.push_str(segment);
        }
    }

    // Remove trailing slash if present
    if url.ends_with('/') {
        url.pop();
    }

    url
}

fn get_list_url(full_url: &str) -> Option<String> {
    if let Some(index) = full_url.find("pub/") {
        // Add length of "pub/" to include it in the substring
        let end_index = index + "pub/".len();
        let substring = &full_url[..end_index];
        Some(substring.to_string())
    } else {
        // "pub/" not found in the string
        None
    }
}

pub fn get_secret_key_from_keypair(keypair: &Keypair) -> String {
    hex::encode(keypair.secret_key())
}

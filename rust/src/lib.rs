mod types;
mod keypair;
mod auth;
mod utils;

pub use types::*;
pub use keypair::*;
pub use auth::*;
pub use utils::*;

uniffi::setup_scaffolding!();

use std::str;
use std::collections::HashMap;
use base64::Engine;
use base64::engine::general_purpose;
use pubky::PubkyClient;
use hex;
use hex::ToHex;
use serde::Serialize;
use url::Url;
use tokio;
use pkarr::{PkarrClient, SignedPacket, Keypair, dns, PublicKey};
use pkarr::dns::rdata::{RData, HTTPS, SVCB};
use pkarr::dns::{Packet, ResourceRecord};
use serde_json::json;
use utils::*;
use once_cell::sync::Lazy;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use pkarr::bytes::Bytes;
use pubky_common::session::Session;
use tokio::runtime::Runtime;
use tokio::time;

static PUBKY_CLIENT: Lazy<Arc<PubkyClient>> = Lazy::new(|| {
    Arc::new(PubkyClient::testnet())
});

static TOKIO_RUNTIME: Lazy<Arc<Runtime>> = Lazy::new(|| {
    Arc::new(
        Runtime::new().expect("Failed to create Tokio runtime")
    )
});

// Define the EventListener trait
#[uniffi::export(callback_interface)]
pub trait EventListener: Send + Sync {
    fn on_event_occurred(&self, event_data: String);
}

#[derive(uniffi::Object)]
pub struct EventNotifier {
    listener: Arc<Mutex<Option<Box<dyn EventListener>>>>,
}

impl EventNotifier {
    #[uniffi::constructor]
    pub fn new() -> Self {
        Self {
            listener: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_listener(&self, listener: Box<dyn EventListener>) {
        let mut lock = self.listener.lock().unwrap();
        *lock = Some(listener);
    }

    pub fn remove_listener(&self) {
        let mut lock = self.listener.lock().unwrap();
        *lock = None;
    }

    pub fn notify_event(&self, event_data: String) {
        let lock = self.listener.lock().unwrap();
        if let Some(listener) = &*lock {
            listener.on_event_occurred(event_data);
        }
    }
}

static EVENT_NOTIFIER: Lazy<Arc<EventNotifier>> = Lazy::new(|| {
    Arc::new(EventNotifier::new())
});

#[uniffi::export]
pub fn set_event_listener(listener: Box<dyn EventListener>) {
    EVENT_NOTIFIER.as_ref().set_listener(listener);
}

#[uniffi::export]
pub fn remove_event_listener() {
    EVENT_NOTIFIER.as_ref().remove_listener();
}

pub fn start_internal_event_loop() {
    let event_notifier = EVENT_NOTIFIER.clone();
    let runtime = TOKIO_RUNTIME.clone();
    runtime.spawn(async move {
        let mut interval = time::interval(Duration::from_secs(2));
        loop {
            interval.tick().await;
            event_notifier.as_ref().notify_event("Internal event triggered".to_string());
        }
    });
}

#[uniffi::export]
pub fn delete_file(url: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let client = PUBKY_CLIENT.clone();
        let parsed_url = match Url::parse(&url) {
            Ok(url) => url,
            Err(_) => return create_response_vector(true, "Failed to parse URL".to_string()),
        };
        match client.delete(parsed_url).await {
            Ok(_) => create_response_vector(false, "Deleted successfully".to_string()),
            Err(error) => create_response_vector(true, format!("Failed to delete: {}", error)),
        }
    })
}

#[uniffi::export]
pub fn session(pubky: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let client = PUBKY_CLIENT.clone();
        let public_key = match PublicKey::try_from(pubky) {
            Ok(key) => key,
            Err(error) => return create_response_vector(true, format!("Invalid homeserver public key: {}", error)),
        };
        let result = match client.session(&public_key).await {
            Ok(session) => session,
            Err(error) => return create_response_vector(true, format!("Failed to get session: {}", error)),
        };
        let session: Session = match result {
            Some(session) => session,
            None => return create_response_vector(true, "No session returned".to_string()),
        };

        let json_obj = json!({
            "pubky": session.pubky().to_string(),
            "capabilities": session.capabilities().iter().map(|c| c.to_string()).collect::<Vec<String>>(),
        });

        let json_str = match serde_json::to_string(&json_obj) {
            Ok(json) => json,
            Err(e) => return create_response_vector(true, format!("Failed to serialize JSON: {}", e)),
        };

        create_response_vector(false, json_str)
    })
}

#[uniffi::export]
pub fn generate_secret_key() -> Vec<String> {
    let keypair = generate_keypair();
    let secret_key = get_secret_key_from_keypair(&keypair);
    let public_key = keypair.public_key();
    let uri = public_key.to_uri_string();
    let json_obj = json!({
        "secret_key": secret_key,
        "public_key": public_key.to_string(),
        "uri": uri,
     });

    let json_str = match serde_json::to_string(&json_obj) {
        Ok(json) => json,
        Err(e) => return create_response_vector(true, format!("Failed to serialize JSON: {}", e)),
    };
    start_internal_event_loop();
    create_response_vector(false, json_str)
}

#[uniffi::export]
pub fn get_public_key_from_secret_key(secret_key: String) -> Vec<String> {
    let keypair = match get_keypair_from_secret_key(&secret_key) {
        Ok(keypair) => keypair,
        Err(error) => return create_response_vector(true, error),
    };
    let public_key = keypair.public_key();
    let uri = public_key.to_uri_string();
    let json_obj = json!({
        "public_key": public_key.to_string(),
        "uri": uri,
     });

    let json_str = match serde_json::to_string(&json_obj) {
        Ok(json) => json,
        Err(e) => return create_response_vector(true, format!("Failed to serialize JSON: {}", e)),
    };
    create_response_vector(false, json_str)
}

#[uniffi::export]
pub fn publish_https(record_name: String, target: String, secret_key: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let client = PUBKY_CLIENT.clone();

        let keypair = match get_keypair_from_secret_key(&secret_key) {
            Ok(keypair) => keypair,
            Err(error) => return create_response_vector(true, error),
        };

        // Create SVCB record with the target domain
        let target = match target.as_str().try_into() {
            Ok(target) => target,
            Err(e) => return create_response_vector(true, format!("Invalid target: {}", e)),
        };
        let svcb = SVCB::new(0, target);

        // Create HTTPS record
        let https_record = HTTPS(svcb);

        // Create DNS packet
        let mut packet = Packet::new_reply(0);
        let dns_name = match dns::Name::new(&record_name) {
            Ok(name) => name,
            Err(e) => return create_response_vector(true, format!("Invalid DNS name: {}", e)),
        };

        packet.answers.push(ResourceRecord::new(
            dns_name,
            dns::CLASS::IN,
            3600, // TTL in seconds
            dns::rdata::RData::HTTPS(https_record),
        ));

        let signed_packet = match SignedPacket::from_packet(&keypair, &packet) {
            Ok(signed_packet) => signed_packet,
            Err(e) => return create_response_vector(true, format!("Failed to create signed packet: {}", e)),
        };

        match client.pkarr().publish(&signed_packet).await {
            Ok(()) => create_response_vector(false, keypair.public_key().to_string()),
            Err(e) => create_response_vector(true, format!("Failed to publish: {}", e)),
        }
    })
}

#[uniffi::export]
pub fn resolve_https(public_key: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let public_key = match public_key.as_str().try_into() {
            Ok(key) => key,
            Err(e) => return create_response_vector(true, format!("Invalid public key: {}", e)),
        };

        let client = PUBKY_CLIENT.clone();

        match client.pkarr().resolve(&public_key).await {
            Ok(Some(signed_packet)) => {
                // Extract HTTPS records from the signed packet
                let https_records: Vec<serde_json::Value> = signed_packet.packet().answers.iter()
                    .filter_map(|record| {
                        if let dns::rdata::RData::HTTPS(https) = &record.rdata {
                            // Create a JSON object
                            let mut https_json = serde_json::json!({
                                "name": record.name.to_string(),
                                "class": format!("{:?}", record.class),
                                "ttl": record.ttl,
                                "priority": https.0.priority,
                                "target": https.0.target.to_string(),
                            });

                            // Access specific parameters using the constants from SVCB
                            if let Some(port_param) = https.0.get_param(SVCB::PORT) {
                                if port_param.len() == 2 {
                                    let port = u16::from_be_bytes([port_param[0], port_param[1]]);
                                    https_json["port"] = serde_json::json!(port);
                                }
                            }

                            // Access ALPN parameter if needed
                            if let Some(alpn_param) = https.0.get_param(SVCB::ALPN) {
                                // Parse ALPN protocols (list of character strings)
                                let mut position = 0;
                                let mut alpn_protocols = Vec::new();
                                while position < alpn_param.len() {
                                    let length = alpn_param[position] as usize;
                                    position += 1;
                                    if position + length <= alpn_param.len() {
                                        let protocol = String::from_utf8_lossy(
                                            &alpn_param[position..position + length],
                                        );
                                        alpn_protocols.push(protocol.to_string());
                                        position += length;
                                    } else {
                                        break; // Malformed ALPN parameter
                                    }
                                }
                                https_json["alpn"] = serde_json::json!(alpn_protocols);
                            }
                            // TODO: Add other parameters as needed.
                            Some(https_json)
                        } else {
                            None
                        }
                    })
                    .collect();

                if https_records.is_empty() {
                    return create_response_vector(true, "No HTTPS records found".to_string());
                }

                // Create JSON response
                let json_obj = json!({
                    "public_key": public_key.to_string(),
                    "https_records": https_records,
                    "last_seen": signed_packet.last_seen(),
                    "timestamp": signed_packet.timestamp(),
                });

                let json_str = match serde_json::to_string(&json_obj) {
                    Ok(json) => json,
                    Err(e) => return create_response_vector(true, format!("Failed to serialize JSON: {}", e)),
                };

                create_response_vector(false, json_str)
            },
            Ok(None) => create_response_vector(true, "No signed packet found".to_string()),
            Err(e) => create_response_vector(true, format!("Failed to resolve: {}", e)),
        }
    })
}

#[uniffi::export]
pub fn sign_up(secret_key: String, homeserver: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
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
    })
}

#[uniffi::export]
pub fn sign_in(secret_key: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let client = PUBKY_CLIENT.clone();
        let keypair = match get_keypair_from_secret_key(&secret_key) {
            Ok(keypair) => keypair,
            Err(error) => return create_response_vector(true, error),
        };
        match client.signin(&keypair).await {
            Ok(_) => create_response_vector(false, "Sign in success".to_string()),
            Err(error) => {
                create_response_vector(true, format!("Failed to sign in: {}", error))
            }
        }
    })
}

#[uniffi::export]
pub fn sign_out(secret_key: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let client = PUBKY_CLIENT.clone();
        let keypair = match get_keypair_from_secret_key(&secret_key) {
            Ok(keypair) => keypair,
            Err(error) => return create_response_vector(true, error),
        };
        match client.signout(&keypair.public_key()).await {
            Ok(_) => create_response_vector(false, "Sign out success".to_string()),
            Err(error) => {
                create_response_vector(true, format!("Failed to sign out: {}", error))
            }
        }
    })
}

#[uniffi::export]
pub fn put(url: String, content: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
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
    })
}

#[uniffi::export]
pub fn get(url: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let client = PUBKY_CLIENT.clone();
        let trimmed_url = url.trim_end_matches('/');
        let parsed_url = match Url::parse(&trimmed_url) {
            Ok(url) => url,
            Err(_) => return create_response_vector(true, "Failed to parse URL".to_string()),
        };
        let result: Option<Bytes> = match client.get(parsed_url).await {
            Ok(res) => res,
            Err(_) => return create_response_vector(true, "Request failed".to_string()),
        };
        let bytes = match result {
            Some(bytes) => bytes,
            None => return create_response_vector(true, "No data returned".to_string()),
        };
        let string = match str::from_utf8(&bytes) {
            Ok(s) => s.to_string(),
            Err(_) => return create_response_vector(true, "Invalid UTF-8 sequence".to_string()),
        };
        create_response_vector(false, string)
    })
}

/**
* Resolve a signed packet from a public key
* @param public_key The public key to resolve
* @returns A vector with two elements: the first element is a boolean indicating success or failure,
* and the second element is the response data (either an error message or the resolved signed packet)
**/
#[uniffi::export]
pub fn resolve(public_key: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
        let public_key = match public_key.as_str().try_into() {
            Ok(key) => key,
            Err(e) => return create_response_vector(true, format!("Invalid zbase32 encoded key: {}", e)),
        };
        let client = PUBKY_CLIENT.clone();

        match client.pkarr().resolve(&public_key).await {
            Ok(Some(signed_packet)) => {
                // Collect references to ResourceRecords from the signed packet's answers
                let all_records: Vec<&ResourceRecord> = signed_packet.packet().answers.iter().collect();
                // Convert each ResourceRecord to a JSON value, handling errors appropriately
                let json_records: Vec<serde_json::Value> = all_records
                    .iter()
                    .filter_map(|record| {
                        match resource_record_to_json(record) {
                            Ok(json_value) => Some(json_value),
                            Err(e) => {
                                eprintln!("Error converting record to JSON: {}", e);
                                None
                            }
                        }
                    })
                    .collect();

                let bytes = signed_packet.as_bytes();
                let public_key = &bytes[..32];
                let signature = &bytes[32..96];
                let timestamp = signed_packet.timestamp();
                let dns_packet = &bytes[104..];
                let hex: String = signed_packet.encode_hex();

                let json_obj = json!({
                    "signed_packet": hex,
                    "public_key": general_purpose::STANDARD.encode(public_key),
                    "signature": general_purpose::STANDARD.encode(signature),
                    "timestamp": timestamp,
                    "last_seen": signed_packet.last_seen(),
                    "dns_packet": general_purpose::STANDARD.encode(dns_packet),
                    "records": json_records
                });

                let json_str = serde_json::to_string(&json_obj)
                    .expect("Failed to convert JSON object to string");

                create_response_vector(false, json_str)
            },
            Ok(None) => {
                create_response_vector(true, "No signed packet found".to_string())
            }
            Err(e) => {
                create_response_vector(true, format!("Failed to resolve: {}", e))
            }
        }
    })
}

#[uniffi::export]
pub fn publish(record_name: String, record_content: String, secret_key: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
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
    })
}
#[uniffi::export]
pub fn list(url: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(async {
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
    })
}

#[uniffi::export]
pub fn auth(url: String, secret_key: String) -> Vec<String> {
    let runtime = TOKIO_RUNTIME.clone();
    runtime.block_on(authorize(url, secret_key))
}

#[uniffi::export]
pub fn parse_auth_url(url: String) -> Vec<String> {
    let parsed_details = match parse_pubky_auth_url(&url) {
        Ok(details) => details,
        Err(error) => return create_response_vector(true, error),
    };
    match pubky_auth_details_to_json(&parsed_details) {
        Ok(json) => create_response_vector(false, json),
        Err(error) => create_response_vector(true, error),
    }
}

#[uniffi::export]
pub fn create_recovery_file(secret_key: String, passphrase: String,) -> Vec<String> {
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

#[uniffi::export]
pub fn decrypt_recovery_file(recovery_file: String, passphrase: String) -> Vec<String> {
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

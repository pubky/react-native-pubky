mod types;
mod keypair;
mod auth;
mod utils;

pub use types::*;
pub use keypair::*;
pub use auth::*;
pub use utils::*;

uniffi::setup_scaffolding!();

use std::collections::HashMap;
use base64::Engine;
use base64::engine::general_purpose;
use pubky::PubkyClient;
use hex;
use serde::Serialize;
use url::Url;
use tokio;
use pkarr::{PkarrClient, SignedPacket, Keypair, dns, PublicKey};
use pkarr::dns::rdata::RData;
use pkarr::dns::ResourceRecord;
use serde_json::json;
use utils::*;

#[uniffi::export]
fn resolve(public_key: String) -> Vec<String> {
    let public_key = match public_key.as_str().try_into() {
        Ok(key) => key,
        Err(e) => return create_response_vector(true, format!("Invalid zbase32 encoded key: {}", e)),
    };
    let client = match PkarrClient::builder().build() {
        Ok(client) => client,
        Err(e) => return create_response_vector(true, format!("Failed to build PkarrClient: {}", e)),
    };

    match client.resolve(&public_key) {
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
            let timestamp = u64::from_be_bytes(match bytes[96..104].try_into() {
                Ok(tsbytes) => tsbytes,
                Err(_) => return create_response_vector(true, "Failed to convert timestamp bytes".to_string())
            });
            let dns_packet = &bytes[104..];

            let json_obj = json!({
                "public_key": general_purpose::STANDARD.encode(public_key),
                "signature": general_purpose::STANDARD.encode(signature),
                "timestamp": timestamp,
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
}

#[uniffi::export]
fn publish(record_name: String, record_content: String, secret_key: String) -> Vec<String> {
    let client = match PkarrClient::builder().build() {
        Ok(client) => client,
        Err(e) => return create_response_vector(true, format!("Failed to build PkarrClient: {}", e)),
    };

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
            match client.publish(&signed_packet) {
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


#[uniffi::export]
fn auth(url: String, secret_key: String) -> Vec<String> {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(authorize(url, secret_key))
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

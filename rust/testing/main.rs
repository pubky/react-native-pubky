use std::string::ToString;
use std::sync::Arc;
use once_cell::sync::Lazy;
use pkarr::{dns, Keypair, PublicKey, SignedPacket};
use pkarr::dns::rdata::RData;
use pkarr::mainline::Testnet;
use pubky::PubkyClient;

static PUBKY_CLIENT: Lazy<Arc<PubkyClient>> = Lazy::new(|| {
    let custom_testnet = Testnet {
        bootstrap: vec!["http://localhost:15411".to_string()],
        nodes: vec![],
    };

    let client = PubkyClient::builder()
        .testnet(&custom_testnet)
        .build();

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
    // let sign_in_res = signin_or_signup(SECRET_KEY, HOMESERVER).await;
    // println!("{:?}", sign_in_res);
    let res = publish("recordname".to_string(), "recordcontent".to_string(), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".to_string()).await;
    println!("{:?}", res);
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
        Ok(_) => create_response_vector(false, "signup success".to_string()),
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
            create_response_vector(false, session.pubky().to_uri_string())
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
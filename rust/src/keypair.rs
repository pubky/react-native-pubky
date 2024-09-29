use pkarr::Keypair;

/**
 * Get a keypair from a secret key
 */
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

/**
 * Get the secret key from a keypair
 */
pub fn get_secret_key_from_keypair(keypair: &Keypair) -> String {
    hex::encode(keypair.secret_key())
}

/**
 * Generate a new keypair
 */
pub fn generate_keypair() -> Keypair {
    Keypair::random()
}
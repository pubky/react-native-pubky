use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Capability {
    pub path: String,
    pub permission: String,
}

#[derive(Debug, Serialize)]
pub struct PubkyAuthDetails {
    pub relay: String,
    pub capabilities: Vec<Capability>,
    pub secret: String,
}
use std::error::Error;
use std::net::{Ipv4Addr, Ipv6Addr};
use serde_json::json;
use base64::{engine::general_purpose, Engine};
use pkarr::dns::rdata::RData;
use pkarr::dns::ResourceRecord;

pub fn create_response_vector(error: bool, data: String) -> Vec<String> {
    if error {
        vec!["error".to_string(), data]
    } else {
        vec!["success".to_string(), data]
    }
}

pub fn extract_rdata_for_json(record: &ResourceRecord) -> serde_json::Value {
    match &record.rdata {
        RData::TXT(txt) => {
            let attributes = txt.attributes();
            let strings: Vec<String> = attributes.into_iter()
                .map(|(key, value)| {
                    match value {
                        Some(v) => format!("{}={}", key, v),
                        None => key,
                    }
                })
                .collect();
            json!({
                "type": "TXT",
                "strings": strings
            })
        },
        RData::A(a) => {
            let ipv4 = Ipv4Addr::from(a.address);
            json!({
                "type": "A",
                "address": ipv4.to_string()
            })
        },
        RData::AAAA(aaaa) => {
            let ipv6 = Ipv6Addr::from(aaaa.address);
            json!({
                "type": "AAAA",
                "address": ipv6.to_string()
            })
        },
        RData::AFSDB(afsdb) => {
            json!({
                "type": "AFSDB",
                "subtype": afsdb.subtype,
                "hostname": afsdb.hostname.to_string()
            })
        },
        RData::CAA(caa) => {
            json!({
                "type": "CAA",
                "flag": caa.flag,
                "tag": caa.tag.to_string(),
                "value": caa.value.to_string()
            })
        },
        RData::HINFO(hinfo) => {
            json!({
                "type": "HINFO",
                "cpu": hinfo.cpu.to_string(),
                "os": hinfo.os.to_string()
            })
        },
        RData::ISDN(isdn) => {
            json!({
                "type": "ISDN",
                "address": isdn.address.to_string(),
                "sa": isdn.sa.to_string()
            })
        },
        RData::LOC(loc) => {
            json!({
                "type": "LOC",
                "version": loc.version,
                "size": loc.size,
                "horizontal_precision": loc.horizontal_precision,
                "vertical_precision": loc.vertical_precision,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "altitude": loc.altitude
            })
        },
        RData::MINFO(minfo) => {
            json!({
                "type": "MINFO",
                "rmailbox": minfo.rmailbox.to_string(),
                "emailbox": minfo.emailbox.to_string()
            })
        },
        RData::MX(mx) => {
            json!({
                "type": "MX",
                "preference": mx.preference,
                "exchange": mx.exchange.to_string()
            })
        },
        RData::NAPTR(naptr) => {
            json!({
                "type": "NAPTR",
                "order": naptr.order,
                "preference": naptr.preference,
                "flags": naptr.flags.to_string(),
                "services": naptr.services.to_string(),
                "regexp": naptr.regexp.to_string(),
                "replacement": naptr.replacement.to_string()
            })
        },
        RData::NULL(_, null_record) => {
            json!({
                "type": "NULL",
                "data": base64::encode(null_record.get_data())
            })
        },
        RData::OPT(opt) => {
            json!({
                "type": "OPT",
                "udp_packet_size": opt.udp_packet_size,
                "version": opt.version,
                "opt_codes": opt.opt_codes.iter().map(|code| {
                    json!({
                        "code": code.code,
                        "data": base64::encode(&code.data)
                    })
                }).collect::<Vec<_>>()
            })
        },
        RData::RouteThrough(rt) => {
            json!({
                "type": "RT",
                "preference": rt.preference,
                "intermediate_host": rt.intermediate_host.to_string()
            })
        },
        RData::RP(rp) => {
            json!({
                "type": "RP",
                "mbox": rp.mbox.to_string(),
                "txt": rp.txt.to_string()
            })
        },
        RData::SOA(soa) => {
            json!({
                "type": "SOA",
                "mname": soa.mname.to_string(),
                "rname": soa.rname.to_string(),
                "serial": soa.serial,
                "refresh": soa.refresh,
                "retry": soa.retry,
                "expire": soa.expire,
                "minimum": soa.minimum
            })
        },
        RData::SRV(srv) => {
            json!({
                "type": "SRV",
                "priority": srv.priority,
                "weight": srv.weight,
                "port": srv.port,
                "target": srv.target.to_string()
            })
        },
        RData::SVCB(svcb) => {
            let mut params = serde_json::Map::new();
            for (key, value) in svcb.iter_params() {
                params.insert(key.to_string(), json!(base64::encode(value)));
            }
            json!({
                "type": "SVCB",
                "priority": svcb.priority,
                "target": svcb.target.to_string(),
                "params": params
            })
        },
        RData::WKS(wks) => {
            json!({
                "type": "WKS",
                "address": Ipv4Addr::from(wks.address).to_string(),
                "protocol": wks.protocol,
                "bit_map": base64::encode(&wks.bit_map)
            })
        },

        _ => json!({
            "type": format!("{:?}", record.rdata.type_code()),
            "data": "Unhandled record type"
        }),
    }
}

pub fn resource_record_to_json(record: &ResourceRecord) -> Result<serde_json::Value, Box<dyn Error>> {
    Ok(json!({
        "name": record.name.to_string(),
        "class": format!("{:?}", record.class),
        "ttl": record.ttl,
        "rdata": extract_rdata_for_json(record),
        "cache_flush": record.cache_flush
    }))
}

pub fn construct_pubky_url(public_key: &str, domain: &str, path_segments: &[&str]) -> String {
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

/**
* Extract everything up to the first instance of "pub/" in a Pubky URL
*
* # Arguments
* * `full_url` - The full URL
*
* # Returns
* * `Some(String)` - The "pub/" part of the URL
* * `None` - If "pub/" is not found in the URL
*/
pub fn get_list_url(full_url: &str) -> Option<String> {
    if let Some(index) = full_url.find("pub/") {
        let end_index = index + "pub/".len();
        let substring = &full_url[..end_index];
        Some(substring.to_string())
    } else {
        // "pub/" not found in the string
        None
    }
}

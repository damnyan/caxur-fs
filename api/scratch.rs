use jsonwebtoken::EncodingKey;
fn main() {
    let key = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgTWayUP+PIGzM+ZJD\nxlg/f8tJQwDkD+heE+8P9V53IQehRANCAAT3eIdXErYJuYJm7NCWaJx7AZh3mq3j\nP2IjGQALcqNyiMxhWSX/KZcyLAtshBng2cwHxf1ogYTrTheiyJz3w5OL\n-----END PRIVATE KEY-----\n";
    match EncodingKey::from_ec_pem(key.as_bytes()) {
        Ok(_) => println!("OK"),
        Err(e) => println!("ERROR: {:?}", e),
    }
}

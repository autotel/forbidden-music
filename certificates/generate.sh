rm ./private.key
rm ./cert.crt

# openssl genrsa -out ssl.key -des3 2048
# openssl req -x509 -sha256 -new -nodes -days 60 -key ssl.key -out ssl.pem

openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out ssl.pem -out cert.crt

echo "certificate created, now go to your web browser and configure it to trus this certificate"
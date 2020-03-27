OPENSSL=`which openssl`
CERTUTIL=`which certutil`

[ $OPENSSL ] && [ $CERTUTIL ] && echo "openssl and certutil found!"
[ ! $OPENSSL ] || [ ! $CERTUTIL ] && echo "Error: openssl and certutil not found, please install openssl and libnss3 tools first" && exit 404

PBICV='PowerBI Custom Visuals'

ROOT_CA_CRT=root-ca.crt
ROOT_CA_KEY=root-ca.key
ROOT_CA_PEM=root-ca.pem

LH_CSR=PowerBICustomVisualTest.csr
LH_CRT=PowerBICustomVisualTest_public.crt
LH_KEY=PowerBICustomVisualTest_private.key

# generate root certificate authority
openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout $PWD/certs/$ROOT_CA_KEY -out $PWD/certs/$ROOT_CA_PEM -subj "/C=US/CN=$PBICV Test CA/O=$PBICV"
openssl x509 -outform pem -in $PWD/certs/$ROOT_CA_PEM -out $PWD/certs/$ROOT_CA_CRT

# generate certificate for localhost using the generated CA and openssl.cnf
openssl req -new -nodes -newkey rsa:2048 -keyout $PWD/certs/$LH_KEY -out $PWD/certs/$LH_CSR -subj "/C=US/O=$PBICV/CN=localhost"
openssl x509 -req -sha256 -days 1024 -in $PWD/certs/$LH_CSR -CA $PWD/certs/$ROOT_CA_PEM -CAkey $PWD/certs/$ROOT_CA_KEY -CAcreateserial -extfile $PWD/lib/openssl.cnf -out $PWD/certs/$LH_CRT

# Add certs to chromium/firefox/system-wide
certutil -A -n "$PBICV Test CA" -t "CT,C,C" -i $PWD/certs/$ROOT_CA_PEM -d sql:$HOME/.pki/nssdb

for certDB in $(find $HOME/.mozilla* -name "cert*.db")
do
certDir=$(dirname ${certDB});
certutil -A -n "$PBICV Test CA" -t "CT,C,C" -i $PWD/certs/$ROOT_CA_PEM -d sql:${certDir}
done

echo "\n\e[1m\e[92m ✓ Certificates was generated successfully. Please follow the additional steps to finish:\e[0m"
echo "run \e[1msudo cp $PWD/certs/$ROOT_CA_PEM /usr/local/share/ca-certificates/powerbi-root-ca.crt\e[0m"
echo "then run \e[1msudo update-ca-certificates\e[0m"
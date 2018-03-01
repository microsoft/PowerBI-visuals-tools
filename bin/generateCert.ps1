$passphrase = $Args[0]
$subject = $Args[1]
$keyLength = $Args[2]
$pfxPath = $Args[3]
$cerPath = $Args[4]
$keyPath = $Args[5]
$validPeriod = $Args[6]
$hashAlg = $Args[7]

$secstr = ConvertTo-SecureString -String "$passphrase" -Force -AsPlainText;
$certId = (
        New-SelfSignedCertificate -DnsName localhost -HashAlgorithm $hashAlg -Type Custom -Subject $subject -KeyAlgorithm RSA -KeyLength $keyLength -KeyExportPolicy Exportable -CertStoreLocation Cert:\CurrentUser\My -NotAfter (get-date).AddDays($validPeriod) |
            select Thumbprint | 
            ForEach-Object { $_.Thumbprint.ToString() }); 

$cert = "cert:\CurrentUser\My\$certId";

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secstr
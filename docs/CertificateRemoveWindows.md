#Remove Certificate (Windows)

If you are no longer using the PowerBI Custom Visual CLI tools you should remove the certificate from your system.

----------

###Step 1

![](images/windowsRemove1.png)

* Open Settings
* Type "certificates"
* Click `Manage User Certificates`

----------

###Step 2

![](images/windowsRemove2.png)

* Look under `Trusted Root Certificate Authorities` (list on left) 
* Select `Certificates

----------

###Step 3

![](images/windowsRemove3.png)

* double click `localhost` in the list


----------

###Step 4

![](images/windowsRemove4.png)

* Check the details to ensure it's the correct certificate
* Close the window

----------

###Step 5

![](images/windowsRemove5.png)

* Back in the main search window
* Right click `localhost`
* Select `Delete`

----------

###Step 6

**Close all open browsers**

Once this is done your browser will stop trusting this certificate for connections to `localhost`.
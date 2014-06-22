datasync.js
===========

Easy syncronisation between local DB (JS) and server (MySQL, PHP)


datasync.js works like this :

1. define your database on the server
2. fill in datasync-server/config.php to say which tables the (JS) app client can fetch and which tables it can store (write) to
3. run datasync-server/generateClientJS.php to get the JS code to put into your client app (this will be a JayData DB (ie. most supported platforms possible))
4. in your client app you include datasync-client/datasync.js and the client code from the previous step and you now have access to the datasync object, allowing :
        
datasync.js is used like this :
    
    datasync.fetchFromServer(table, where, success, fail);
    datasync.storeToServer(table, where, success, fail);


	

That's it!


See http://krisrandall.github.io/ for more details.


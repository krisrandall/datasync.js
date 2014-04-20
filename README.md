datasyncJS
==========

Easy syncronisation between local DB (JS) and server (MySQL, PHP)


** WIP *** have only just created the repo at this stage, but here is the plan :


datasyncJS works like this :

1. define your database on the server
2. fill in datasync-server/config.php to say which tables the (JS) app client can fetch and which tables it can store (write) to
3. run datasync-server/generateClientJS.php to get the JS code to put into your client app (this will be a JayData DB (ie. most supported platforms possible))
4. in your client app you include datasync-client/datasync.js and the client code from the previous step and you now have access to the datasync object, allowing :
    
    datasync.fetch(table, where, success, fail);
    datasync.store(table, where, success, fail);


That's it!


At least, that is the plan - I have only just created the repo at this stage,
and carried over grandtm, which was a similar, earlier concept,
I've now discovered JayData, though not ever used it yet - but it seems to me
absolutely the way to go for cross-platform client DB storage.


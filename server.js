const express = require('express');
const app = express();

const formidable = require('express-formidable');
app.use(formidable());

const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

var http = require('http').createServer(app);
const bcrypt = require('bcrypt');
const fileSystem = require("fs");

var jwt = require("jsonwebtoken");
var accessTokenSecret = "myAccessTokenSecret1234567890";

app.use("/public", express.static(__dirname+ "/public"));
app.set("view engine", "ejs");

var socketIO = require("socket.io")(http);
var socketID = "";
var users = [];

app.get('/', (req, res) => {
    res.send('Hello World!');
});

var mainURL = "http://localhost:3000";
socketIO.on("connection", function(socket){
    console.log("User connected", socket.id);
    socketID = socket.id;  
});

http.listen(3000, function(){
    console.log("Server started");
    
    mongoClient.connect("mongodb+srv://Ramesh:ramesh123@cluster0-n5l8y.mongodb.net/test?retryWrites=true&w=majority", function(err, client){
        var database = client.db("my_social_network");
        console.log("Databse connected.");

        app.get('/signup', (req, res) => {
            res.render('signup');
        });

        app.post("/signup", function(request, result){
            var name = request.fields.name;
            var username = request.fields.username;
            var email = request.fields.email;
            var password = request.fields.password;
            var gender = request.fields.gender;

            database.collection("users").findOne({
                $or: [{
                    "email": email
                }, {
                    "username": username
                }]
            }, function(error, user){
                if(user == null) {
                    bcrypt.hash(password,10, function(error, hash){
                        database.collection("users").insertOne({
                            "name": name,
                            "username": username,
                            "email": email,
                            "password": hash,
                            "gender": gender,
                            "profileImage": "",
                            "coverPhoto":"",
                            "dob": "",
                            "city": "",
                            "country": "",
                            "aboutMe": "",
                            "fiends": [],
                            "pages": [],
                            "notifications": [],
                            "groups": [],
                            "posts": []
                        }, function(error, data){
                            result.json({
                                "status": "success",
                                "message": "Signed Up successfully. you can login now."
                            });
                        });
                    });
                } else {
                    result.json({
                        "status": "error",
                        "message": "Email or username already exists."
                    });
                }
            })
        });

        app.get("/login", function(request, result){
            result.render("login")
        });

        app.post("/login", function(request, result){
            var email = request.fields.email;
            var password = request.fields.password;

            database.collection("users").findOne({
                "email": email
            }, function (error, user ){
                if(user == null) {
                    result.json({
                        "status": "error",
                        "message": "Email does not exist"
                    });
                } else {
                    bcrypt.compare(password, user.password, function(error, isVerify) {
                        if( isVerify ) {
                            var accessToken = jwt.sign({email: email}, accessTokenSecret);
                            database.collection("users").findOneAndUpdate({
                                "email": email
                            }, {
                                $set: {
                                    "accessToken": accessToken
                                }
                            }, function(error, data){
                                result.json({
                                    "status": "success",
                                    "message": "Login successfully",
                                    "accessToken": accessToken,
                                    "profileImage": user.profileImage
                                })
                            })
                        } else {
                            result.json({
                                "status": "error",
                                "message": "Password is not correct"
                            })
                        }
                    })
                }
            })
        });

        app.get("/updateProfile", function(request, result){
            result.render("updateProfile")
        });

        //get User Details		
		app.post("/getUser", function(request, result){
			var accessToken = request.fields.accessToken;			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "user has been Logged out. Please login again."
					});
				} else{
					result.json({
						"status": "success",
						"message": "Record has been fetched.",
						"data": user
					});
				}
			});
		});
        
        app.get("/logout", function (request, result){
            result.redirect("/login")
        });

        //profile cover photo update
		app.post("/uploadCoverPhoto", function(request, result){
			var accessToken = request.fields.accessToken;
			var coverPhoto = "";
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login  again."
					});
				} else {
					if(request.files.coverPhoto.size > 0 && request.files.coverPhoto.type.includes("image")){
						//previous cover photo remove
						if(user.coverPhoto != ""){
							fileSystem.unlink(user.coverPhoto, function(error){
								
							});
						}
						coverPhoto = "public/images/" + new Date().getTime() + "-" + request.files.coverPhoto.name;
						fileSystem.rename(request.files.coverPhoto.path, coverPhoto, function(error){
							
						});
						database.collection("users").updateOne({
								"accessToken": accessToken
							}, {
								$set: {
									"coverPhoto": coverPhoto
								}
						}, function(error, data){
							result.json({
								"status": "status",
								"message": "Cover photo has been updated.",
								"data": mainURL + "/" + coverPhoto
							});
						});							
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});			
        });
        
        //profile image update
		app.post("/uploadProfileImage", function(request, result){
			var accessToken = request.fields.accessToken;
			var profileImage = "";
			
			database.collection("users").findOne({
				"accessToken": accessToken
			}, function(error, user){
				if(user == null){
					result.json({
						"status": "error",
						"message": "User has been logged out. Please login  again."
					});
				} else {
					if(request.files.profileImage.size > 0 && request.files.profileImage.type.includes("image")){
						//previous cover photo remove
						if(user.profileImage != ""){
							fileSystem.unlink(user.profileImage, function(error){
								
							});
						}
						profileImage = "public/images/" + new Date().getTime() + "-" + request.files.profileImage.name;
						fileSystem.rename(request.files.profileImage.path, profileImage, function(error){
							
						});
						database.collection("users").updateOne({
								"accessToken": accessToken
							}, {
								$set: {
									"profileImage": profileImage
								}
						}, function(error, data){
							result.json({
								"status": "status",
								"message": "Profile image has been updated.",
								"data": mainURL + "/" + profileImage
							});
						});							
					} else {
						result.json({
							"status": "error",
							"message": "Please select valid image."
						});
					}
				}
			});			
        });
        
        //update profile		
        app.post("/updateProfile", function(request, result){
            var accessToken = request.fields.accessToken;
            var name = request.fields.name;
            var dob = request.fields.dob;
            var city = request.fields.city;
            var country = request.fields.country;
            var aboutMe = request.fields.aboutMe;
            
            database.collection("users").findOne({
                "accessToken": accessToken
            }, function(error, user){
                if(user == null){
                    result.json({
                        "status": "error",
                        "message": "User has been logged out. Please login aagain."
                    });
                } else {
                    database.collection("users").updateOne({
                        "accessToken": accessToken
                    },{
                        $set: {
                            "name": name,
                            "dob": dob,
                            "city": city,
                            "country": country,
                            "aboutMe": aboutMe
                        }
                    }, function(error, data){
                        result.json({
                            "status": "status",
                            "message": "Profile has been updated."
                        });
                    });
                }
            });
        });

        app.get('/', (req, res) => {
            res.render("index")
        });
	
    });
});

//Run app, then load http://localhost:port in a browser to see the output.
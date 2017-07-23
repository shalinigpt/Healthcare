var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var express = require('express');
var fs = require('fs');
const crypto = require('crypto');
var sha256 = require('sha256');
var app = express();
app.use(bodyParser.urlencoded({extended : false}));
var Promise = require('bluebird');
var ipfsAPI = require('ipfs-api');
var ipfs = ipfsAPI("127.0.0.1", 5001, {
    protocol: 'http'
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var Web3 = require('web3');
var web3 = new Web3();
web3.setProvider(new Web3.providers.HttpProvider('http://localhost:8545'));
var contractabi=[{"constant":false,"inputs":[{"name":"Id","type":"address"},{"name":"name","type":"string"},{"name":"age","type":"uint256"},{"name":"bloodgroup","type":"string"},{"name":"allergies","type":"string"},{"name":"geneticProblems","type":"string"},{"name":"contactNo","type":"string"},{"name":"addressDetails","type":"string"}],"name":"addPatient","outputs":[{"name":"success","type":"bool"}],"payable":true,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"bytes32"}],"name":"medRecords","outputs":[{"name":"recordPointerAddress","type":"bytes32"},{"name":"labName","type":"string"},{"name":"labAddress","type":"string"},{"name":"illness","type":"string"},{"name":"documentHash","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"Id","type":"address"}],"name":"getMedicalRecord","outputs":[{"name":"","type":"bytes32[]"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"Id","type":"address"},{"name":"addr","type":"bytes32"},{"name":"labName","type":"string"},{"name":"labAddress","type":"string"},{"name":"illness","type":"string"},{"name":"documentHash","type":"string"}],"name":"addMedicalRecords","outputs":[{"name":"_success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"adddress","type":"bytes32"}],"name":"getMedicalRecordDetails","outputs":[{"name":"_labName","type":"string"},{"name":"_labAddress","type":"string"},{"name":"_illness","type":"string"},{"name":"_docHash","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"Id","type":"address"}],"name":"getPatient","outputs":[{"name":"_name","type":"string"},{"name":"_age","type":"uint256"},{"name":"_bloodgroup","type":"string"},{"name":"_allergies","type":"string"},{"name":"_geneticProblems","type":"string"},{"name":"_contactNo","type":"string"},{"name":"_addressDetails","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"patient","outputs":[{"name":"digitalId","type":"address"},{"name":"name","type":"string"},{"name":"age","type":"uint256"},{"name":"bloodGroup","type":"string"},{"name":"contactNo","type":"string"},{"name":"addressDetails","type":"string"},{"name":"allergies","type":"string"},{"name":"geneticProblems","type":"string"}],"payable":false,"type":"function"}];
var sp_address="0x910fb81d2f50863d68de58eeab7c1f284b57ccc5"; 
var subContract=web3.eth.contract(contractabi).at(sp_address);

var uploadToIpfs = function(file) {
    return new Promise(function(resolve, reject) {
        ipfs.util.addFromFs(file.path, function(err, response) {
            if (err) {
                var message = {
                    "status": "IPFS add failed"
                };
                reject(err);
            } else {
                resolve({
                    "hash": response[0].hash,
                    "fileName": file.name
                });
            }
        });
    });
}

app.get('/fetchMedRecords', function (req, res) {
    try{
		var jsonResponse=[];
		var records=[];
		var digitalId=req.body.digitalId;
        var recordArray=subContract.getMedicalRecord.call(digitalId);
		if(recordArray.length() > 0){
			for(var a=0;a<recordArray.length();a++){
				var details=subContract.getMedicalRecordDetails.call(recordArray[a]);
				var record={
					"labName":details[0],
					"labAddress": details[1],
					"illness": details[2],
					"documentHash":details[3]
				};
				records.push(record);
				jsonResponse.push(records);
			}
			res.end(jsonResponse);
		}else{
			jsonResponse.push(records);
			res.end(jsonResponse);
		}
    }
    catch (err){
        var response="Invalid data, Please try Again !";
		res.end(JSON.stringify(response));
    }
})

app.post('/submitMedRecords',function(req,res){
  try{
		var jsonResponse = {};
		var digitalId=req.body.digitalId;
		var labName=req.body.labName;
		var labAddress=req.body.labAddress;
		var illness=req.body.illness;
		/*
			documentHash is generated after uploading the documents in ipfs and we will store this hash in bc against the Medical Record for a patient.
			uploadToIpfs() is written above we can pass the file and it can be stored in ipfs and it will return the hash.
		*/
		//var documentHash=req.body.documentHash; 
		var document = uploadToIpfs("./MedicalReport1.pdf");
		var documentHash = (JSON.parse(document)).hash;
		var address = documentHash;
		web3.personal.unlockAccount(web3.eth.accounts[0],"123456");
		subContract.addMedicalRecords(digitalId,address,labName,labAddress,illness,documentHash,{from: web3.eth.accounts[0],gas:0x186A0});
		var jsonResponse={
			"success": true
		};
		
		res.end(JSON.stringify(jsonResponse));
	}
	catch (err){
		var response="Invalid data, Please try Again !";
		res.end(JSON.stringify(response));
	}
})

app.post('/getPatient',function(req,res){
  try{
		var jsonResponse = {};
		var digitalId=req.body.digitalId;
		var value=subContract.getPatient.call(digitalId);
  if(id=="" || id ==null){
			res.end("Invalid DigitalId");
		}
        var jsonResponse={
                "name":value[0],
                "age":value[1],
				"bloodGroup":value[2],
				"allergies":value[3],
				"geneticProblems":value[4],
				"contactNo":value[5],
				"addressDetails":value[6]
        };
		
        res.end(JSON.stringify(jsonResponse));
    }
    catch (err){
		var response="Invalid data, Please try Again !";
		res.end(JSON.stringify(response));
    }

})


app.post('/addPatient',function(req,res){
  try{
		var jsonResponse={};
		/* 
			Assumption
			Generate DigitalId for patient using the crypto libraries using users private and public keys, hence assuming digitalId is created and 
			fetched in a variable below.
		*/
		
		var digitalId = "208cb994b3bb2a7dc24ef6ea35d90c70";
		var name=req.body.name;
		var age=parseInt(req.body.age);
		var bloodGroup=req.body.bloodGroup;
		var contactNo=req.body.contactNo;
		var addressDetails=req.body.addressDetails;
		var allergies=req.body.allergies;
		var geneticProblems=req.body.geneticProblems;
		web3.personal.unlockAccount(web3.eth.accounts[0],"123456");
		subContract.addPatient(digitalId,name,age,bloodGroup,allergies,geneticProblems,contactNo,addressDetails,{from: web3.eth.accounts[0],gas:0x186A0});
		var jsonResponse={
			"success": true
		};
		res.end(JSON.stringify(jsonResponse));
	}
	catch (err){
	  var response="Invalid data, Please try Again !";
	  res.end(JSON.stringify(response));
	}
})







var server = app.listen(8080, function () {
  console.log("Patient360 Application listening at http://%s:%s", 8004);
})

var request = require('request-promise');


let keys = [ 
"MSH-396975",
"MSH-396644",
"MSH-395583",
"MSH-395243",
"MSH-394363",
"MSH-388095",
"MSH-380002",
"MSH-379807",
"MSH-379427",
"MSH-376888",
"MSH-375295",
"MSH-374771",
"MSH-374146",
"MSH-373946",
"MSH-366201",
"MSH-365214",
"MSH-327702",
"MSH-280523",
"MSH-250055",
	
]



function getAllIssues() {
	keys.forEach((key)=>{

			var options = {
			   method: 'GET',
			   url: `https://msh-success.atlassian.net/rest/api/3/issue/${key}`,
			   headers: {
			      'Accept': 'application/json',
			      'authorization': `Basic dGJlaG1AYXRsYXNzaWFuLmNvbTpVRmZEWEtwUjZqTjNCSGYxRWZpSEFCNzU=`
			   }
			};

			request(options)
			.then((data)=>{
				console.log(key)
			})
			.catch((err)=>{
				console.log(err);
			});

	})
}

getAllIssues();

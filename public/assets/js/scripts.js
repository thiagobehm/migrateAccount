let checkboxes = document.querySelectorAll('input[name=userSelect]');
let selectAll = document.querySelector('#selectAll');

//clean the storate value left from a previous session
function cleanStorage(argument) {
	if (localStorage) {
		localStorage.clear();
	}
}

//add listener to all selectbox
if (selectAll) {
	selectAll.addEventListener('change', () =>{
		checkboxes.forEach((item, index) =>{
			if(!item.checked) { //if it's not checked yet, then mark as selected and stores the user information.
				item.checked = true;

		    	let user  = {
		    		'email': item.getAttribute('data-email'),
		    		'username': item.getAttribute('data-username')
		    	}
		        localStorage.setItem(`user${index}`, JSON.stringify(user));
		    } else {
		    	item.checked = false;
		        localStorage.removeItem(`user${index}`);
		    }
		});
	});
}

if (checkboxes) {
	//add listening events to all checkboxes in order to store the marked users
	checkboxes.forEach((item, index)=> {
		item.addEventListener('change', function() {
			
		    if(this.checked) {
		    	let user  = {
		    		'email': item.getAttribute('data-email'),
		    		'username': item.getAttribute('data-username')
		    	}

		        localStorage.setItem(`user${index}`, JSON.stringify(user));
		    } else {
		        localStorage.removeItem(`user${index}`);
		    }
		});
	})
}

function getUsersFromMemory() {
	let table = document.querySelector('tbody');
	console
	if (localStorage) {
		let user;

		for(let i = 0; i < localStorage.length; i++ ) {
			let tr = document.createElement('tr');
			let td = document.createElement('td');
			let td2 = document.createElement('td');
			let td3 = document.createElement('td');

			user = JSON.parse(localStorage.getItem(localStorage.key(i)));
			
			table.appendChild(tr);
			td.innerHTML = user.email;
			tr.appendChild(td);
			td2.innerHTML = user.username;
			tr.appendChild(td2);
			td3.className = 'status';
			tr.appendChild(td3);
		}
	}
}

function migrateUsers(action) {
	let user;
	let status = document.querySelectorAll('.status');
	let content;
	let endpoint;

	if (action === 'migrate') {
		endpoint = '/migrate';
	} else if(action === 'activate') {
		endpoint = '/activate';
	} else {
		endpoint = '/deactivate'
	}
	
	if(localStorage) {
		for(let i = 0; i < localStorage.length; i++) {
			user = JSON.parse(localStorage.getItem(localStorage.key(i)));

			$.ajax(endpoint, {
				type : 'POST',
				data: {'username' : user['username']},
				async: true,
				success: function(data) {
					console.log(data);
					if(data.statusCode === 404) {
						content = `${data.statusCode} - ${data.response.body.errors[0].errorMessage}`;
					} else if (data.statusCode === 500){		
						content = `${data.error.message}`;				
					} else {
						content = 'User migrated Successfully!';
					}

					status[i].innerHTML = content;					
				},
				error: function(err) {
					console.log('failure:' +err);
				}
			});
		}
	}
}

//sets the active class for the main menu
(function() {
   let menuItems = document.querySelectorAll('li[role=presentation]');
   let location = window.location.pathname;

   switch(location) {
   	case '/getUsers':
   		menuItems[0].className = 'active';
   		break;
   	case '/convert':
   		menuItems[1].className = 'active';
   		break;
   }
   console.log(menuItems);
   
})(this);
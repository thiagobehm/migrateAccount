let checkboxes = document.querySelectorAll("input[type=checkbox]");

//clean the storate value left from a previous session
if (localStorage) {
	localStorage.clear();
}

//add listening events to all checkboxes in order to store the marked users
checkboxes.forEach((item, index)=> {
	item.addEventListener('change', function() {
		
	    if(this.checked) {
	    	let user  = {
	    		'email': item.getAttribute("data-email"),
	    		'username': item.getAttribute("data-username")
	    	}

	        localStorage.setItem(`user${index}`, JSON.stringify(user));
	    } else {
	        localStorage.removeItem(`user${index}`);
	    }
	});
})


